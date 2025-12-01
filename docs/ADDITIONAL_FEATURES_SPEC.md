# 追加機能仕様書（将来実装予定）

## 概要

本ドキュメントは、顧客数の増加に応じて追加実装を検討する機能の仕様をまとめたものです。
初期段階では直接契約・請求書払いで運用し、スケール時に自動化を進める方針です。

---

## 1. Stripe決済機能（自動課金システム）

### 1.1 決済関連機能

#### Stripe決済ゲートウェイ統合
```typescript
// 実装イメージ
interface StripeIntegration {
  // Stripe API初期化
  stripe: Stripe;

  // Webhook処理
  handleWebhook(event: Stripe.Event): Promise<void>;

  // 顧客作成
  createCustomer(organizationId: string): Promise<Stripe.Customer>;
}
```

**主要機能:**
- Stripe SDK統合
- 決済フロー実装
- Webhook連携（決済成功/失敗通知）
- PCI DSS準拠の実装

#### クレジットカード登録・管理画面
```
【画面構成】
┌─────────────────────────────────┐
│ 支払い方法の管理                │
├─────────────────────────────────┤
│ 登録済みカード                  │
│ ・VISA ****1234 (デフォルト)   │
│ ・Mastercard ****5678           │
│                                 │
│ [+ 新しいカードを追加]          │
└─────────────────────────────────┘
```

**機能要件:**
- カード情報の安全な保存（Stripeトークン化）
- 複数カード管理
- デフォルトカード設定
- 3Dセキュア対応

#### 支払い方法変更機能
- クレジットカード変更
- 請求書払いへの切り替え（エンタープライズ向け）
- 支払い通貨設定（JPY固定）

#### 自動課金・サブスクリプション管理
```typescript
interface SubscriptionManagement {
  // サブスクリプション作成
  createSubscription(
    customerId: string,
    priceId: string
  ): Promise<Stripe.Subscription>;

  // プラン変更
  updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription>;

  // 解約処理
  cancelSubscription(
    subscriptionId: string,
    immediately: boolean
  ): Promise<void>;
}
```

**主要機能:**
- 月次自動課金
- 日割り計算
- 請求サイクル管理
- 支払い失敗時の猶予期間設定

#### 決済失敗時のリトライ機能
```typescript
interface PaymentRetry {
  retrySchedule: [
    { attempt: 1, days: 3 },  // 3日後
    { attempt: 2, days: 5 },  // 5日後
    { attempt: 3, days: 7 }   // 7日後
  ];

  maxRetries: 3;

  // 失敗時の処理
  onFinalFailure(): void {
    // アカウント停止処理
    // 管理者への通知
  }
}
```

#### 領収書自動発行機能
- PDF形式での領収書生成
- メール自動送信
- 領収書履歴管理
- 再発行機能

---

### 1.2 プラン管理機能

#### 料金プラン選択画面
```
【画面デザイン】
┌─────────────────────────────────┐
│ プランを選択                    │
├─────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐   │
│ │ ベーシック │ │プレミアム │   │
│ │   ¥XX,XXX  │ │  ¥XX,XXX  │   │
│ │    /月     │ │    /月    │   │
│ │ ・20ユーザー│ │・50ユーザー│   │
│ │ ・500道具  │ │ ・無制限   │   │
│ │ [選択]     │ │ [選択]     │   │
│ └───────────┘ └───────────┘   │
└─────────────────────────────────┘
```

#### プランアップグレード/ダウングレード機能
```typescript
interface PlanChange {
  // アップグレード（即時適用）
  upgrade(newPlan: string): Promise<void>;

  // ダウングレード（次回請求サイクルで適用）
  downgrade(newPlan: string): Promise<void>;

  // 差額計算
  calculateProration(): number;
}
```

#### 無料トライアル自動終了処理
```typescript
interface TrialManagement {
  trialDays: 14;

  // トライアル終了前通知
  sendTrialEndingNotification(daysRemaining: number): void;

  // 自動課金開始
  startBilling(): Promise<void>;

  // カード未登録の場合のアカウント停止
  suspendAccount(): void;
}
```

