# Stripe Billing A方式（Invoice Item方式）実装ガイド

## 📌 概要

このシステムは**A方式（Invoice Item方式）**でStripe Billingを実装しています。

### A方式の特徴

- ✅ **個別見積もり対応**: 契約ごとに料金をカスタマイズ可能
- ✅ **柔軟な料金体系**: 人数、パッケージ、初期費用、割引を自由に組み合わせ
- ✅ **請求書払いメイン**: 銀行振込での入金確認フロー
- ✅ **完全自動化**: cron jobで毎月自動的に請求書を生成
- ✅ **カード決済も可能**: 自動決済も対応

### B方式（Subscription方式）との違い

| 項目 | A方式（Invoice Item） | B方式（Subscription） |
|------|---------------------|---------------------|
| 固定プラン | 不要 | 必須（Price ID） |
| 個別料金 | ✅ 完全対応 | △ 複雑 |
| 自動継続 | cron jobで実装 | Stripeが自動 |
| 請求書払い | ✅ 最適 | △ 可能 |
| カード決済 | ✅ 可能 | ✅ 最適 |

---

## 🏗️ アーキテクチャ

### 料金体系

```typescript
月額料金 = 基本プラン料金（人数ベース） + 機能パッケージ料金 + 初期費用（初回のみ） - 割引（初回のみ）
```

#### 基本プラン料金（人数ベース）- いずれか1つ
| プラン | 人数 | 月額料金 |
|--------|------|----------|
| スタート | ~10名 | ¥18,000 |
| スタンダード | 11~30名 | ¥45,000 |
| ビジネス | 31~50名 | ¥70,000 |
| プロ | 51~100名 | ¥120,000 |
| エンタープライズ | 101名~ | 要相談 |

契約で個別設定可能（`contracts.monthly_base_fee`）

#### 機能パッケージ料金 - いずれか1つ
- **現場資産パックのみ**: ¥18,000/月
- **現場DXパックのみ**: ¥22,000/月
- **フル機能統合パック**: ¥32,000/月（両方含む）

#### 初期費用（初回のみ）
- 契約ごとに個別設定（`contracts.initial_setup_fee`）

#### 割引（初回のみ）
- 契約ごとに個別設定（`contracts.initial_discount`）

---

## 🔄 処理フロー

### 1. 契約作成時

```
Super Admin: 契約作成
  ↓
lib/billing/setup-contract-billing.ts
  ↓
Stripe Customer作成
  ↓
contracts.stripe_customer_id を更新
  ↓
完了（Subscriptionは作成しない）
```

**実装ファイル**:
- `lib/billing/setup-contract-billing.ts`

---

### 2. 毎月の請求書自動生成（完全自動）

```
毎日 1:00 AM（Vercel Cron）
  ↓
app/api/cron/create-monthly-invoices/route.ts
  ↓
今日が請求日（billing_day）の契約を取得
  ↓
各契約に対して:
  ├─ 料金計算（lib/billing/calculate-fee.ts）
  ├─ Stripe Invoice Items作成
  ├─ Stripe Invoice作成
  └─ 支払い方法で分岐:
      ├─ カード決済: stripe.invoices.pay()
      └─ 請求書払い: PDF生成 → メール送信
  ↓
完了（人間の作業なし）
```

**実装ファイル**:
- `app/api/cron/create-monthly-invoices/route.ts`
- `lib/billing/calculate-fee.ts`
- `vercel.json` (cron設定)

---

### 3. 入金確認（請求書払いの場合）

```
顧客: 銀行振込
  ↓
Super Admin: 入金確認
  ↓
管理画面で入金記録を登録
  ↓
invoices.status = 'paid'
payment_records テーブルに記録
  ↓
完了
```

**実装予定**:
- Super Admin管理画面（Phase 5）

---

## 📁 実装ファイル一覧

### コアロジック

| ファイル | 役割 |
|---------|------|
| `lib/billing/calculate-fee.ts` | 料金計算ロジック |
| `lib/billing/setup-contract-billing.ts` | 契約作成時のStripe設定 |

### API エンドポイント

| エンドポイント | 説明 | 実行タイミング |
|--------------|------|--------------|
| `/api/cron/create-monthly-invoices` | 毎月の請求書自動生成 | 毎日1:00 AM |
| `/api/cron/send-invoice-reminders` | 請求書リマインダー送信 | 毎日9:00 AM |
| `/api/webhooks/stripe` | Stripe Webhook受信 | Stripeからの通知時 |

### 設定ファイル

| ファイル | 内容 |
|---------|------|
| `vercel.json` | Vercel Cron設定 |
| `.env.local` | Stripe API Keys、CRON_SECRET |

---

## 🔧 セットアップ手順

### 1. Stripe API Keys設定

```bash
# .env.local
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_xxxxx
CRON_SECRET=development-cron-secret-change-in-production
```

