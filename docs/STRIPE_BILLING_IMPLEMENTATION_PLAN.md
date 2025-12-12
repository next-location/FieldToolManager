# Stripe Billing統合請求システム実装計画書

## 1. エグゼクティブサマリー

### 1.1 プロジェクト概要
Field Tool Managerに新しい請求システムを統合し、Stripe Billingを使用した定期課金・カスタムPDF請求書送信・プラン変更対応を実現します。

### 1.2 主要要件
1. **毎月定期請求**: 同じ日に自動で請求書を送信
2. **初回導入費用**: 初回のみ一度だけ請求
3. **プランアップグレード**: 即日日割り計算で差額請求
4. **プランダウングレード**: 30日前通知必須（30日未満の場合は次々回更新時に適用）
5. **カスタムPDF**: Stripeデフォルトではなく、jsPDFで生成したカスタムPDF請求書
6. **別のStripeアカウント**: 既存のStripeアカウントとは異なるアカウントを使用
7. **決済方法**: 初期は請求書払い、将来的にクレジットカード決済に対応

### 1.3 現在のシステム資産
- ✅ `invoices`テーブル（請求書管理）
- ✅ `payment_records`テーブル（入金記録）
- ✅ jsPDFでカスタムPDF生成機能実装済み
- ✅ Nodemailerでメール送信機能実装済み
- ❌ `invoice_schedules`テーブル（設計済み未実装）
- ❌ Stripe Billing連携（未実装）

### 1.4 重要な設計方針

#### 🎨 カスタムPDFデザインの完全制御
- **Stripeの標準PDF機能は一切使用しません**
- jsPDFで独自のブランディングを反映した請求書を生成
- 日本のビジネス慣習に適合したレイアウト（角印、日本語フォント、和暦対応）
- 会社ロゴ、カラースキーム、フォントを完全にカスタマイズ可能

#### 💳 段階的な決済方法の導入
- **Phase 1（現在）**: 請求書払い（銀行振込）での運用
- **Phase 2（将来）**: Stripe Paymentを使用したクレジットカード決済の追加
- 両方の決済方法を並行運用可能な設計

---

## 2. システムアーキテクチャ

### 2.1 アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    Field Tool Manager                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Next.js API │ ◄─────► │ Supabase DB  │                  │
│  │   Routes     │         │ PostgreSQL   │                  │
│  └──────┬───────┘         └──────────────┘                  │
│         │                                                     │
│         │ ⬇️ Webhook                                         │
│         │                                                     │
│  ┌──────▼────────────────────────────────┐                  │
│  │     Stripe Billing Integration        │                  │
│  ├───────────────────────────────────────┤                  │
│  │  - Customer Management                │                  │
│  │  - Subscription Management            │                  │
│  │  - Invoice Customization (Disabled)   │                  │
│  │  - Webhook Handler                    │                  │
│  └──────┬────────────────────────────────┘                  │
│         │                                                     │
└─────────┼─────────────────────────────────────────────────────┘
          │
          │ API Call
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Stripe Platform                           │
├─────────────────────────────────────────────────────────────┤
│  - Subscription Billing (定期課金)                          │
│  - Proration Calculation (日割り計算)                       │
│  - Invoice Generation (請求書生成 - ダミー使用)             │
│  - Payment Processing (決済処理)                            │
│  - Webhook Events (イベント通知)                            │
└─────────────────────────────────────────────────────────────┘
          │
          │ Webhook
          ▼
┌─────────────────────────────────────────────────────────────┐
│              Custom PDF Generation Flow                      │
├─────────────────────────────────────────────────────────────┤
│  1. Stripe Webhook: invoice.created                         │
│  2. jsPDF: カスタムPDF生成                                  │
│  3. Nodemailer: PDF添付メール送信                          │
│  4. Supabase Storage: PDF保存                               │
│  5. DB更新: payment_recordsに記録                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Stripe Billingの活用方針

#### 使用する機能
- ✅ **Customers**: 組織情報の管理
- ✅ **Subscriptions**: 定期課金管理
- ✅ **Prices**: プラン価格管理
- ✅ **Proration**: 日割り計算（アップグレード時）
- ✅ **Webhooks**: イベント通知
- ✅ **Payment Methods**: カード情報管理

#### 使用しない機能（カスタム実装）
- ❌ **Stripe Invoice PDF**: デフォルトPDFは使用せず、jsPDFでカスタムPDF生成
- ❌ **Stripe Email**: Stripeのメール送信は使用せず、Nodemailerでカスタムメール送信

---

## 3. データベース設計の拡張

### 3.1 既存テーブルの拡張