#### 使用量ベースの従量課金計算
```typescript
interface UsageBasedBilling {
  // 追加ユーザー課金
  additionalUserPrice: number; // ¥1,000/ユーザー

  // 追加ストレージ課金
  additionalStoragePrice: number; // ¥500/GB

  // 月末集計
  calculateMonthlyUsage(): {
    basePrice: number;
    additionalUsers: number;
    additionalStorage: number;
    total: number;
  };
}
```

---

### 1.3 セキュリティ関連

#### PCI DSS準拠のための実装
```typescript
interface PCIDSSCompliance {
  // カード情報の非保持
  useStripeTokenization: true;

  // HTTPSの強制
  forceSSL: true;

  // セキュリティヘッダー
  securityHeaders: {
    'Content-Security-Policy': string;
    'X-Frame-Options': 'DENY';
    'X-Content-Type-Options': 'nosniff';
  };

  // アクセスログ
  logAllPaymentActivities: true;
}
```

#### カード情報の暗号化処理
- Stripe Elements使用（カード情報を直接扱わない）
- トークン化されたデータのみ保存
- 暗号化された通信（TLS 1.2以上）

---

## 2. 実装優先度とタイムライン

### Phase 1: 基本的なStripe統合（顧客数30社到達時）
- Stripe Customer作成
- 基本的なサブスクリプション機能
- シンプルな決済フロー
- 実装期間: 2-3週間

### Phase 2: 高度な課金機能（顧客数50社到達時）
- プラン変更機能
- 従量課金対応
- 決済リトライ機能
- 実装期間: 3-4週間

### Phase 3: 完全自動化（顧客数100社到達時）
- セルフサービス完全対応
- 高度な請求管理
- 分析・レポート機能
- 実装期間: 4-6週間

---

## 3. 導入判断基準

### Stripe決済導入を検討すべきタイミング
1. **顧客数が30社を超えた時**
   - 手動請求の管理負荷が増大
   - 入金確認の遅延が発生

2. **月次売上が300万円を超えた時**
   - Stripe手数料を吸収できる規模
   - 自動化によるコスト削減効果が大きい

3. **新規顧客の獲得ペースが月5社を超えた時**
   - オンボーディングの自動化が必要
   - セルフサービス化による効率化

---

## 4. ハイブリッドモデルの検討

### 並行運用案
```
【エンタープライズ顧客】
- 直接契約・請求書払い継続
- 年間契約
- カスタム価格

【SMB顧客】
- Stripe決済（クレジットカード）
- 月額契約
- 標準価格

【メリット】
- 大口顧客の要望に対応
- 小規模顧客の自動化
- リスク分散
```

---

## 5. 技術的考慮事項

### データベース設計の準備
```sql
-- 将来のStripe統合に備えたカラム
ALTER TABLE organizations ADD COLUMN payment_method TEXT DEFAULT 'invoice';
-- 'invoice': 請求書払い
-- 'card': クレジットカード
-- 'bank_transfer': 銀行振込

ALTER TABLE organizations ADD COLUMN stripe_payment_method_id TEXT;
ALTER TABLE organizations ADD COLUMN stripe_invoice_id TEXT;
```

### API設計の考慮
```typescript
// 将来の拡張性を考慮したインターフェース
interface PaymentProvider {
  processPayment(amount: number, organizationId: string): Promise<PaymentResult>;
  createInvoice(organizationId: string): Promise<Invoice>;
  handleWebhook(payload: any): Promise<void>;
}

// 実装の切り替えを容易に
class InvoicePaymentProvider implements PaymentProvider { }
class StripePaymentProvider implements PaymentProvider { }
```

---

## まとめ

初期段階では請求書払いでシンプルに運用を開始し、事業の成長に応じてStripe決済を段階的に導入する戦略を推奨します。

**重要なポイント:**
1. 技術的な準備（データベース設計等）は初期から考慮
2. 顧客数30社を目安に自動化検討開始
3. エンタープライズとSMBで決済方法を分ける柔軟性を保持

この段階的アプローチにより、初期の開発コストを抑えつつ、将来のスケールに対応できる基盤を構築できます。