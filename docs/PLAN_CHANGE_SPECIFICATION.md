# プラン変更機能 仕様書

## 目次
1. [概要](#概要)
2. [プラン変更のパターン](#プラン変更のパターン)
3. [請求・適用タイミング](#請求適用タイミング)
4. [データベース設計](#データベース設計)
5. [API設計](#api設計)
6. [自動請求書送信との連携](#自動請求書送信との連携)
7. [実装手順](#実装手順)

---

## 概要

### 背景
- 顧客が直接申し込む画面はなく、システム管理者が電話・メール等で連絡を受けて手動でプラン変更を実行
- 請求書払いが基本（入金確認に時間がかかる可能性あり）
- 月払い・年払いの両方に対応

### 基本方針
- **グレードアップ**: 即時適用 + 日割り請求
- **グレードダウン**: 次回請求日から適用（既払い分を無駄にしない）

---

## プラン変更のパターン

### 1. グレードアップ（料金増加）

#### 月払い契約
```
変更申込日: 12月15日（システム管理者が手動で変更）
プラン適用: 即時（12月15日から新プラン利用可能）
請求タイミング: 翌月請求に日割り分を加算

例:
  旧プラン: スタンダード（45,000円）
  新プラン: ビジネス（70,000円）
  変更日: 12月15日（16日から新プラン）

  1月1日の請求内容:
  ┌─────────────────────────────────────┐
  │ ビジネスプラン月額料金  ¥70,000   │
  │ プラン変更差額（12/16-31） ¥12,903  │
  │                      （16日分）    │
  ├─────────────────────────────────────┤
  │ 小計                  ¥82,903     │
  │ 消費税（10%）          ¥8,290      │
  │ 合計                  ¥91,193     │
  └─────────────────────────────────────┘

計算式:
  日割り差額 = (新プラン - 旧プラン) × 残り日数 / その月の日数
           = (70,000 - 45,000) × 16 / 31
           = 12,903円
```

**メリット**:
- ✅ 顧客はすぐに新機能を使える（満足度UP）
- ✅ 差額は翌月請求に合算（シンプル）
- ✅ 別途入金確認を待つ必要なし
- ✅ 請求書は1枚で済む

#### 年払い契約
```
変更申込日: 6月15日（システム管理者が手動で変更）
差額請求書発行: 即時（残り期間の日割り差額）
  差額: (新プラン - 旧プラン) × 残り日数 / 365日
  例: (500,000 - 300,000) × 200日 / 365日 = 約109,589円

支払期限: 15日後（6月30日）
プラン適用: 入金確認後（7月1日想定）
  ※ 入金が遅れた場合は入金確認後に適用

翌年の請求: 新プラン500,000円（通常通り）
```

**理由**: 年払いは金額が大きいため、入金確認後の適用が安全

---

### 2. グレードダウン（料金減少）

#### 月払い・年払い共通
```
変更申込日: 任意（システム管理者が手動で変更）
プラン適用: 次回請求日から
請求: 次回から新プラン料金

例（月払い）:
  12月15日に変更申込
  → 12月分は旧プラン50,000円のまま（既払い）
  → 1月1日から新プラン30,000円に変更＆請求

例（年払い）:
  6月15日に変更申込
  → 残り6.5ヶ月は旧プラン継続（既払い）
  → 翌年6月15日から新プラン300,000円に変更＆請求
```

**メリット**:
- ✅ 既払い分を無駄にしない
- ✅ 返金処理不要
- ✅ 非常にシンプル

---

## 請求・適用タイミング

| ケース | プラン適用タイミング | 請求タイミング | 備考 |
|--------|---------------------|---------------|------|
| **グレードアップ（月払い）** | 即時 | 翌月請求に日割り加算 | 顧客満足度重視 |
| **グレードアップ（年払い）** | 入金確認後（15日後想定） | 即時（差額を日割り） | 高額のため入金確認必須 |
| **グレードダウン（月払い）** | 次回請求日 | 次回請求日（新料金） | 既払い分を無駄にしない |
| **グレードダウン（年払い）** | 次回請求日 | 次回請求日（新料金） | 既払い分を無駄にしない |

---

## データベース設計

### contractsテーブルの拡張

プラン変更時の日割り差額を記録するカラムを追加：

```sql
-- マイグレーションファイル: 20251229000002_add_prorated_charge_to_contracts.sql

ALTER TABLE contracts
ADD COLUMN pending_prorated_charge DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN pending_prorated_description TEXT,
ADD COLUMN plan_change_date TIMESTAMP,
ADD COLUMN plan_change_type TEXT CHECK (plan_change_type IN ('upgrade', 'downgrade'));

COMMENT ON COLUMN contracts.pending_prorated_charge IS '次回請求に加算する日割り差額（グレードアップ時のみ）';
COMMENT ON COLUMN contracts.pending_prorated_description IS '日割り差額の説明（請求書明細に表示）';
COMMENT ON COLUMN contracts.plan_change_date IS 'プラン変更実行日時';
COMMENT ON COLUMN contracts.plan_change_type IS 'プラン変更の種類（upgrade/downgrade）';
```

### TypeScript型定義の更新

```typescript
// docs/DATABASE_SCHEMA.md に追記

interface Contract {
  // 既存フィールド...

  // プラン変更関連（2025-12-29追加）
  pending_prorated_charge: number;      // 次回請求に加算する日割り差額
  pending_prorated_description: string | null; // 日割り差額の説明
  plan_change_date: Date | null;        // プラン変更実行日時
  plan_change_type: 'upgrade' | 'downgrade' | null; // プラン変更の種類
}
```

---

## API設計

### 1. 契約変更画面の作成

#### ページ: `/admin/contracts/[id]/edit`

**UI要素**:
- プラン選択（スタート/スタンダード/ビジネス/プロ）
- 機能パック選択
- ユーザー上限数
- グレードアップ/ダウンの判定表示
- 料金変更の説明表示

#### API: `PATCH /api/admin/contracts/[id]`（既存）

**リクエストボディ**:
```typescript
{
  plan: 'business',
  user_limit: 50,
  base_monthly_fee: 70000,
  package_monthly_fee: 32000,
  total_monthly_fee: 102000,
  // その他フィールド...
}
```

**処理フロー**:

```typescript
// 1. グレードアップ/ダウンの判定
const isUpgrade = newTotalMonthlyFee > oldTotalMonthlyFee;
const isDowngrade = newTotalMonthlyFee < oldTotalMonthlyFee;

if (contract.contract_type === 'monthly') {
  if (isUpgrade) {
    // 月払いグレードアップ: 日割り差額を計算
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const remainingDays = lastDay.getDate() - today.getDate() + 1;
    const daysInMonth = lastDay.getDate();

    const proratedCharge = (newTotalMonthlyFee - oldTotalMonthlyFee) * remainingDays / daysInMonth;

    await supabase.from('contracts').update({
      plan: newPlan,
      total_monthly_fee: newTotalMonthlyFee,
      pending_prorated_charge: proratedCharge,
      pending_prorated_description: `プラン変更差額（${today.getMonth()+1}月${today.getDate()+1}日〜末日、${remainingDays}日分）`,
      plan_change_date: new Date(),
      plan_change_type: 'upgrade',
    }).eq('id', contractId);

    // プラン適用は即時（契約テーブルの更新で完了）

  } else if (isDowngrade) {
    // 月払いグレードダウン: 次回請求から適用
    await supabase.from('contracts').update({
      plan: newPlan,
      total_monthly_fee: newTotalMonthlyFee,
      plan_change_date: new Date(),
      plan_change_type: 'downgrade',
      // pending_prorated_chargeは設定しない
    }).eq('id', contractId);
  }

} else if (contract.contract_type === 'annual') {
  if (isUpgrade) {
    // 年払いグレードアップ: 差額請求書を即時発行
    const today = new Date();
    const contractStartDate = new Date(contract.start_date);
    const nextBillingDate = new Date(contractStartDate);
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

    const totalDays = 365;
    const remainingDays = Math.ceil((nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const proratedCharge = (newTotalMonthlyFee - oldTotalMonthlyFee) * 12 * remainingDays / totalDays;

    // 請求書を即時発行
    const invoice = await createInvoice({
      organization_id: contract.organization_id,
      contract_id: contract.id,
      amount: proratedCharge,
      tax_amount: Math.round(proratedCharge * 0.1),
      total_amount: Math.round(proratedCharge * 1.1),
      description: `プラン変更差額（年間契約、残り${remainingDays}日分）`,
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15日後
      status: 'pending',
    });

    // PDF生成＆メール送信
    await sendInvoiceEmail(invoice);

    // 契約情報を更新（入金確認後に適用予定）
    await supabase.from('contracts').update({
      plan_change_date: new Date(),
      plan_change_type: 'upgrade',
      // プラン適用は入金確認後に別途実行
    }).eq('id', contractId);

  } else if (isDowngrade) {
    // 年払いグレードダウン: 次回請求から適用
    await supabase.from('contracts').update({
      plan: newPlan,
      total_monthly_fee: newTotalMonthlyFee,
      plan_change_date: new Date(),
      plan_change_type: 'downgrade',
    }).eq('id', contractId);
  }
}
```

---

## 自動請求書送信との連携

### cronジョブ修正: `/api/cron/create-monthly-invoices`

#### 1. 料金計算ロジックの修正

`lib/billing/calculate-fee.ts` の `calculateMonthlyFee()` を修正：

```typescript
export function calculateMonthlyFee(contract: Contract): MonthlyFeeCalculation {
  const items: MonthlyFeeCalculation['items'] = [];
  let subtotal = 0;

  // 1. 基本プラン料金
  if (contract.monthly_base_fee && contract.monthly_base_fee > 0) {
    items.push({
      description: `${getPlanName(contract.plan)}プラン月額料金`,
      amount: contract.monthly_base_fee,
      type: 'base_fee'
    });
    subtotal += contract.monthly_base_fee;
  }

  // 2. パッケージ料金
  const packageFee = getPackageFee(contract);
  if (packageFee > 0) {
    items.push({
      description: getPackageName(contract),
      amount: packageFee,
      type: 'package'
    });
    subtotal += packageFee;
  }

  // 3. 【新規】日割り差額（グレードアップ時のみ）
  if (contract.pending_prorated_charge && contract.pending_prorated_charge > 0) {
    items.push({
      description: contract.pending_prorated_description || 'プラン変更差額',
      amount: contract.pending_prorated_charge,
      type: 'prorated_charge'
    });
    subtotal += contract.pending_prorated_charge;
  }

  // 4. 消費税計算
  const taxAmount = Math.round(subtotal * 0.1);
  const total = subtotal + taxAmount;

  return {
    items,
    subtotal,
    discount: 0,
    total,
    isFirstInvoice: false,
  };
}
```

#### 2. 請求書発行後の日割り差額クリア

`app/api/cron/create-monthly-invoices/route.ts` で請求書保存後に実行：

```typescript
// 請求書保存成功後
if (savedInvoice) {
  // 日割り差額をクリア（次回請求に含めない）
  if (contract.pending_prorated_charge && contract.pending_prorated_charge > 0) {
    await supabase
      .from('contracts')
      .update({
        pending_prorated_charge: 0,
        pending_prorated_description: null,
      })
      .eq('id', contract.id);

    logger.info('Cleared prorated charge after invoice creation', {
      contractId: contract.id,
      proratedCharge: contract.pending_prorated_charge,
    });
  }
}
```

#### 3. 年払い契約の対応

cronジョブで月払い・年払いを区別：

```typescript
// 今日が請求日の有効な契約を取得
const { data: contracts } = await supabase
  .from('contracts')
  .select(`
    *,
    organizations!inner (id, name, payment_method)
  `)
  .eq('status', 'active');

// 請求対象をフィルタリング
const contractsToBill = contracts.filter(contract => {
  if (contract.contract_type === 'monthly') {
    // 月払い: billing_dayが今日
    return contract.billing_day === today.getDate();
  } else if (contract.contract_type === 'annual') {
    // 年払い: 前回請求から1年後
    // TODO: 前回請求日を invoices テーブルから取得して判定
    return isAnnualBillingDue(contract);
  }
  return false;
});
```

年払い判定関数:

```typescript
async function isAnnualBillingDue(contract: Contract): Promise<boolean> {
  // 最後の請求書を取得
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_date')
    .eq('contract_id', contract.id)
    .order('invoice_date', { ascending: false })
    .limit(1)
    .single();

  if (!lastInvoice) {
    // 請求書が存在しない場合は契約開始日から1年後
    const contractStartDate = new Date(contract.start_date);
    const oneYearLater = new Date(contractStartDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const today = new Date();
    return today >= oneYearLater;
  }

  // 最後の請求から1年後か判定
  const lastInvoiceDate = new Date(lastInvoice.invoice_date);
  const oneYearLater = new Date(lastInvoiceDate);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  const today = new Date();
  return today >= oneYearLater;
}
```

---

## 実装手順

### Phase 1: データベース準備（1日）

- [ ] マイグレーションファイル作成: `20251229000002_add_prorated_charge_to_contracts.sql`
- [ ] テスト環境・本番環境でマイグレーション実行
- [ ] `DATABASE_SCHEMA.md` 更新
- [ ] `MIGRATIONS.md` 更新

### Phase 2: 料金計算ロジック修正（1日）

- [ ] `lib/billing/calculate-fee.ts` に日割り差額の計算ロジック追加
- [ ] 単体テスト作成

### Phase 3: プラン変更API修正（2日）

- [ ] `PATCH /api/admin/contracts/[id]` にグレードアップ/ダウン判定追加
- [ ] 月払いグレードアップ: 日割り差額計算＆保存
- [ ] 年払いグレードアップ: 差額請求書即時発行
- [ ] グレードダウン: 契約情報更新のみ
- [ ] エラーハンドリング

### Phase 4: 契約変更画面作成（2日）

- [ ] `/admin/contracts/[id]/edit` ページ作成
- [ ] プラン選択UI
- [ ] 料金変更プレビュー表示
- [ ] グレードアップ/ダウンの説明表示
- [ ] フォーム送信処理

### Phase 5: cronジョブ修正（2日）

- [ ] `calculateMonthlyFee()` に日割り差額加算ロジック追加
- [ ] 請求書発行後の日割り差額クリア処理追加
- [ ] 年払い契約の判定ロジック追加
- [ ] `isAnnualBillingDue()` 関数実装

### Phase 6: テスト（2日）

- [ ] 月払いグレードアップのテスト
- [ ] 月払いグレードダウンのテスト
- [ ] 年払いグレードアップのテスト
- [ ] 年払いグレードダウンのテスト
- [ ] 自動請求書送信のテスト（日割り差額含む）

### Phase 7: ドキュメント更新（1日）

- [ ] `SUPER_ADMIN_GUIDE.md` にプラン変更手順を追記
- [ ] `USER_MANUAL_ADMIN.md` 更新（顧客向けに説明）

---

## 注意事項

### 月内の複数回変更
- `pending_prorated_charge` は上書きされるため、月内に複数回プラン変更すると最後の変更のみ反映
- 通常は問題なし（月内に複数回変更することはほぼない）
- 必要であれば `plan_change_history` テーブルを作成して履歴管理

### 入金確認フロー（年払いグレードアップ）
- 差額請求書の入金確認は手動で実行
- 入金確認後に再度 `PATCH /api/admin/contracts/[id]` を実行してプラン適用

### 自動テスト
- 日割り計算のエッジケース（月末、閏年など）をカバー
- cronジョブのテストは手動実行で確認

---

## 参考資料

- [STRIPE_BILLING_IMPLEMENTATION_PLAN.md](./STRIPE_BILLING_IMPLEMENTATION_PLAN.md) - Stripe統合時の参考
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベーススキーマ
- [MIGRATIONS.md](./MIGRATIONS.md) - マイグレーション履歴