#### 3.1.1 organizationsテーブル拡張
```sql
-- Stripe関連カラムの追加
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER DEFAULT 1; -- 請求日（1-28）
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS initial_setup_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_downgrade_requested_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_downgrade_target TEXT; -- 'basic' | 'standard' | 'premium'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT; -- 'active' | 'past_due' | 'canceled' | 'trialing'

-- コメント追加
COMMENT ON COLUMN organizations.stripe_customer_id IS 'StripeのCustomer ID';
COMMENT ON COLUMN organizations.stripe_subscription_id IS 'StripeのSubscription ID';
COMMENT ON COLUMN organizations.stripe_price_id IS '現在のプランのStripe Price ID';
COMMENT ON COLUMN organizations.billing_cycle_day IS '毎月の請求日（1-28）';
COMMENT ON COLUMN organizations.initial_setup_fee_paid IS '初期導入費用支払済みフラグ';
COMMENT ON COLUMN organizations.plan_downgrade_requested_at IS 'プランダウングレード申請日時';
COMMENT ON COLUMN organizations.plan_downgrade_target IS 'ダウングレード先プラン';
COMMENT ON COLUMN organizations.subscription_status IS 'サブスクリプションステータス';
```

#### 3.1.2 invoicesテーブル拡張
```sql
-- Stripe関連カラムの追加
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'subscription' CHECK (invoice_type IN ('subscription', 'setup_fee', 'upgrade', 'manual'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT; -- Supabase Storageの保存先
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS proration_details JSONB; -- 日割り計算詳細

COMMENT ON COLUMN invoices.stripe_invoice_id IS 'StripeのInvoice ID';
COMMENT ON COLUMN invoices.stripe_payment_intent_id IS 'StripeのPayment Intent ID';
COMMENT ON COLUMN invoices.invoice_type IS '請求書タイプ（定期/初期費用/アップグレード/手動）';
COMMENT ON COLUMN invoices.pdf_url IS 'カスタムPDFのURL（Supabase Storage）';
COMMENT ON COLUMN invoices.email_sent_at IS 'メール送信日時';
COMMENT ON COLUMN invoices.proration_details IS '日割り計算詳細（JSON）';
```

### 3.2 新規テーブルの作成

#### 3.2.1 invoice_schedulesテーブル（定期請求スケジュール）
```sql
CREATE TABLE IF NOT EXISTS invoice_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- スケジュール情報
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28), -- 毎月の請求日
  is_active BOOLEAN DEFAULT true,

  -- 次回請求情報
  next_invoice_date DATE NOT NULL,
  next_amount DECIMAL(10, 2) NOT NULL,

  -- Stripe情報
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, stripe_subscription_id)
);

-- インデックス
CREATE INDEX idx_invoice_schedules_next_date ON invoice_schedules(next_invoice_date) WHERE is_active = true;
CREATE INDEX idx_invoice_schedules_org ON invoice_schedules(organization_id);
```

#### 3.2.2 stripe_eventsテーブル（Webhookイベントログ）
```sql
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,

  -- イベント詳細
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  -- エラーハンドリング
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (retry_count >= 0)
);

-- インデックス
CREATE INDEX idx_stripe_events_type ON stripe_events(event_type);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed) WHERE processed = false;
CREATE INDEX idx_stripe_events_created ON stripe_events(created_at DESC);
```

#### 3.2.3 plan_change_requestsテーブル（プラン変更リクエスト）
```sql
CREATE TABLE IF NOT EXISTS plan_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- プラン変更情報
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade')),

  -- ダウングレード用
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ, -- ダウングレード実行予定日
  notification_sent_at TIMESTAMPTZ, -- 30日前通知送信日時

  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'cancelled')),
  executed_at TIMESTAMPTZ,

  -- Stripe情報
  stripe_subscription_id TEXT,
  proration_amount DECIMAL(10, 2), -- アップグレード時の差額

  -- メタデータ
  notes TEXT,
  requested_by UUID REFERENCES users(id),

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_plan_change_org ON plan_change_requests(organization_id);
CREATE INDEX idx_plan_change_status ON plan_change_requests(status) WHERE status = 'pending';
CREATE INDEX idx_plan_change_scheduled ON plan_change_requests(scheduled_for) WHERE status = 'pending';
```

---

## 4. 実装フェーズと優先順位

### Phase 1: Stripe基盤構築（2週間）
**優先度: 最高**

#### Week 1: Stripe初期設定
- [ ] Stripe新規アカウント作成
- [ ] API Key取得（本番用・テスト用）
- [ ] Webhook Endpoint設定
- [ ] Price設定（Basic/Standard/Premium + 初期費用）
- [ ] データベースマイグレーション実行

#### Week 2: Stripe Customer & Subscription管理
- [ ] Stripe Customer作成API実装
- [ ] Subscription作成API実装
- [ ] 初期導入費用の一回限り請求実装
- [ ] Webhook受信エンドポイント実装

### Phase 2: カスタムPDF請求書・領収書生成（2週間）
**優先度: 最高**

#### Week 3: PDF生成とメール送信
- [ ] jsPDFカスタムPDF請求書生成機能拡張
  - [ ] 支払方法別テンプレート（請求書払い/カード払い）
  - [ ] 請求書払い用：振込先情報、支払期限
  - [ ] カード払い用：決済済み表示、カード下4桁
- [ ] jsPDFカスタムPDF領収書生成機能実装
  - [ ] 領収書番号自動採番
  - [ ] 角印・収入印紙表示
  - [ ] 但し書き対応