### 2. Webhook設定（Stripe Dashboard）

**Webhook URL**:
```
https://your-domain.com/api/webhooks/stripe
```

**監視するイベント**:
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.finalized`

### 3. Vercel Cron設定

`vercel.json`に設定済み（自動実行）:
```json
{
  "crons": [
    {
      "path": "/api/cron/create-monthly-invoices",
      "schedule": "0 1 * * *"
    }
  ]
}
```

---

## 🧪 テスト方法

### ローカル開発環境でのテスト

#### 1. 料金計算のテスト

```typescript
import { calculateMonthlyFee } from '@/lib/billing/calculate-fee';

const testContract = {
  id: 'test-contract-id',
  organization_id: 'test-org-id',
  plan: 'standard',
  user_count: 15,
  has_asset_package: true,
  has_dx_efficiency_package: true,
  has_both_packages: false,
  initial_setup_fee: 50000,
  initial_discount: 10,
  monthly_base_fee: 7500,
  stripe_customer_id: 'cus_test_xxxxx',
  start_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

const result = calculateMonthlyFee(testContract);
console.log(result);

// 期待される結果:
// {
//   items: [
//     { description: '現場資産パック', amount: 18000, type: 'package' },
//     { description: '現場DX業務効率化パック', amount: 22000, type: 'package' },
//     { description: '基本料金（15名）', amount: 7500, type: 'base_fee' },
//     { description: '初期導入費用（一回限り）', amount: 50000, type: 'initial_fee' },
//     { description: '初回割引（10%）', amount: -9750, type: 'discount' }
//   ],
//   subtotal: 97500,
//   discount: 9750,
//   total: 87750,
//   isFirstInvoice: true
// }
```

#### 2. cron jobのテスト

```bash
# ローカルでcron jobを手動実行
curl -H "Authorization: Bearer development-cron-secret-change-in-production" \
  http://localhost:3000/api/cron/create-monthly-invoices
```

---

## 📊 料金計算例

### ケース1: スタンダードプラン + フル機能統合パック（初回）

**契約内容**:
- ユーザー数: 20名
- 基本プラン: スタンダード（11~30名）
- 機能パッケージ: フル機能統合パック
- 初期費用: ¥50,000
- 初回割引: 10%

**計算**:
```
基本プラン（スタンダード）: ¥45,000
フル機能統合パック:        ¥32,000
初期費用:                ¥50,000
─────────────────────────
小計:                    ¥127,000
初回割引（10%）:          -¥12,700
─────────────────────────
合計:                    ¥114,300
```

### ケース2: スタンダードプラン + 現場資産パック（初回）

**契約内容**:
- ユーザー数: 15名
- 基本プラン: スタンダード（11~30名）
- 機能パッケージ: 現場資産パックのみ
- 初期費用: ¥30,000
- 初回割引: なし

**計算**:
```
基本プラン（スタンダード）: ¥45,000
現場資産パック:           ¥18,000
初期費用:                ¥30,000
─────────────────────────
合計:                    ¥93,000
```

### ケース3: スタート+ フル機能統合パック（2ヶ月目以降）

**契約内容**:
- ユーザー数: 8名
- 基本プラン: スタート（~10名）
- 機能パッケージ: フル機能統合パック

**計算**:
```
基本プラン（スタート）: ¥18,000
フル機能統合パック:    ¥32,000
─────────────────────────
合計:                  ¥50,000
```

---

## 🚨 トラブルシューティング

### 請求書が自動生成されない

**確認項目**:
1. `contracts.billing_day`が今日の日付と一致しているか
2. `contracts.status`が`'active'`になっているか
3. `contracts.stripe_customer_id`が設定されているか
4. Vercel Cronが正しく設定されているか
5. `CRON_SECRET`が正しく設定されているか

**ログ確認**:
```bash
# Vercel Dashboard → Functions → Logs
# または
# Supabase Dashboard → Logs
```

### カード決済が失敗する

**確認項目**:
1. 顧客がカード情報を登録しているか
2. `organizations.payment_method`が`'card'`になっているか
3. Stripe Dashboardでカード情報を確認

---

## 📝 今後の拡張

### Phase 5: Super Admin管理画面

- [ ] 請求書一覧表示
- [ ] 入金記録の手動登録
- [ ] 請求書PDFダウンロード
- [ ] 延滞管理

### Phase 6: 顧客向けUI

- [ ] カード情報登録画面
- [ ] 請求履歴閲覧
- [ ] 領収書ダウンロード

---

## 🔗 関連ドキュメント

- [Stripe Billing実装計画](./STRIPE_BILLING_IMPLEMENTATION_PLAN.md)
- [データベーススキーマ](./DATABASE_SCHEMA.md)
- [マイグレーション履歴](./MIGRATIONS.md)