- [ ] Supabase Storageへのアップロード実装
- [ ] Nodemailerメール送信実装

#### Week 4: Webhook処理の完全実装
- [ ] invoice.created処理（請求書生成・送信）
- [ ] invoice.payment_succeeded処理（領収書生成・送信）
- [ ] invoice.payment_failed処理
- [ ] customer.subscription.updated処理
- [ ] 冪等性保証

### Phase 3: プラン変更機能（2週間）
**優先度: 高**

#### Week 5: アップグレード実装
- [ ] アップグレードAPI実装
- [ ] 日割り計算処理
- [ ] 差額請求書生成

#### Week 6: ダウングレード実装
- [ ] ダウングレード申請API実装
- [ ] 30日前チェック
- [ ] ダウングレード実行バッチ処理

### Phase 4: 定期請求自動化（1週間）
**優先度: 高**

#### Week 7: 定期請求システム
- [ ] Stripe Subscriptionの自動更新設定
- [ ] invoice_schedulesの自動更新
- [ ] 請求日前通知メール

### Phase 5: 管理画面・運用機能（2週間）
**優先度: 中**

#### Week 8-9: 管理画面実装
- [ ] Super Admin管理画面
  - [ ] 全組織の支払状況一覧
  - [ ] 手動入金記録機能（請求書払い用）
- [ ] 顧客向け請求管理画面
  - [ ] 請求書一覧表示
  - [ ] 支払済み請求書の領収書ダウンロードボタン
  - [ ] 領収書PDF即時生成・ダウンロード機能
- [ ] プラン変更UI
- [ ] 支払方法管理UI

### Phase 6: テスト・デプロイ（1週間）
**優先度: 最高**

#### Week 10: 総合テスト
- [ ] Stripe Test Mode完全テスト
- [ ] PDF生成品質チェック
- [ ] メール送信テスト
- [ ] 本番環境デプロイ

---

## 5. 技術的な課題と解決策

### 5.1 Stripeデフォルト請求書の無効化

#### 課題
Stripeは自動的にPDF請求書を生成してメール送信する。これを無効化してカスタムPDFのみを送信する必要がある。

#### 解決策
```typescript
// Subscription作成時にStripeの自動メール送信を無効化
await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  billing_cycle_anchor: billingCycleDay,
  collection_method: 'charge_automatically',
  // メタデータでカスタムPDF送信を判断
  metadata: {
    send_invoice: 'false'
  }
});
```

### 5.2 日割り計算の正確性

#### 課題
アップグレード時の日割り計算がStripeとカスタムPDFで一致する必要がある。

#### 解決策
```typescript
// Stripeの日割り計算を使用
const subscription = await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscriptionItemId,
    price: newPriceId
  }],
  proration_behavior: 'always_invoice',
  proration_date: Math.floor(Date.now() / 1000)
});

// Stripeが計算した日割り額を取得
const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
  customer: customerId,
  subscription: subscriptionId
});
```

### 5.3 ダウングレードの30日前通知

#### 解決策: Cron Job（推奨）
```typescript
// /api/cron/process-plan-changes
// Vercel Cronで毎日1回実行
export async function GET(req: Request) {
  // 認証チェック
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = new Date();

  // 実行予定日が今日のダウングレードリクエストを取得
  const { data: requests } = await supabase
    .from('plan_change_requests')
    .select('*')
    .eq('status', 'pending')
    .eq('change_type', 'downgrade')
    .lte('scheduled_for', today.toISOString());

  for (const request of requests) {
    // Stripe Subscriptionを更新
    await stripe.subscriptions.update(request.stripe_subscription_id, {
      items: [{
        id: subscriptionItemId,
        price: getPriceId(request.requested_plan)
      }],
      proration_behavior: 'none' // ダウングレードは日割りなし
    });

    // ステータス更新
    await supabase
      .from('plan_change_requests')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString()
      })
      .eq('id', request.id);
  }

  return new Response('OK', { status: 200 });
}
```

### 5.4 初回導入費用の一回限り請求

#### 解決策
```typescript
async function createSubscriptionWithSetupFee(organizationId: string, customerId: string, priceId: string) {
  // 初期費用支払済みかチェック
  const { data: org } = await supabase
    .from('organizations')
    .select('initial_setup_fee_paid')
    .eq('id', organizationId)
    .single();

  if (!org.initial_setup_fee_paid) {
    // 初期費用を追加（一回限りの請求）
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: 50000, // ¥50,000
      currency: 'jpy',
      description: '初期導入費用（一回限り）'
    });

    // フラグ更新
    await supabase
      .from('organizations')
      .update({ initial_setup_fee_paid: true })
      .eq('id', organizationId);
  }

  // Subscription作成
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    billing_cycle_anchor: billingCycleDay
  });

  return subscription;
}
```

### 5.5 Webhookの冪等性保証

#### 解決策
```typescript
// /api/webhooks/stripe
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 冪等性チェック: 既に処理済みのイベントか確認
  const { data: existingEvent } = await supabase
    .from('stripe_events')
    .select('id, processed')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent?.processed) {
    console.log(`Event ${event.id} already processed. Skipping.`);
    return new Response('OK', { status: 200 });
  }

  // イベントを記録
  await supabase.from('stripe_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    data: event.data,
    processed: false
  });

  try {
    // イベント処理
    await handleStripeEvent(event);

    // 処理完了フラグ
    await supabase
      .from('stripe_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    return new Response('OK', { status: 200 });
  } catch (error) {
    // エラー記録
    await supabase
      .from('stripe_events')
      .update({
        error_message: error.message,
        retry_count: supabase.rpc('increment', { row_id: event.id })
      })
      .eq('stripe_event_id', event.id);

    return new Response('Processing failed', { status: 500 });
  }
}
```

---

## 6. 運用フロー

### 6.1 新規顧客のオンボーディング

```
1. 管理者がサインアップ
   ↓
2. プラン選択（Basic/Standard/Premium）
   ↓
3. クレジットカード登録（Stripe Elements）
   ↓
4. Stripe Customer作成
   ↓
5. 初期導入費用請求（¥50,000）
   ↓
6. Subscription作成（定期課金開始）
   ↓
7. 初回請求書生成（初期費用 + 月額料金）
   ↓
8. カスタムPDF生成 + メール送信
   ↓
9. Supabase Storageに保存
   ↓
10. アカウント有効化
```

### 6.2 毎月の定期請求フロー（請求書払い）

```
毎月請求日（billing_cycle_day）
   ↓
Stripe: Invoice自動生成（ダミー）
   ↓
Webhook: invoice.created
   ↓
請求書PDF生成（jsPDF・振込先記載）
   ↓
Supabase Storage保存
   ↓
Nodemailerでメール送信（請求書PDF添付）
   ↓
【顧客が銀行振込】
   ↓
管理者が入金確認後、手動で入金記録
   ↓
payment_recordsテーブルに「支払済み」更新
   ↓
領収書PDF自動生成（jsPDF）
   ↓
Supabase Storage保存
   ↓
【顧客管理画面に領収書ダウンロードボタン表示】
   ↓
顧客が必要に応じてダウンロード
```

### 6.3 毎月の定期請求フロー（クレジットカード払い）

```
毎月請求日（billing_cycle_day）
   ↓
Stripe: Subscription更新
   ↓
Stripe: Invoice自動生成
   ↓
Webhook: invoice.created
   ↓
請求書PDF生成（jsPDF・カード決済予定明記）
   ↓
Nodemailerでメール送信（請求書PDF添付）
   ↓
Stripe: 自動決済実行
   ↓
Webhook: invoice.payment_succeeded
   ↓
payment_recordsテーブルに「支払済み」記録
   ↓
領収書PDF自動生成（jsPDF）
   ↓
Supabase Storage保存
   ↓
【顧客管理画面に領収書ダウンロードボタン表示】
   ↓
顧客が必要に応じてダウンロード
   ↓
invoice_schedulesの次回請求日更新
```

### 6.4 プランアップグレードフロー

```
1. 管理者がアップグレード申請
   ↓
2. API: /api/stripe/subscriptions/upgrade
   ↓
3. Stripe: Subscription更新（即時）
   ↓
4. Stripe: 日割り計算自動実行
   ↓
5. Stripe: 差額請求書即時生成
   ↓
6. Webhook: invoice.created
   ↓
7. カスタムPDF生成（日割り詳細表示）
   ↓
8. メール送信（差額請求書）
   ↓
9. Stripe: 自動決済実行
   ↓
10. プラン変更完了通知
```

### 6.5 プランダウングレードフロー

```
1. 管理者がダウングレード申請
   ↓
2. API: /api/stripe/subscriptions/downgrade-request
   ↓
3. 30日前チェック
   ├─ OK（30日以上先）
   │  └─ scheduled_for = 次回更新日
   └─ NG（30日未満）
      └─ scheduled_for = 次々回更新日
   ↓
4. plan_change_requestsテーブルに登録
   ↓
5. 30日前通知メール送信
   ↓
6. Cron Job（毎日2:00実行）
   ↓
7. scheduled_for == 今日のリクエストを実行
   ↓
8. Stripe: Subscription更新（日割りなし）
   ↓
9. ダウングレード完了通知メール送信
```

### 6.6 支払失敗時のリトライフロー（クレジットカード払いのみ）

```
Webhook: invoice.payment_failed
   ↓
リトライ1回目（3日後）
   ├─ 成功 → 完了
   └─ 失敗
      ↓
   リトライ2回目（5日後）
      ├─ 成功 → 完了
      └─ 失敗
         ↓
      リトライ3回目（7日後）
         ├─ 成功 → 完了
         └─ 失敗
            ↓
         アカウント停止（subscription_status = 'past_due'）
            ↓
         管理者に最終通知メール
```

---

## 7. 環境変数設定

### 7.1 必要な環境変数

```bash
# Stripe設定（本番用）
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe設定（テスト用）
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_TEST_WEBHOOK_SECRET=whsec_test_xxxxx

# Stripe Price ID
STRIPE_PRICE_BASIC=price_xxxxx # Basic Plan
STRIPE_PRICE_STANDARD=price_xxxxx # Standard Plan
STRIPE_PRICE_PREMIUM=price_xxxxx # Premium Plan

# Cron Job認証
CRON_SECRET=your_secret_key_here

# Nodemailer設定（既存）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@example.com

# Supabase Storage（既存）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

---

## 8. コスト試算

### 8.1 Stripe手数料詳細

#### 決済手数料（クレジットカード決済導入時）
| 決済方法 | 手数料率 | 備考 |
|----------|----------|------|
| 国内カード（Visa, Mastercard） | 3.6% | 1決済ごとに課金 |
| 国内カード（JCB, Amex, Diners） | 3.6% | 1決済ごとに課金 |
| 海外発行カード | 4.6% | 追加1%の国際手数料 |
| デジタルウォレット（Apple Pay等） | 3.6% | 通常カードと同率 |

#### Stripe機能利用料
| 機能 | 料金 | 備考 |
|------|------|------|
| Stripe Billing（定期課金） | 無料 | サブスクリプション管理 |
| Stripe Invoice（請求書管理） | 無料 | 請求書の生成・管理 |
| Stripe Customer Portal | 無料 | 顧客向け管理画面 |
| Webhook | 無料 | イベント通知 |
| APIアクセス | 無料 | 無制限 |

#### その他の費用
| 項目 | 費用 | 備考 |
|------|------|------|
| アカウント開設費 | 無料 | 初期費用なし |
| 月額基本料金 | 無料 | 固定費なし |
| 返金処理 | 返金額のみ | 手数料は返還されない |
| チャージバック | ¥1,500/件 | 不正利用時の処理費用 |

#### コスト試算例

**ケース1: 請求書払い（銀行振込）のみの場合**
- Stripe手数料: **¥0**（決済処理を行わないため）
- 請求書生成・管理のみ利用

**ケース2: クレジットカード決済導入後**
月額 ¥10,000 × 100社 = ¥1,000,000の場合：
- カード決済利用率80%と仮定: ¥800,000
- Stripe手数料（3.6%）: ¥28,800
- 実質売上: ¥971,200
- 年間手数料: ¥345,600

**ケース3: 段階的な料金プランの場合**
| プラン | 月額 | 契約数 | 売上 | 手数料(3.6%) |
|--------|------|--------|------|--------------|
| Basic | ¥10,000 | 50社 | ¥500,000 | ¥18,000 |
| Standard | ¥20,000 | 30社 | ¥600,000 | ¥21,600 |
| Premium | ¥30,000 | 20社 | ¥600,000 | ¥21,600 |
| **合計** | - | **100社** | **¥1,700,000** | **¥61,200** |

### 8.2 開発コスト

| Phase | 期間 | 工数 |
|-------|------|------|
| Phase 1 | 2週間 | 80時間 |
| Phase 2 | 2週間 | 80時間 |
| Phase 3 | 2週間 | 80時間 |
| Phase 4 | 1週間 | 40時間 |
| Phase 5 | 2週間 | 80時間 |
| Phase 6 | 1週間 | 40時間 |
| **合計** | **10週間** | **400時間** |

---

## 9. リスク管理

### 9.1 技術的リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Webhook遅延・失敗 | 高 | リトライロジック実装、stripe_eventsテーブルで監視 |
| PDF生成失敗 | 中 | エラーログ記録、手動再生成機能 |
| メール送信失敗 | 中 | 送信ログ記録、再送信機能 |
| 日割り計算ミス | 高 | Stripeの計算結果を使用、テストケース充実 |
| 重複請求 | 高 | 冪等性チェック、stripe_event_idでユニーク制約 |

### 9.2 運用リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 顧客からの問い合わせ増加 | 中 | FAQページ作成、メールテンプレート準備 |
| ダウングレード申請の誤解 | 中 | UI上で明確な説明、確認ダイアログ |
| 支払失敗の頻発 | 高 | リマインダーメール、カード更新案内 |
| Stripe障害 | 低 | ステータスページ監視、障害時の案内準備 |

---

## 10. 成功指標（KPI）

### 10.1 技術的KPI

| 指標 | 目標値 |
|------|--------|
| Webhook処理成功率 | 99.9%以上 |
| PDF生成成功率 | 99.5%以上 |
| メール送信成功率 | 99%以上 |
| 決済成功率 | 95%以上 |
| API応答時間 | 2秒以内 |

### 10.2 ビジネスKPI

| 指標 | 目標値 |
|------|--------|
| 課金自動化率 | 100% |
| 手動対応件数 | 月5件以下 |
| 顧客満足度 | 4.5/5以上 |
| 決済失敗率 | 5%以下 |

---

## 11. 次のステップ

### 11.1 即時対応事項
1. ✅ Stripe新規アカウント作成
2. ✅ データベースマイグレーション実行
3. ✅ Phase 1の開発開始

### 11.2 検討事項
1. Stripe Test ModeでのPOC実施（1週間）
2. 既存顧客の移行計画策定
3. 請求書デザインの最終確認
4. 利用規約・プライバシーポリシーの更新

---

## 12. Quick Start Guide

### 12.1 Day 1: 環境準備（3時間）

#### Step 1: Stripeアカウント作成（30分）
```bash
# 1. https://dashboard.stripe.com/register にアクセス
# 2. ビジネス情報を入力（このサービス専用の新規アカウント）
# 3. 本人確認書類をアップロード
# 4. テストモードに切り替え
```

#### Step 2: APIキー取得と環境変数設定（15分）
```bash
# Stripe Dashboardから取得
# Developers > API keys

# .env.localに追加
STRIPE_TEST_SECRET_KEY=sk_test_51O...
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_51O...

# 本番用（後日設定）
# STRIPE_SECRET_KEY=sk_live_51O...
# STRIPE_PUBLISHABLE_KEY=pk_live_51O...
```

#### Step 3: 必要なパッケージインストール（15分）
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install -D @types/stripe
```

#### Step 4: データベースマイグレーション（30分）
```sql
-- supabase/migrations/20250101_stripe_integration.sql
-- organizationsテーブル拡張
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS initial_setup_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'invoice'; -- 'invoice' | 'card'

-- 新規テーブル作成は付録Dを参照
```

#### Step 5: Stripe初期設定スクリプト（1.5時間）
```typescript
// scripts/setup-stripe-products.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function setupProducts() {
  // 製品作成
  const products = await Promise.all([
    stripe.products.create({
      name: 'Field Tool Manager - Basic Plan',
      description: '基本プラン（10名まで）',
    }),
    stripe.products.create({
      name: 'Field Tool Manager - Standard Plan',
      description: '標準プラン（30名まで）',
    }),
    stripe.products.create({
      name: 'Field Tool Manager - Premium Plan',
      description: 'プレミアムプラン（100名まで）',
    }),
  ]);

  // 価格設定
  const prices = await Promise.all([
    stripe.prices.create({
      product: products[0].id,
      unit_amount: 10000, // ¥10,000
      currency: 'jpy',
      recurring: { interval: 'month' },
      nickname: 'basic_monthly',
    }),
    stripe.prices.create({
      product: products[1].id,
      unit_amount: 20000, // ¥20,000
      currency: 'jpy',
      recurring: { interval: 'month' },
      nickname: 'standard_monthly',
    }),
    stripe.prices.create({
      product: products[2].id,
      unit_amount: 30000, // ¥30,000
      currency: 'jpy',
      recurring: { interval: 'month' },
      nickname: 'premium_monthly',
    }),
  ]);

  console.log('Price IDs:');
  prices.forEach((price) => {
    console.log(`${price.nickname}: ${price.id}`);
  });
}

// 実行: npx tsx scripts/setup-stripe-products.ts
```

### 12.2 Day 2-3: 基本実装（16時間）

#### Step 1: Stripe Client初期化（1時間）
```typescript
// lib/stripe/client.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Stripe secret key is not defined');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Price IDマッピング
export const PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC!,
  standard: process.env.STRIPE_PRICE_STANDARD!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
};
```

#### Step 2: Customer作成API（2時間）
```typescript
// app/api/stripe/customers/create/route.ts
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { organizationId, email, name } = await request.json();

  try {
    // Stripe Customer作成
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organization_id: organizationId,
      },
    });

    // DBを更新
    const supabase = createClient();
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', organizationId);

    return Response.json({ customerId: customer.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Step 3: Webhook受信エンドポイント（3時間）
```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe/client';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return new Response('Webhook Error', { status: 400 });
  }

  // イベント処理
  switch (event.type) {
    case 'invoice.created':
      await handleInvoiceCreated(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    // 他のイベント...
  }

  return new Response('OK', { status: 200 });
}
```

### 12.3 ディレクトリ構造

```
field-tool-manager/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── customers/
│   │   │   │   ├── create/route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── subscriptions/
│   │   │   │   ├── create/route.ts
│   │   │   │   ├── upgrade/route.ts
│   │   │   │   └── downgrade-request/route.ts
│   │   │   ├── payment-methods/
│   │   │   │   └── attach/route.ts
│   │   │   └── webhooks/
│   │   │       └── route.ts
│   │   └── cron/
│   │       └── process-plan-changes/route.ts
│   ├── admin/
│   │   └── billing/
│   │       ├── page.tsx
│   │       ├── invoices/page.tsx
│   │       ├── plan/page.tsx
│   │       └── payment-method/page.tsx
├── lib/
│   ├── stripe/
│   │   ├── client.ts
│   │   ├── subscription.ts
│   │   ├── invoice.ts
│   │   ├── customer.ts
│   │   ├── webhook.ts
│   │   └── types.ts
│   └── pdf/
│       └── invoice-generator.ts
├── components/
│   ├── billing/
│   │   ├── PlanSelector.tsx
│   │   ├── PaymentMethodForm.tsx
│   │   ├── InvoiceList.tsx
│   │   └── SubscriptionStatus.tsx
├── scripts/
│   ├── setup-stripe-products.ts
│   ├── migrate-existing-customers.ts
│   └── test-webhook.ts
└── supabase/
    └── migrations/
        ├── 20250101_stripe_integration.sql
        └── 20250102_invoice_schedules.sql
```

### 12.4 領収書ダウンロード機能の実装例

```typescript
// components/billing/InvoiceList.tsx
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  // 領収書ダウンロード処理
  const downloadReceipt = async (invoiceId: string) => {
    setDownloading(invoiceId);

    try {
      const response = await fetch(`/api/receipts/${invoiceId}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('ダウンロード失敗');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('領収書ダウンロードエラー:', error);
      alert('領収書のダウンロードに失敗しました');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">請求履歴</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">請求日</th>
            <th className="text-left p-2">請求番号</th>
            <th className="text-right p-2">金額</th>
            <th className="text-center p-2">支払状況</th>
            <th className="text-center p-2">領収書</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b">
              <td className="p-2">{invoice.invoice_date}</td>
              <td className="p-2">{invoice.invoice_number}</td>
              <td className="text-right p-2">¥{invoice.amount.toLocaleString()}</td>
              <td className="text-center p-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  invoice.payment_status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.payment_status === 'paid' ? '支払済' : '未払い'}
                </span>
              </td>
              <td className="text-center p-2">
                {invoice.payment_status === 'paid' ? (
                  <button
                    onClick={() => downloadReceipt(invoice.id)}
                    disabled={downloading === invoice.id}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {downloading === invoice.id ? 'ダウンロード中...' : '領収書'}
                  </button>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

```typescript
// app/api/receipts/[id]/download/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateReceiptPDF } from '@/lib/pdf/receipt-generator';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // 請求書情報を取得
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, organizations(*)')
    .eq('id', params.id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
  }

  // 支払済みチェック
  if (invoice.payment_status !== 'paid') {
    return NextResponse.json({ error: '未払いの請求書には領収書を発行できません' }, { status: 400 });
  }

  // 領収書PDF生成
  const pdfBuffer = await generateReceiptPDF(invoice);

  // PDFを返す
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${invoice.invoice_number}.pdf"`,
    },
  });
}
```

### 12.5 実装チェックリスト

#### 環境準備
- [ ] Stripeアカウント作成完了
- [ ] テストAPIキー取得済み
- [ ] 環境変数設定完了（.env.local）
- [ ] stripeパッケージインストール済み
- [ ] データベースマイグレーション実行済み

#### Stripe設定
- [ ] Products作成済み（Basic/Standard/Premium）
- [ ] Prices設定済み（月額料金）
- [ ] Price IDを環境変数に追加済み
- [ ] Webhook Endpoint登録済み
- [ ] Webhook Secretを環境変数に追加済み

#### 基本機能実装
- [ ] Stripe Client初期化
- [ ] Customer作成API実装
- [ ] Subscription作成API実装
- [ ] Webhook受信エンドポイント実装
- [ ] カスタムPDF生成機能実装

#### テスト
- [ ] Stripe CLIインストール済み
- [ ] ローカルでWebhookテスト実行
- [ ] Customer作成テスト完了
- [ ] Subscription作成テスト完了
- [ ] PDF生成テスト完了

---

## 付録

### C. Stripe CLIでのローカルテスト

```bash
# Stripe CLIインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhookをローカルに転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# テストイベント送信
stripe trigger invoice.created
stripe trigger invoice.payment_succeeded
```

### D. データベーススキーマ完全版

```sql
-- stripe_eventsテーブル
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- plan_change_requestsテーブル
CREATE TABLE IF NOT EXISTS plan_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  stripe_subscription_id TEXT,
  proration_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- invoice_schedulesテーブル
CREATE TABLE IF NOT EXISTS invoice_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
  is_active BOOLEAN DEFAULT true,
  next_invoice_date DATE NOT NULL,
  next_amount DECIMAL(10, 2) NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### E. エラーハンドリングガイド

#### Stripe APIエラー処理
```typescript
async function handleStripeError(error: Stripe.StripeError) {
  switch (error.type) {
    case 'StripeCardError':
      // カードエラー（残高不足、期限切れ等）
      logger.error('Card error:', error.message);
      break;
    case 'StripeRateLimitError':
      // レート制限エラー
      logger.error('Rate limit error, retrying...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      break;
    case 'StripeInvalidRequestError':
      // 無効なパラメータ
      logger.error('Invalid parameters:', error.message);
      break;
    case 'StripeAPIError':
      // Stripe側のエラー
      logger.error('Stripe API error:', error.message);
      break;
    case 'StripeConnectionError':
      // ネットワークエラー
      logger.error('Network error:', error.message);
      break;
    case 'StripeAuthenticationError':
      // 認証エラー
      logger.error('Authentication error, check API keys');
      break;
  }
}
```

---

## 付録

### A. Stripe Price設定例

```javascript
// Stripe Dashboard または API で作成
const prices = [
  {
    product: 'Basic Plan',
    unit_amount: 1000000, // ¥10,000
    currency: 'jpy',
    recurring: {
      interval: 'month',
      interval_count: 1
    }
  },
  {
    product: 'Standard Plan',
    unit_amount: 2000000, // ¥20,000
    currency: 'jpy',
    recurring: {
      interval: 'month',
      interval_count: 1
    }
  },
  {
    product: 'Premium Plan',
    unit_amount: 3000000, // ¥30,000
    currency: 'jpy',
    recurring: {
      interval: 'month',
      interval_count: 1
    }
  }
];
```

### B. カスタムPDFテンプレート構成

#### B.1 請求書テンプレート（請求書払い用）
```
┌─────────────────────────────────────┐
│ [会社ロゴ]          請求書          │
├─────────────────────────────────────┤
│ 請求番号: INV-2025-001              │
│ 請求日: 2025年1月1日                │
│ 支払期限: 2025年1月31日             │
├─────────────────────────────────────┤
│ 請求先:                             │
│ 株式会社◯◯                         │
│ 〒123-4567                          │
│ 東京都渋谷区...                     │
├─────────────────────────────────────┤
│ 明細                                │
│ ┌─────────────────────────────┐   │
│ │ 項目      数量  単価    金額  │   │
│ ├─────────────────────────────┤   │
│ │ Basic Plan  1  ¥10,000 ¥10,000│  │
│ │ 初期導入費用 1  ¥50,000 ¥50,000│  │
│ ├─────────────────────────────┤   │
│ │ 小計              ¥60,000      │  │
│ │ 消費税（10%）     ¥6,000       │  │
│ │ 合計              ¥66,000      │  │
│ └─────────────────────────────┘   │
├─────────────────────────────────────┤
│ お支払方法: 銀行振込                │
│ 振込先:                             │
│ ◯◯銀行 ◯◯支店 普通 1234567       │
│ 口座名義: カ）ザイロク               │
│ ※振込手数料はご負担ください         │
│                                     │
│ [角印]                              │
└─────────────────────────────────────┘
```

#### B.2 請求書テンプレート（クレジットカード払い用）
```
┌─────────────────────────────────────┐
│ [会社ロゴ]          請求書          │
├─────────────────────────────────────┤
│ 請求番号: INV-2025-001              │
│ 請求日: 2025年1月1日                │
│ 決済予定日: 2025年1月5日            │
├─────────────────────────────────────┤
│ 請求先:                             │
│ 株式会社◯◯                         │
│ 〒123-4567                          │
│ 東京都渋谷区...                     │
├─────────────────────────────────────┤
│ 明細                                │
│ ┌─────────────────────────────┐   │
│ │ 項目      数量  単価    金額  │   │
│ ├─────────────────────────────┤   │
│ │ Basic Plan  1  ¥10,000 ¥10,000│  │
│ ├─────────────────────────────┤   │
│ │ 小計              ¥10,000      │  │
│ │ 消費税（10%）     ¥1,000       │  │
│ │ 合計              ¥11,000      │  │
│ └─────────────────────────────┘   │
├─────────────────────────────────────┤
│ お支払方法: クレジットカード         │
│ カード番号: **** **** **** 1234     │
│ 決済ステータス: 自動決済予定         │
│                                     │
│ [角印]                              │
└─────────────────────────────────────┘
```

#### B.3 領収書テンプレート（電子領収書）
```
┌─────────────────────────────────────┐
│ [会社ロゴ]          領収書          │
├─────────────────────────────────────┤
│ 領収書番号: REC-2025-001            │
│ 発行日: 2025年1月5日                │
├─────────────────────────────────────┤
│                                     │
│ 株式会社◯◯ 御中                   │
│                                     │
│ ￥11,000-                           │
│                                     │
│ 但し Field Tool Manager             │
│     2025年1月分利用料として         │
│                                     │
│ 上記正に領収いたしました             │
│                                     │
├─────────────────────────────────────┤
│ 内訳                                │
│ ┌─────────────────────────────┐   │
│ │ 項目              金額         │   │
│ ├─────────────────────────────┤   │
│ │ Basic Plan        ¥10,000      │  │
│ │ 消費税（10%）     ¥1,000       │  │
│ ├─────────────────────────────┤   │
│ │ 合計              ¥11,000      │  │
│ └─────────────────────────────┘   │
├─────────────────────────────────────┤
│ 発行者:                             │
│ 株式会社ザイロク                    │
│ 〒xxx-xxxx                          │
│ 東京都◯◯区...                     │
│                                     │
│ [角印]                              │
│                                     │
│ ※この領収書は電子文書のため        │
│   収入印紙の貼付は不要です          │
└─────────────────────────────────────┘
```

### C. 参考資料
- [Stripe Billing公式ドキュメント](https://stripe.com/docs/billing)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [jsPDF日本語対応](https://github.com/parallax/jsPDF)
- [Nodemailer SMTP設定](https://nodemailer.com/smtp/)

---

**作成日**: 2025年12月12日
**バージョン**: 1.0
**作成者**: Claude AI Assistant