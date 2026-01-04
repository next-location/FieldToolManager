# データベースマイグレーション管理

> **重要**: このファイルはデータベースのバージョン管理と変更履歴を記録します。
> マイグレーション実行時は、必ずこのファイルを更新してください。

## 目次
1. [マイグレーション戦略](#1-マイグレーション戦略)
2. [環境別マイグレーション](#2-環境別マイグレーション)
3. [マイグレーション履歴](#3-マイグレーション履歴)
4. [ロールバック手順](#4-ロールバック手順)
5. [トラブルシューティング](#5-トラブルシューティング)

---

## 1. マイグレーション戦略

### 1.1 基本方針

```
開発環境 → テスト環境 → ステージング環境 → 本番環境
   ↓          ↓              ↓                ↓
 自動適用   自動適用      手動承認後適用    手動承認後適用
```

### 1.2 使用ツール

#### Supabase CLI（推奨）
```bash
# マイグレーションファイル作成
npx supabase migration new <migration_name>

# ローカル環境に適用
npx supabase db push

# リモート環境に適用
npx supabase db push --db-url <DATABASE_URL>

# マイグレーション履歴確認
npx supabase migration list
```

#### 代替：Prisma（将来的な選択肢）
```bash
# スキーマ変更
npx prisma migrate dev --name <migration_name>

# 本番環境に適用
npx prisma migrate deploy
```

### 1.3 命名規則

```
ファイル名: YYYYMMDDHHMMSS_<descriptive_name>.sql

例:
20251201120000_create_organizations_table.sql
20251201120100_create_users_table.sql
20251201120200_add_deleted_at_to_tools.sql
20251201120300_add_rls_policies.sql
```

---

## 2. 環境別マイグレーション

### 2.1 ローカル開発環境

```bash
# Dockerコンテナ起動
docker-compose up -d

# Supabaseローカル起動
npx supabase start

# マイグレーション適用
npx supabase db push

# 初期データ投入（シードデータ）
npx supabase db seed
```

### 2.2 テスト環境

```bash
# テスト用データベースに接続
export DATABASE_URL="postgresql://postgres:password@localhost:54322/postgres"

# マイグレーション適用
npx supabase db push --db-url $DATABASE_URL

# テストデータ投入
npm run seed:test
```

### 2.3 本番環境

```bash
# 本番環境URL設定（.env.productionから読み込み）
export DATABASE_URL=$SUPABASE_DB_URL

# マイグレーション実行前のバックアップ
npx supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# マイグレーション適用（慎重に）
npx supabase db push --db-url $DATABASE_URL

# 動作確認
npm run health-check
```

---

## 3. マイグレーション履歴

### 📝 プラン変更: 日割り差額カラムの追加（2025-12-29）

#### 20251229000002_add_prorated_charge_to_contracts.sql ✨NEW

**適用予定日**: 2025-12-29
**適用環境**: 未適用（本番環境、テスト環境）
**影響範囲**: `contracts`テーブルにカラム追加、インデックス追加

**背景**:
- 月払いグレードアップ時に、当月の残り日数分の差額を翌月請求に加算する必要がある
- 年払いグレードアップ時に、残り期間の差額を即時請求する必要がある
- プラン変更履歴を記録し、グレードアップ/ダウンを区別する

**変更内容**:
1. **contractsテーブルに新カラム追加**:
   - `pending_prorated_charge` (DECIMAL(10, 2) DEFAULT 0): 次回請求に加算する日割り差額
   - `pending_prorated_description` (TEXT): 日割り差額の説明（請求書明細に表示）
   - `plan_change_date` (TIMESTAMP): プラン変更実行日時
   - `plan_change_type` (TEXT): プラン変更の種類（'upgrade' | 'downgrade'）

2. **インデックス追加**:
   - `idx_contracts_pending_prorated`: 日割り差額が設定されている契約の高速検索
   - `idx_contracts_plan_change_date`: プラン変更履歴の検索用

**SQL**:
```sql
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS pending_prorated_charge DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_prorated_description TEXT,
ADD COLUMN IF NOT EXISTS plan_change_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan_change_type TEXT CHECK (plan_change_type IN ('upgrade', 'downgrade'));

COMMENT ON COLUMN contracts.pending_prorated_charge IS '次回請求に加算する日割り差額（グレードアップ時のみ、請求書発行後に0にクリア）';
COMMENT ON COLUMN contracts.pending_prorated_description IS '日割り差額の説明（請求書明細に表示、例: "プラン変更差額（12/16-31、16日分）"）';
COMMENT ON COLUMN contracts.plan_change_date IS 'プラン変更実行日時（最後にプラン変更した日時）';
COMMENT ON COLUMN contracts.plan_change_type IS 'プラン変更の種類（upgrade: グレードアップ、downgrade: グレードダウン）';

CREATE INDEX IF NOT EXISTS idx_contracts_pending_prorated
ON contracts(pending_prorated_charge)
WHERE pending_prorated_charge > 0;

CREATE INDEX IF NOT EXISTS idx_contracts_plan_change_date
ON contracts(plan_change_date DESC)
WHERE plan_change_date IS NOT NULL;
```

**影響する機能**:
- プラン変更API: グレードアップ時に日割り差額を計算して保存
- 月次請求書自動発行cron: `pending_prorated_charge`を請求書に含め、発行後に0にクリア
- 契約詳細画面: プラン変更履歴を表示

**ロールバック手順**:
```sql
-- インデックス削除
DROP INDEX IF EXISTS idx_contracts_pending_prorated;
DROP INDEX IF EXISTS idx_contracts_plan_change_date;

-- カラム削除
ALTER TABLE contracts
DROP COLUMN IF EXISTS pending_prorated_charge,
DROP COLUMN IF EXISTS pending_prorated_description,
DROP COLUMN IF EXISTS plan_change_date,
DROP COLUMN IF EXISTS plan_change_type;
```

**適用手順**:
```bash
# テスト環境（Supabase Dashboard → SQL Editor）
# 上記SQLを実行

# 本番環境（Supabase Dashboard → SQL Editor）
# 上記SQLを実行
```

---

### 💳 請求書管理: 初回請求書フラグの追加（2025-12-29）

#### 20251229000001_add_is_initial_invoice_to_invoices.sql ✨NEW

**適用予定日**: 2025-12-29
**適用環境**: 未適用（本番環境、テスト環境）
**影響範囲**: `invoices`テーブルにカラム追加、インデックス追加

**背景**:
- 初回請求書（初期費用含む）と2回目以降の請求書（月額のみ）を区別する必要がある
- 契約完了前に初回入金確認を必須化するため
- cronジョブで自動発行される請求書は2回目以降のみとする

**変更内容**:
1. **invoicesテーブルに新カラム追加**:
   - `is_initial_invoice` (BOOLEAN DEFAULT false): 初回請求書フラグ

2. **既存データの更新**:
   - 全ての既存請求書の`is_initial_invoice`を`false`に設定

3. **インデックス追加**:
   - `idx_invoices_contract_initial`: 契約IDと初回請求書フラグの複合インデックス（部分インデックス）

**SQL**:
```sql
ALTER TABLE invoices
ADD COLUMN is_initial_invoice BOOLEAN DEFAULT false;

UPDATE invoices SET is_initial_invoice = false WHERE is_initial_invoice IS NULL;

CREATE INDEX idx_invoices_contract_initial
ON invoices(contract_id, is_initial_invoice)
WHERE is_initial_invoice = true;

COMMENT ON COLUMN invoices.is_initial_invoice IS '初回請求書フラグ（true: 初回請求書（初期費用含む）, false: 2回目以降（月額のみ））';
```

**影響する機能**:
- 契約完了フロー: 初回請求書の存在と支払い確認が必須化
- 請求書作成: 契約に紐づく初回請求書が存在しない場合は自動的に`is_initial_invoice=true`
- 月次請求書自動発行cron: 自動発行される請求書は常に`is_initial_invoice=false`

**ロールバック手順**:
```sql
-- インデックス削除
DROP INDEX IF EXISTS idx_invoices_contract_initial;

-- カラム削除
ALTER TABLE invoices DROP COLUMN IF EXISTS is_initial_invoice;
```

**適用手順**:
```bash
# テスト環境（Supabase Dashboard → SQL Editor）
# 上記SQLを実行

# 本番環境（Supabase Dashboard → SQL Editor）
# 上記SQLを実行
```

---

### 🔄 発注書管理: 仕入先マスタを取引先マスタに統合（2025-12-17）

#### 20251217000001_migrate_suppliers_to_clients.sql ✅ APPLIED

**適用日**: 2025-12-17
**適用環境**: ローカル開発環境（適用済み）
**影響範囲**: `suppliers`テーブル廃止、`purchase_orders`テーブル構造変更、`clients`テーブルへのデータ移行

**背景**:
- `suppliers`テーブルと`clients`テーブル（`client_type='supplier'`）が重複
- 顧客兼仕入先（`client_type='both'`）に対応するため統合が必要
- データの二重管理を解消し、整合性を向上

**変更内容**:
1. **purchase_ordersテーブル拡張**:
   - `client_id` (UUID NOT NULL): `supplier_id`を`client_id`に変更、`clients`テーブル参照
   - `rejected_by` (UUID): 差戻したユーザーID
   - `rejected_at` (TIMESTAMP): 差戻日時
   - `rejection_reason` (TEXT): 差戻理由
   - `internal_notes` → `internal_memo`にリネーム

2. **データマイグレーション**:
   - `suppliers`テーブルの全データ（4件）を`clients`テーブルに移行
   - `client_type='supplier'`として登録
   - `purchase_orders.supplier_id`のデータを`client_id`にコピー

3. **suppliersテーブル削除**:
   - テーブルと関連する外部キー制約を削除
   - インデックスを`idx_purchase_orders_client_id`に更新

**ロールバック手順**:
```sql
-- 注意: データロストの可能性があるため、実行前にバックアップ必須

-- 1. suppliersテーブルを再作成
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_kana VARCHAR(200),
  postal_code VARCHAR(10),
  address TEXT,
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  contact_person VARCHAR(100),
  payment_terms VARCHAR(100),
  bank_name VARCHAR(100),
  branch_name VARCHAR(100),
  account_type VARCHAR(20),
  account_number VARCHAR(20),
  account_holder VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, supplier_code)
);

-- 2. clientsからsuppliersにデータを戻す
INSERT INTO suppliers (
  organization_id, supplier_code, name, name_kana, postal_code,
  address, phone, fax, email, contact_person, payment_terms,
  bank_name, branch_name, account_type, account_number, account_holder,
  notes, is_active, created_at, updated_at
)
SELECT
  organization_id, client_code, name, name_kana, postal_code,
  address, phone, fax, email, contact_person, payment_terms,
  bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder,
  notes, is_active, created_at, updated_at
FROM clients
WHERE client_type = 'supplier';

-- 3. purchase_ordersにsupplier_idを追加
ALTER TABLE purchase_orders ADD COLUMN supplier_id UUID;

-- 4. client_idからsupplier_idにデータをコピー
UPDATE purchase_orders po
SET supplier_id = s.id
FROM clients c
JOIN suppliers s ON s.organization_id = c.organization_id AND s.supplier_code = c.client_code
WHERE po.client_id = c.id
AND c.client_type = 'supplier';

-- 5. 外部キー制約を追加
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- 6. client_idを削除
ALTER TABLE purchase_orders DROP COLUMN client_id;

-- 7. 差戻し関連カラムを削除
ALTER TABLE purchase_orders
  DROP COLUMN IF EXISTS rejected_by,
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS rejection_reason;

-- 8. internal_memoをinternal_notesに戻す
ALTER TABLE purchase_orders RENAME COLUMN internal_memo TO internal_notes;

-- 9. client_type='supplier'のレコードを削除
DELETE FROM clients WHERE client_type = 'supplier';
```

**関連ファイル**:
- `docs/PURCHASE_ORDER_SPEC.md`: 発注書管理仕様（修正方針を追記）
- `docs/DATABASE_SCHEMA.md`: データベーススキーマ（変更内容を追記）
- `app/(authenticated)/invoices/new/page.tsx`: 請求書の取引先フィルタリング修正
- `app/(authenticated)/purchase-orders/*`: 発注書フォーム（今後修正予定）

**影響範囲**:
- ✅ `clients`テーブル: 4件の仕入先データ追加（`client_type='supplier'`）
- ✅ `purchase_orders`テーブル: 構造変更（0件のデータに影響）
- ✅ `suppliers`テーブル: 削除済み
- ⚠️ 発注書作成UIは未修正（次ステップで対応）

---

### 💳 Stripe Billing統合（2025-12-12）

> **実装方式**: A方式（Invoice Item方式）
>
> - Stripe Subscriptionは使用しない
> - 毎月の請求は`/api/cron/create-monthly-invoices`で自動生成
> - 料金計算: `lib/billing/calculate-fee.ts`で動的計算
> - 完全ドキュメント: [docs/STRIPE_BILLING_A_METHOD.md](./STRIPE_BILLING_A_METHOD.md)

#### 20251212000012_stripe_integration.sql ✨NEW
```sql
-- Stripe Billing統合のためのデータベース拡張
-- organizationsテーブル拡張、stripe_events、plan_change_requests、invoice_schedulesテーブル追加
```

**適用日**: 2025-12-12
**適用環境**: 未適用（Docker起動後に実行予定）
**影響範囲**: `organizations`, `invoices`テーブルの拡張、新規テーブル3つ追加
**実装方式**: A方式（Invoice Item方式） - `docs/STRIPE_BILLING_A_METHOD.md`参照

**変更内容**:
1. **organizationsテーブル拡張**:
   - `stripe_customer_id` (TEXT UNIQUE): Stripe Customer ID
   - `stripe_subscription_id` (TEXT): Stripe Subscription ID
   - `billing_cycle_day` (INTEGER): 毎月の請求日（1-28）
   - `initial_setup_fee_paid` (BOOLEAN): 初回導入費用支払済みフラグ
   - `payment_method` (TEXT): 支払方法（invoice/card）

2. **stripe_eventsテーブル作成**:
   - Stripe Webhookイベントの記録
   - 重複処理防止とリトライ管理

3. **plan_change_requestsテーブル作成**:
   - プラン変更申請の管理
   - アップグレード・ダウングレード対応

4. **invoice_schedulesテーブル作成**:
   - 次回請求スケジュールの管理
   - 請求日・金額の追跡

5. **Row Level Security (RLS)**:
   - 全テーブルにRLSを設定
   - 組織単位のアクセス制御

6. **invoicesテーブル拡張**:
   - `stripe_invoice_id` (TEXT UNIQUE): Stripe Invoice IDとの連携

**ロールバック手順**:
```sql
-- テーブル削除
DROP TABLE IF EXISTS invoice_schedules CASCADE;
DROP TABLE IF EXISTS plan_change_requests CASCADE;
DROP TABLE IF EXISTS stripe_events CASCADE;

-- organizationsテーブルのカラム削除
ALTER TABLE organizations
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS billing_cycle_day,
  DROP COLUMN IF EXISTS initial_setup_fee_paid,
  DROP COLUMN IF EXISTS payment_method;

-- invoicesテーブルのカラム削除
ALTER TABLE invoices
  DROP COLUMN IF EXISTS stripe_invoice_id;
```

**関連ファイル**:
- `lib/stripe/client.ts`: Stripe Client初期化
- `app/api/stripe/customers/create/route.ts`: Customer作成API
- `app/api/stripe/subscriptions/create/route.ts`: Subscription作成API
- `app/api/webhooks/stripe/route.ts`: Webhook受信エンドポイント
- `scripts/setup-stripe-products.ts`: Products & Prices作成スクリプト

---

#### 20251212000014_add_stripe_to_contracts.sql ✨NEW
```sql
-- contractsテーブルにStripe Billing関連カラムを追加
-- 請求日、月額料金、パッケージ情報、初期費用・割引を管理
```

**適用日**: 2025-12-12
**適用環境**: ローカル開発環境（適用済み）
**影響範囲**: `contracts`テーブルに9カラム追加

**変更内容**:
1. **contractsテーブル拡張**:
   - `stripe_customer_id` (TEXT): Stripe Customer ID
   - `billing_day` (INTEGER): 毎月の請求日（1-28、デフォルト1）
   - `monthly_base_fee` (NUMERIC(10, 2)): 月額基本料金
   - `has_both_packages` (BOOLEAN): 現場資産+DX効率化パック両方選択フラグ
   - `initial_fee` (NUMERIC(10, 2)): 初期導入費用（デフォルト0）
   - `first_month_discount` (NUMERIC(10, 2)): 初月割引額（デフォルト0）
   - `user_count` (INTEGER): ユーザー数（デフォルト10）
   - `has_asset_package` (BOOLEAN): 現場資産パック選択フラグ
   - `has_dx_efficiency_package` (BOOLEAN): DX効率化パック選択フラグ

**ロールバック手順**:
```sql
ALTER TABLE contracts
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS billing_day,
  DROP COLUMN IF EXISTS monthly_base_fee,
  DROP COLUMN IF EXISTS has_both_packages,
  DROP COLUMN IF EXISTS initial_fee,
  DROP COLUMN IF EXISTS first_month_discount,
  DROP COLUMN IF EXISTS user_count,
  DROP COLUMN IF EXISTS has_asset_package,
  DROP COLUMN IF EXISTS has_dx_efficiency_package;
```

---

#### 20251212000015_add_stripe_columns_to_invoices.sql ✨NEW
```sql
-- invoicesテーブルにStripe Billing連携カラムを追加
-- 請求タイプ、支払ステータス、決済方法を管理
```

**適用日**: 2025-12-12
**適用環境**: ローカル開発環境（適用済み）
**影響範囲**: `invoices`テーブルに4カラム追加

**変更内容**:
1. **invoicesテーブル拡張**:
   - `invoice_type` (TEXT): 請求タイプ（manual/stripe、デフォルトstripe）
   - `payment_status` (TEXT): 支払ステータス（unpaid/paid/failed/pending、デフォルトunpaid）
   - `payment_method` (TEXT): 支払方法（invoice/card）
   - `stripe_payment_intent_id` (TEXT): Stripe Payment Intent ID

**ロールバック手順**:
```sql
ALTER TABLE invoices
  DROP COLUMN IF EXISTS invoice_type,
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS stripe_payment_intent_id;
```

---

#### 20251212000013_add_reminder_sent_flag.sql ✨NEW
```sql
-- invoice_schedulesテーブルにreminder_sentフラグを追加
-- リマインダーメール送信の重複防止のため
```

**適用日**: 2025-12-12
**適用環境**: 未適用（Docker起動後に実行予定）
**影響範囲**: `invoice_schedules`テーブルにカラム追加、トリガー追加

**変更内容**:
1. **invoice_schedulesテーブル拡張**:
   - `reminder_sent` (BOOLEAN DEFAULT false): 請求書発行前リマインダーメール送信済みフラグ

2. **トリガー追加**:
   - `reset_reminder_sent_on_date_change()`: next_invoice_dateが変更されたらreminder_sentをfalseにリセット
   - リマインダーメールの重複送信を防ぐ

**ロールバック手順**:
```sql
-- トリガー削除
DROP TRIGGER IF EXISTS reset_reminder_sent_trigger ON invoice_schedules;
DROP FUNCTION IF EXISTS reset_reminder_sent_on_date_change();

-- カラム削除
ALTER TABLE invoice_schedules
  DROP COLUMN IF EXISTS reminder_sent;
```

**関連ファイル**:
- `app/api/cron/send-invoice-reminders/route.ts`: リマインダーメール送信cron
- `lib/email/invoice.ts`: sendInvoiceReminderEmail()関数
- `vercel.json`: Vercel Cron設定（毎日9:00実行）

---

### 🔒 セキュリティ: スーパーアドミンテーブルRLS有効化（2025-12-09）

#### 20251209000002_enable_super_admins_rls.sql ✅ APPLIED
```sql
-- Enable RLS on super_admins table for security
-- This prevents unauthorized access to super admin data via anon/authenticated roles
-- Only Service Role Key can access this table

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: Deny all access to anon and authenticated users
CREATE POLICY "super_admins_no_access"
ON super_admins
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);

-- Enable RLS on super_admin_logs table
ALTER TABLE super_admin_logs ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: Deny all access to anon and authenticated users
CREATE POLICY "super_admin_logs_no_access"
ON super_admin_logs
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);
```

**適用日**: 2025-12-09
**適用環境**: ローカル開発環境
**影響範囲**: `super_admins`, `super_admin_logs` テーブル
**セキュリティ**: 🔒 高（システム管理者情報の保護）

**変更内容**:
- `super_admins`テーブルにRLSを有効化
- `super_admin_logs`テーブルにRLSを有効化
- anon/authenticatedロールからのアクセスを完全に拒否
- Service Role Keyのみがアクセス可能（RLSをバイパス）

**ロールバック手順**:
```sql
-- RLSポリシーを削除
DROP POLICY IF EXISTS "super_admins_no_access" ON super_admins;
DROP POLICY IF EXISTS "super_admin_logs_no_access" ON super_admin_logs;

-- RLSを無効化（非推奨）
ALTER TABLE super_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_logs DISABLE ROW LEVEL SECURITY;
```

---

### Phase 10: 取引先マスタ追加（2025-12-05）

#### 20250105000010_create_clients_master.sql ✨NEW
```sql
-- 取引先マスタテーブル作成
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  code TEXT NOT NULL, -- 取引先コード（例: CL-0001）
  name TEXT NOT NULL, -- 取引先名
  name_kana TEXT, -- フリガナ
  short_name TEXT, -- 略称

  -- 取引先分類
  client_type TEXT NOT NULL CHECK (client_type IN ('customer', 'supplier', 'partner', 'both')),
  industry TEXT, -- 業種

  -- 連絡先情報
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  website TEXT,

  -- 担当者情報
  contact_person TEXT,
  contact_department TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- 取引条件
  payment_terms TEXT,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'cash', 'check', 'credit', 'other')),
  payment_due_days INTEGER DEFAULT 30,

  -- 銀行情報
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_type TEXT CHECK (bank_account_type IN ('savings', 'current', 'other')),
  bank_account_number TEXT,
  bank_account_holder TEXT,

  -- 財務情報
  credit_limit DECIMAL(15, 2),
  current_balance DECIMAL(15, 2) DEFAULT 0,

  -- 税務情報
  tax_id TEXT,
  tax_registration_number TEXT, -- インボイス登録番号
  is_tax_exempt BOOLEAN DEFAULT false,

  -- 取引実績
  first_transaction_date DATE,
  last_transaction_date DATE,
  total_transaction_count INTEGER DEFAULT 0,
  total_transaction_amount DECIMAL(15, 2) DEFAULT 0,

  -- 評価・メモ
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  internal_notes TEXT,

  -- ステータス
  is_active BOOLEAN DEFAULT true,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- 制約
  UNIQUE(organization_id, code),
  UNIQUE(organization_id, name)
);

-- インデックス作成
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_code ON clients(organization_id, code);
CREATE INDEX idx_clients_name ON clients(organization_id, name);
CREATE INDEX idx_clients_client_type ON clients(client_type);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_clients_last_transaction_date ON clients(last_transaction_date DESC) WHERE last_transaction_date IS NOT NULL;

-- RLS有効化
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "clients_isolation_policy"
    ON clients
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- 現場テーブルに取引先参照追加
ALTER TABLE sites ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id);

-- 取引先コード自動生成テーブル
CREATE TABLE IF NOT EXISTS client_code_sequences (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    last_number INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 取引先コード生成関数
CREATE OR REPLACE FUNCTION generate_client_code(org_id UUID, prefix TEXT DEFAULT 'CL')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_number INTEGER;
    new_code TEXT;
BEGIN
    INSERT INTO client_code_sequences (organization_id, last_number)
    VALUES (org_id, 1)
    ON CONFLICT (organization_id)
    DO UPDATE SET
        last_number = client_code_sequences.last_number + 1,
        updated_at = NOW()
    RETURNING last_number INTO next_number;

    new_code := prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN new_code;
END;
$$;

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();
```

**適用日**: 2025-12-05
**ステータス**: ✅ 完了
**対象環境**: ローカル開発環境
**ロールバック手順**:
```sql
-- トリガー削除
DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
DROP FUNCTION IF EXISTS update_clients_updated_at();

-- 関数削除
DROP FUNCTION IF EXISTS generate_client_code(UUID, TEXT);

-- テーブル削除
DROP TABLE IF EXISTS client_code_sequences;

-- 現場テーブルから取引先参照削除
ALTER TABLE sites DROP COLUMN IF EXISTS client_id;

-- 取引先マスタ削除
DROP TABLE IF EXISTS clients CASCADE;
```

**変更内容**:
- 取引先マスタテーブル（clients）作成
- 現場テーブル（sites）に取引先参照（client_id）追加
- 取引先コード自動生成機能追加
- RLSポリシー設定

**今後の使用用途**:
- 現場の発注者・元請け企業管理
- 見積書・請求書・領収書発行
- 売上管理・支払い管理
- 作業報告書発行

---

### Phase 1: 基盤構築（2025-12-01 〜）

#### 20251201120000_create_organizations_table.sql
```sql
-- 組織テーブル作成
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
  payment_method TEXT DEFAULT 'invoice',
  max_users INTEGER DEFAULT 20,
  max_tools INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE organizations CASCADE;

---

#### 20251201120100_create_users_table.sql
```sql
-- ユーザーテーブル作成
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'leader', 'admin', 'super_admin')),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE users CASCADE;

---

#### 20251201120200_create_tools_table.sql
```sql
-- 道具テーブル作成
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_code TEXT NOT NULL,
  category_id UUID REFERENCES tool_categories(id),
  name TEXT NOT NULL,
  model_number TEXT,
  manufacturer TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'repair', 'broken', 'disposed')),
  current_location_id UUID REFERENCES locations(id),
  management_type TEXT DEFAULT 'individual' CHECK (management_type IN ('individual', 'quantity')),
  current_quantity INTEGER DEFAULT 1,
  unit TEXT,
  custom_fields JSONB DEFAULT '{}',
  min_stock_alert INTEGER,
  photo_url TEXT,
  manual_url TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, tool_code)
);

CREATE INDEX idx_tools_organization_id ON tools(organization_id);
CREATE INDEX idx_tools_tool_code ON tools(organization_id, tool_code);
CREATE INDEX idx_tools_category_id ON tools(category_id);
CREATE INDEX idx_tools_current_location_id ON tools(current_location_id);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_deleted_at ON tools(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE tools CASCADE;

---

#### 20251201120300_create_locations_table.sql
```sql
-- 場所テーブル作成
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('company', 'site')),
  name TEXT NOT NULL,
  address TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_organization_id ON locations(organization_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_deleted_at ON locations(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE locations CASCADE;

---

#### 20251201120400_create_tool_categories_table.sql
```sql
-- 道具カテゴリテーブル作成
CREATE TABLE tool_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_prefix TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, code_prefix)
);

CREATE INDEX idx_tool_categories_organization_id ON tool_categories(organization_id);
CREATE INDEX idx_tool_categories_display_order ON tool_categories(display_order);

ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE tool_categories CASCADE;

---

#### 20251201120500_create_tool_movements_table.sql
```sql
-- 移動履歴テーブル作成
CREATE TABLE tool_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('checkout', 'checkin', 'transfer')),
  quantity INTEGER DEFAULT 1,
  note TEXT,
  moved_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tool_movements_organization_id ON tool_movements(organization_id);
CREATE INDEX idx_tool_movements_tool_id ON tool_movements(tool_id);
CREATE INDEX idx_tool_movements_user_id ON tool_movements(user_id);
CREATE INDEX idx_tool_movements_moved_at ON tool_movements(moved_at DESC);
CREATE INDEX idx_tool_movements_deleted_at ON tool_movements(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE tool_movements ENABLE ROW LEVEL SECURITY;
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE tool_movements CASCADE;

---

#### 20251201120600_create_audit_logs_table.sql
```sql
-- 監査ログテーブル作成
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: DROP TABLE audit_logs CASCADE;

---

#### 20251201120700_add_rls_policies.sql
```sql
-- RLSポリシー追加

-- tools
CREATE POLICY "tools_select_own_org" ON tools FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "tools_insert_own_org" ON tools FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tools_update_own_org" ON tools FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tools_delete_own_org" ON tools FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- users
CREATE POLICY "users_select_own_org" ON users FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "users_insert_own_org" ON users FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "users_update_own_org" ON users FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- tool_movements
CREATE POLICY "movements_select_own_org" ON tool_movements FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "movements_insert_own_org" ON tool_movements FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- locations
CREATE POLICY "locations_select_own_org" ON locations FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "locations_insert_own_org" ON locations FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- audit_logs (管理者のみ)
CREATE POLICY "audit_logs_admin_only" ON audit_logs FOR SELECT
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
```

**適用日**: 未実施
**ステータス**: 準備中
**ロールバック**: 各ポリシーをDROP POLICY

---

#### 20250102_add_enable_low_stock_alert_to_tools.sql
```sql
-- toolsテーブルに個別の低在庫アラート設定を追加
ALTER TABLE tools
ADD COLUMN enable_low_stock_alert BOOLEAN DEFAULT true;

COMMENT ON COLUMN tools.enable_low_stock_alert IS '低在庫アラートの有効/無効（組織設定でアラートがONの場合にのみ有効）';
```

**適用日**: 2025-12-02
**ステータス**: ✅ 適用済み
**ロールバック**:
```sql
ALTER TABLE tools DROP COLUMN enable_low_stock_alert;
```

**説明**:
- 組織設定の`enable_low_stock_alert`がONの場合、各道具個別にアラートのON/OFFを切り替えられる機能を追加
- 新規登録時・編集時の両方で設定可能
- デフォルト値は`true`（アラート有効）

---

#### 20250102000019_create_notifications.sql
```sql
-- 通知履歴テーブルの作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 通知内容
  type TEXT NOT NULL CHECK (type IN (
    'low_stock', 'unreturned_tool', 'monthly_inventory', 'maintenance_due',
    'tool_created', 'tool_updated', 'tool_deleted', 'user_invited',
    'contract_expiring', 'system_announcement'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),

  -- 関連データ
  related_tool_id UUID REFERENCES tools(id),
  related_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',

  -- ステータス
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  read_by UUID REFERENCES users(id),

  -- 送信情報
  sent_via TEXT[] DEFAULT ARRAY['in_app'],
  sent_at TIMESTAMP DEFAULT NOW(),

  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- インデックス、RLSポリシー作成（省略）
```

**適用日**: 2025-12-02
**ステータス**: ✅ 適用済み
**ロールバック**:
```sql
DROP TABLE notifications;
```

**説明**:
- 通知履歴機能を追加（監査ログ Issue #10 の一部として実装）
- 低在庫アラート、道具登録、月次棚卸しなど10種類の通知タイプに対応
- アプリ内通知・メール通知・Slack通知の記録
- 既読/未読管理機能
- 通知一覧画面とヘッダー通知アイコンで利用

**目的**:
- ユーザーが見逃した通知を後から確認可能に
- 業務フローの追跡（低在庫→発注、未返却→回収）
- 監査・コンプライアンス対応

---

### Phase 2: 機能拡張（未定）

#### 20251215000000_create_contracts_table.sql
```sql
-- 契約管理テーブル作成（Phase 2以降）
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE NOT NULL,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('monthly', 'annual')),
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  monthly_fee DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  billing_contact_phone TEXT,
  billing_address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**適用日**: 未実施
**ステータス**: 計画中
**ロールバック**: DROP TABLE contracts CASCADE;

---

#### 20251215000100_create_invoices_table.sql
```sql
-- 請求書テーブル作成（Phase 2以降）
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  sent_date TIMESTAMP,
  paid_date TIMESTAMP,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**適用日**: 未実施
**ステータス**: 計画中
**ロールバック**: DROP TABLE invoices CASCADE;

---

## 4. ロールバック手順

### 4.1 最新のマイグレーションをロールバック

```bash
# Supabase CLI
npx supabase migration repair <version> --status reverted

# 手動ロールバック（SQLファイル実行）
psql $DATABASE_URL -f supabase/migrations/<version>_rollback.sql
```

### 4.2 特定のバージョンまでロールバック

```bash
# 目標バージョンを指定
npx supabase db reset --version <target_version>
```

### 4.3 完全リセット（開発環境のみ）

```bash
# ローカル環境リセット
npx supabase db reset

# Docker完全リセット
docker-compose down -v
docker-compose up -d
npx supabase db push
```

---

## 5. トラブルシューティング

### 5.1 マイグレーションが失敗する

**問題**: マイグレーション実行時にエラー

**解決策**:
```bash
# エラーログ確認
npx supabase db logs

# マイグレーション状態確認
npx supabase migration list

# 問題のマイグレーションをスキップ（慎重に）
npx supabase migration repair <version> --status applied
```

### 5.2 RLSポリシーが適用されない

**問題**: データが見えない / 操作できない

**解決策**:
```sql
-- RLS状態確認
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ポリシー確認
SELECT * FROM pg_policies WHERE tablename = 'tools';

-- 一時的にRLS無効化（開発環境のみ）
ALTER TABLE tools DISABLE ROW LEVEL SECURITY;
```

### 5.3 外部キー制約エラー

**問題**: 関連データが存在するため削除できない

**解決策**:
```sql
-- 関連データ確認
SELECT * FROM tool_movements WHERE tool_id = 'xxx';

-- カスケード削除設定確認
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'tools';
```

### 5.4 インデックスのパフォーマンス問題

**問題**: クエリが遅い

**解決策**:
```sql
-- インデックス使用状況確認
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- 不要なインデックス削除
DROP INDEX IF EXISTS <unused_index_name>;

-- 新しいインデックス追加
CREATE INDEX CONCURRENTLY idx_name ON table_name(column_name);
```

---

## 参照ドキュメント

- **スキーマ定義**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **環境セットアップ**: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
- **全体仕様**: [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md)

---

## ベストプラクティス

### ✅ DO
- マイグレーションは小さく分割
- 必ずテスト環境で先に実行
- 本番適用前にバックアップ取得
- ロールバックスクリプトを用意
- マイグレーション実行ログを記録

### ❌ DON'T
- 本番環境で直接SQL実行
- 大量データの一括変更を1回で実施
- マイグレーションファイルを手動編集
- ロールバック手順なしで実行
- データ損失リスクのある操作を承認なしで実行

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-01 | 1.0.0 | 初版作成（マイグレーション管理体制確立） |

---

## マイグレーション #17: 組織セットアップ機能（業種マスタ・組織設定）

### 実行日時
2025-01-02

### ファイル名
`20250102_add_organization_settings_and_industry.sql`

### 目的
- 組織の初回セットアップ機能を実装
- 建設業の業種分類マスタテーブルを追加
- 組織ごとの運用設定を管理するテーブルを追加
- organizationsテーブルに組織情報カラムを追加

### 変更内容

#### 1. industry_categoriesテーブル作成

```sql
CREATE TABLE industry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES industry_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_industry_categories_parent ON industry_categories(parent_id);
CREATE INDEX idx_industry_categories_sort ON industry_categories(sort_order);
```

**初期データ:**
- 大分類4種（土木・基礎、建築・構造、内装・仕上、設備・インフラ）
- 中分類22種（各大分類配下に5〜7業種）

#### 2. organization_settingsテーブル作成

```sql
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enable_low_stock_alert BOOLEAN DEFAULT true,
  default_minimum_stock_level INTEGER DEFAULT 5,
  require_checkout_approval BOOLEAN DEFAULT false,
  require_return_approval BOOLEAN DEFAULT false,
  enable_email_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,
  theme VARCHAR(20) DEFAULT 'light',
  custom_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX idx_organization_settings_org ON organization_settings(organization_id);
```

#### 3. organizationsテーブルにカラム追加

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS representative_name VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry_category_id UUID REFERENCES industry_categories(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry_category_id);
CREATE INDEX IF NOT EXISTS idx_organizations_setup ON organizations(setup_completed_at);
```

#### 4. RLSポリシー設定

```sql
-- industry_categories: 全認証ユーザーが参照可能
ALTER TABLE industry_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Industry categories are viewable by all authenticated users"
  ON industry_categories FOR SELECT TO authenticated USING (true);

-- organization_settings: 自組織のみアクセス、管理者のみ変更可能
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own organization settings"
  ON organization_settings FOR SELECT TO authenticated
  USING (organization_id = get_organization_id());

CREATE POLICY "Admins can insert their organization settings"
  ON organization_settings FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_organization_id() AND
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.organization_id = get_organization_id() AND users.role = 'admin')
  );

CREATE POLICY "Admins can update their organization settings"
  ON organization_settings FOR UPDATE TO authenticated
  USING (organization_id = get_organization_id() AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.organization_id = get_organization_id() AND users.role = 'admin'))
  WITH CHECK (organization_id = get_organization_id());
```

#### 5. 更新日時トリガー

```sql
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();

CREATE TRIGGER trigger_update_industry_categories_updated_at
  BEFORE UPDATE ON industry_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();
```

### 影響範囲
- 既存の組織データ: `setup_completed_at`がNULLなので初回セットアップが必要
- 既存ユーザー: 管理者が初回ログイン時に`/onboarding`にリダイレクトされる
- 新規組織: セットアップウィザードで組織情報・運用設定を入力

### ロールバック手順

```sql
-- トリガー削除
DROP TRIGGER IF EXISTS trigger_update_organization_settings_updated_at ON organization_settings;
DROP TRIGGER IF EXISTS trigger_update_industry_categories_updated_at ON industry_categories;
DROP FUNCTION IF EXISTS update_organization_settings_updated_at();

-- テーブル削除
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS industry_categories CASCADE;

-- organizationsテーブルのカラム削除
ALTER TABLE organizations DROP COLUMN IF EXISTS representative_name;
ALTER TABLE organizations DROP COLUMN IF EXISTS phone;
ALTER TABLE organizations DROP COLUMN IF EXISTS postal_code;
ALTER TABLE organizations DROP COLUMN IF EXISTS address;
ALTER TABLE organizations DROP COLUMN IF EXISTS industry_category_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS setup_completed_at;
```

### テスト確認項目
- [ ] industry_categoriesテーブルに大分類4種・中分類22種が登録されている
- [ ] 業種の親子関係が正しく設定されている
- [ ] 管理者が初回ログイン時に`/onboarding`にリダイレクトされる
- [ ] 4ステップウィザードで組織情報を入力できる
- [ ] セットアップ完了後、`organizations.setup_completed_at`が設定される
- [ ] セットアップ完了後、`organization_settings`が作成される
- [ ] 選択したカテゴリーが`categories`テーブルに登録される
- [ ] RLSポリシーが正しく動作（他組織の設定は見えない）
- [ ] 管理者以外はorganization_settingsを変更できない

### 関連Issue
- GitHub Issue #35: 🚀 本番環境移行タスク

### 関連ドキュメント
- `docs/DATABASE_SCHEMA.md` - テーブル定義詳細
- `docs/DEVELOPMENT_MULTITENANT.md` - 開発環境でのマルチテナント機能テスト手順
- `docs/SPECIFICATION_SAAS_FINAL.md` - Phase 5本番移行タスク


---

## 実装履歴：初回セットアップ機能の改善

### 実施日時
2025-01-02 (機能拡張)

### 変更内容

既存の初回セットアップ機能に以下の改善を実施しました。

#### 1. 業種複数選択への対応

**データベース変更:** なし（既存構造を活用）

**保存方法の変更:**
```sql
-- organizations.industry_category_id には最初の業種のみ保存（既存カラム）
UPDATE organizations 
SET industry_category_id = '選択された業種の最初のID'
WHERE id = 'organization_id';

-- organization_settings.custom_settings に全業種を保存
UPDATE organization_settings
SET custom_settings = jsonb_set(
  custom_settings,
  '{selected_industries}',
  '["uuid1", "uuid2", "uuid3"]'::jsonb
)
WHERE organization_id = 'organization_id';
```

**データ取得例:**
```sql
-- 組織の全選択業種を取得
SELECT 
  o.name,
  o.industry_category_id,  -- 代表業種
  os.custom_settings->>'selected_industries' as all_industries  -- 全業種
FROM organizations o
LEFT JOIN organization_settings os ON os.organization_id = o.id
WHERE o.id = 'organization_id';
```

#### 2. 在庫単位のデフォルト値保存

**データベース変更:** なし（custom_settingsのJSONBを活用）

**保存方法:**
```sql
-- デフォルト在庫単位をcustom_settingsに保存
UPDATE organization_settings
SET custom_settings = jsonb_set(
  custom_settings,
  '{default_stock_unit}',
  '"L"'::jsonb
)
WHERE organization_id = 'organization_id';
```

**データ取得例:**
```sql
-- 組織のデフォルト在庫単位を取得
SELECT 
  custom_settings->>'default_stock_unit' as default_unit
FROM organization_settings
WHERE organization_id = 'organization_id';

-- 結果: "L"
```

#### 3. custom_settingsのスキーマ定義

**推奨JSON構造:**
```json
{
  "default_stock_unit": "L",
  "selected_industries": [
    "uuid-industry-1",
    "uuid-industry-2",
    "uuid-industry-3"
  ],
  "future_extensions": {
    "custom_feature": "value"
  }
}
```

#### 4. API実装の変更

**ファイル:** `app/api/onboarding/complete/route.ts`

**変更点:**
- 複数業種IDの保存ロジック追加
- エラーハンドリングの詳細化
- custom_settingsへの単位情報保存

```typescript
// 変更後のコード
const customSettings = {
  default_stock_unit: formData.defaultStockUnit,
  selected_industries: formData.industryCategoryIds,
}

await supabase.from('organization_settings').upsert({
  organization_id: organizationId,
  custom_settings: customSettings,
  // ...
})
```

### ロールバック手順

**custom_settingsの初期化:**
```sql
-- デフォルト値に戻す
UPDATE organization_settings
SET custom_settings = '{}'::jsonb
WHERE organization_id = 'organization_id';
```

**organizationsテーブルの初期化:**
```sql
-- セットアップ完了フラグをリセット
UPDATE organizations
SET setup_completed_at = NULL
WHERE id = 'organization_id';
```

### テスト確認項目

- [ ] 郵便番号検索で正しい住所が取得できる
- [ ] 業種を複数選択できる（チェックボックス）
- [ ] 選択した業種数が表示される
- [ ] 在庫単位を選択できる（13種類）
- [ ] セットアップ完了後、custom_settingsに正しく保存される
- [ ] セットアップ完了後、ダッシュボード（/）にリダイレクトされる
- [ ] エラー発生時に詳細なログが出力される

### 影響範囲

**UIコンポーネント:**
- `components/onboarding/Step1OrganizationInfo.tsx` - 郵便番号検索、業種複数選択
- `components/onboarding/Step2OperationSettings.tsx` - 単位選択
- `components/onboarding/OnboardingWizard.tsx` - リダイレクト先修正

**API:**
- `app/api/onboarding/complete/route.ts` - 保存ロジック改善

**型定義:**
- `types/organization.ts` - OnboardingFormData更新

### 関連ドキュメント

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベース設計詳細
- [UI_DESIGN.md](./UI_DESIGN.md) - UI設計仕様


---

## 20250102000017_add_other_industry_categories.sql

### ファイル名
`20250102000017_add_other_industry_categories.sql`

### 適用日
2025-12-02

### 目的
- 各大分類に「その他」業種を追加
- 業種選択UIで予期しない業種に対応できるようにする

### 変更内容

```sql
-- 各大分類に「その他」業種を追加
-- 土木・基礎 > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'その他', 'Other', 99, true);

-- 建築・構造 > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'その他', 'Other', 99, true);

-- 内装・仕上 > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('33333333-3333-3333-3333-333333333333', 'その他', 'Other', 99, true);

-- 設備・インフラ > その他
INSERT INTO industry_categories (parent_id, name, name_en, sort_order, is_active)
VALUES ('44444444-4444-4444-4444-444444444444', 'その他', 'Other', 99, true);
```

### ロールバック手順

```sql
-- 「その他」業種を削除
DELETE FROM industry_categories 
WHERE name = 'その他' AND name_en = 'Other';
```

### 影響範囲

- 業種選択UI: 各大分類で「その他」が選択可能になる
- sort_order=99で最後尾に表示される

---

## オンボーディングUI改善（2025-12-02）

### 変更内容サマリー

#### 1. 業種選択UIの改善

**全選択ボタン追加:**
- 詳細業種エリアに「全選択/全解除」ボタンを実装
- 全業種を一括選択・解除可能

**「その他」業種追加:**
- マイグレーション`20250102000017`で各大分類に追加済み

**大分類の制限:**
- ドロップダウンで1つのみ選択可能（既存仕様維持）
- 説明文追加: 「貴社の主要業種分類を1つ選択し、該当する詳細業種を複数選択できます」

#### 2. 在庫単位設計の変更

**削除した機能:**
- ステップ2の「デフォルト在庫単位」設定
- ステップ2の「デフォルト最小在庫レベル」入力
- `OnboardingFormData.defaultStockUnit`フィールド
- `OnboardingFormData.defaultMinimumStockLevel`フィールド

**理由:**
組織全体のデフォルト単位では、品目ごとに異なる単位に対応できない
- 手袋 → 5個
- ペンキ → 2L
- 接着剤 → 500ml
- セメント → 25kg

**新しい設計方針:**
道具・消耗品マスタに`stock_unit`と`minimum_stock`カラムを追加し、品目ごとに設定

#### 3. エラー修正

**organization_settings重複エラー:**
```typescript
// Before
await supabase.from('organization_settings').upsert({ ... })

// After
await supabase.from('organization_settings').upsert(
  { ... },
  { onConflict: 'organization_id' }  // 既存レコードがあれば更新
)
```

**リダイレクト先修正:**
```typescript
// app/onboarding/page.tsx
// Before: redirect('/dashboard')  ← 404エラー
// After: redirect('/')  ← ホームページ
```

### 更新ファイル

- `types/organization.ts` - defaultStockUnit, defaultMinimumStockLevel削除
- `components/onboarding/OnboardingWizard.tsx` - 初期値から削除
- `components/onboarding/Step1OrganizationInfo.tsx` - 全選択ボタン追加
- `components/onboarding/Step2OperationSettings.tsx` - 単位設定削除、説明文追加
- `app/api/onboarding/complete/route.ts` - upsert修正、default_stock_unit削除
- `app/onboarding/page.tsx` - リダイレクト先を`/`に変更

### テスト確認項目（更新版）

- [ ] 業種選択で「全選択」ボタンをクリック → 全業種が選択される
- [ ] 「全解除」ボタンをクリック → 全解除される
- [ ] 各大分類に「その他」業種が表示される
- [ ] ステップ2に在庫単位設定がない（削除済み）
- [ ] セットアップ完了ボタン → エラーなく完了
- [ ] 完了後、`/`にリダイレクトされる（404にならない）
- [ ] `custom_settings.selected_industries`に業種ID配列が保存される
- [ ] `custom_settings.default_stock_unit`が保存されない（削除済み）

### custom_settingsスキーマ（更新版）

```json
{
  "selected_industries": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
  // default_stock_unitは削除済み
}
```

---

### Phase 7: 重機管理機能（2025-12-03 〜）

#### 20251203000001_create_heavy_equipment_tables.sql

重機管理機能の基盤となる4つのテーブルを作成。

**作成テーブル:**
1. `heavy_equipment_categories` - 重機カテゴリマスタ
2. `heavy_equipment` - 重機マスタ
3. `heavy_equipment_usage_records` - 使用記録
4. `heavy_equipment_maintenance` - 点検記録

```sql
-- 1. 重機カテゴリテーブル
CREATE TABLE IF NOT EXISTS heavy_equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_prefix TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- システム標準カテゴリ8種類を投入
INSERT INTO heavy_equipment_categories (name, code_prefix, icon, sort_order) VALUES
('バックホウ・油圧ショベル', 'BH', 'excavator', 10),
('ホイールローダー', 'WL', 'loader', 20),
('ダンプトラック', 'DT', 'truck', 30),
('クレーン車', 'CR', 'crane', 40),
('高所作業車', 'AW', 'aerial', 50),
('フォークリフト', 'FL', 'forklift', 60),
('ローラー・締固め機械', 'RL', 'roller', 70),
('その他', 'OT', 'other', 99);

-- 2. 重機マスタテーブル（最重要: 所有形態管理）
CREATE TABLE IF NOT EXISTS heavy_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  equipment_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES heavy_equipment_categories(id),
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  registration_number TEXT,

  -- 所有形態（最重要）
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('owned', 'leased', 'rented')),
  supplier_company TEXT,
  contract_number TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_cost DECIMAL(10, 2),
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),

  -- ステータス
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_service')),
  current_location_id UUID REFERENCES sites(id),
  current_user_id UUID REFERENCES users(id),

  -- 車検管理（必須）
  requires_vehicle_inspection BOOLEAN DEFAULT false,
  vehicle_inspection_date DATE,
  vehicle_inspection_reminder_days INTEGER DEFAULT 60,

  -- 保険管理（必須）
  insurance_company TEXT,
  insurance_policy_number TEXT,
  insurance_start_date DATE,
  insurance_end_date DATE,
  insurance_reminder_days INTEGER DEFAULT 60,

  -- メーター管理（オプション）
  enable_hour_meter BOOLEAN DEFAULT false,
  current_hour_meter DECIMAL(10, 1),

  -- 添付・メタ
  photo_url TEXT,
  qr_code TEXT UNIQUE,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, equipment_code)
);

-- 3. 使用記録テーブル
CREATE TABLE IF NOT EXISTS heavy_equipment_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES heavy_equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('checkout', 'checkin', 'transfer')),
  from_location_id UUID REFERENCES sites(id),
  to_location_id UUID REFERENCES sites(id),
  hour_meter_reading DECIMAL(10, 1),
  action_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 点検記録テーブル
CREATE TABLE IF NOT EXISTS heavy_equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES heavy_equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('vehicle_inspection', 'insurance_renewal', 'repair', 'other')),
  maintenance_date DATE NOT NULL,
  performed_by TEXT,
  cost DECIMAL(10, 2),
  next_date DATE,
  receipt_url TEXT,
  report_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSポリシー設定（4テーブルすべて）
ALTER TABLE heavy_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE heavy_equipment_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE heavy_equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- 各テーブルにSELECT/INSERT/UPDATE/DELETEポリシーを設定
-- 詳細はマイグレーションファイル参照
```

**インデックス作成:**
- `idx_heavy_equipment_org` - 組織ID
- `idx_heavy_equipment_code` - 組織ID + コード
- `idx_heavy_equipment_qr` - QRコード
- `idx_heavy_equipment_status` - ステータス
- `idx_heavy_equipment_ownership` - 所有形態
- `idx_heavy_equipment_vehicle_inspection` - 車検期日
- `idx_heavy_equipment_insurance_expiry` - 保険期限

**トリガー:**
- `trigger_update_heavy_equipment_updated_at` - updated_at自動更新

**適用日**: 2025-12-03
**ステータス**: ✅ 完了
**環境**: ローカル開発環境（Supabase Local）

**ロールバック手順:**
```sql
DROP TABLE IF EXISTS heavy_equipment_maintenance CASCADE;
DROP TABLE IF EXISTS heavy_equipment_usage_records CASCADE;
DROP TABLE IF EXISTS heavy_equipment CASCADE;
DROP TABLE IF EXISTS heavy_equipment_categories CASCADE;
DROP FUNCTION IF EXISTS update_heavy_equipment_updated_at();
```

---

#### 20251203000002_add_heavy_equipment_settings.sql

組織設定に重機管理機能のON/OFF設定とオプション設定を追加。

```sql
-- organizationsテーブルに重機管理設定を追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS heavy_equipment_enabled BOOLEAN DEFAULT false;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS heavy_equipment_settings JSONB DEFAULT '{
  "enable_hour_meter": false,
  "enable_fuel_tracking": false,
  "vehicle_inspection_alert_days": 60,
  "insurance_alert_days": 60,
  "enable_operator_license_check": false
}'::jsonb;

COMMENT ON COLUMN organizations.heavy_equipment_enabled
IS '重機管理機能の有効/無効';

COMMENT ON COLUMN organizations.heavy_equipment_settings
IS '重機管理のオプション設定（メーター管理、燃料管理等）';
```

**追加カラム:**
- `heavy_equipment_enabled` - 機能の有効/無効フラグ
- `heavy_equipment_settings` - JSONB形式のオプション設定
  - `enable_hour_meter` - メーター管理ON/OFF
  - `enable_fuel_tracking` - 燃料管理ON/OFF（将来拡張）
  - `vehicle_inspection_alert_days` - 車検アラート日数（デフォルト60日）
  - `insurance_alert_days` - 保険アラート日数（デフォルト60日）
  - `enable_operator_license_check` - オペレーター資格確認（将来拡張）

**適用日**: 2025-12-03
**ステータス**: ✅ 完了
**環境**: ローカル開発環境（Supabase Local）

**ロールバック手順:**
```sql
ALTER TABLE organizations DROP COLUMN IF EXISTS heavy_equipment_enabled;
ALTER TABLE organizations DROP COLUMN IF EXISTS heavy_equipment_settings;
```

---

### Phase 7.1 実装チェックリスト（Week 1-2: データベース構築）

- [x] heavy_equipment_categoriesテーブル作成
- [x] heavy_equipmentテーブル作成（30+カラム）
- [x] heavy_equipment_usage_recordsテーブル作成
- [x] heavy_equipment_maintenanceテーブル作成
- [x] 全テーブルにRLSポリシー設定
- [x] インデックス作成（7個）
- [x] トリガー作成（updated_at自動更新）
- [x] organizationsテーブルに設定カラム追加
- [x] システム標準カテゴリ8種類投入
- [x] TypeScript型定義作成（types/heavy-equipment.ts）
- [x] マイグレーション実行確認
- [x] DATABASE_SCHEMA.md更新
- [x] SPECIFICATION_SAAS_FINAL.md更新
- [x] GitHub Issues作成（#43, #44, #45, #46）

### 重機管理機能の核心ポイント

1. **所有形態管理（最重要）**
   - owned（自社所有）
   - leased（リース）
   - rented（レンタル）

2. **法令順守（必須）**
   - 車検管理（requires_vehicle_inspection, vehicle_inspection_date）
   - 保険管理（insurance_end_date, insurance_reminder_days）
   - アラート機能（60日前通知）

3. **オプション機能（顧客選択）**
   - メーター管理（enable_hour_meter）
   - 燃料管理（将来拡張）
   - オペレーター資格確認（将来拡張）

4. **移動・使用記録（必須）**
   - checkout（持出）
   - checkin（返却）
   - transfer（現場間移動）
   - 誰がいつ使ったかを記録

5. **将来の拡張計画**
   - 作業報告書機能との統合（稼働日報）
   - コスト分析（購入/リース/レンタルのROI比較）
   - 詳細な点検記録管理

---

### Phase 8: スタッフ管理機能（2025-12-04 〜）

#### 20250104000001_add_staff_management_columns.sql
```sql
-- usersテーブルにスタッフ管理用カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN users.department IS '所属部署';
COMMENT ON COLUMN users.employee_id IS '社員番号';
COMMENT ON COLUMN users.phone IS '電話番号';
COMMENT ON COLUMN users.is_active IS 'アカウント有効状態';
COMMENT ON COLUMN users.invited_at IS '招待日時';
COMMENT ON COLUMN users.last_login_at IS '最終ログイン日時';
COMMENT ON COLUMN users.password_reset_token IS 'パスワードリセットトークン';
COMMENT ON COLUMN users.password_reset_expires_at IS 'トークン有効期限';
COMMENT ON COLUMN users.access_expires_at IS '一時アクセス期限（将来拡張用）';
```

**適用日**: 2025-12-04
**ステータス**: ✅ 完了
**ロールバック**:
```sql
ALTER TABLE users DROP COLUMN IF EXISTS department;
ALTER TABLE users DROP COLUMN IF EXISTS employee_id;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS invited_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS access_expires_at;
DROP INDEX IF EXISTS idx_users_is_active;
DROP INDEX IF EXISTS idx_users_department;
DROP INDEX IF EXISTS idx_users_employee_id;
DROP INDEX IF EXISTS idx_users_password_reset_token;
```

---

#### 20250104000002_create_user_history_table.sql
```sql
-- ユーザー変更履歴テーブル作成
CREATE TABLE IF NOT EXISTS user_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'updated', 'deleted', 'activated', 'deactivated',
    'role_changed', 'department_changed', 'password_reset'
  )),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_history_organization ON user_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_changed_by ON user_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_user_history_created_at ON user_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_change_type ON user_history(change_type);

-- RLS有効化
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- コメント追加
COMMENT ON TABLE user_history IS 'ユーザー変更履歴（監査ログ）';
COMMENT ON COLUMN user_history.change_type IS '変更種別';
COMMENT ON COLUMN user_history.old_values IS '変更前の値（JSONB）';
COMMENT ON COLUMN user_history.new_values IS '変更後の値（JSONB）';
COMMENT ON COLUMN user_history.changed_by IS '変更実行者のユーザーID';
```

**適用日**: 2025-12-04
**ステータス**: ✅ 完了
**ロールバック**:
```sql
DROP TABLE IF EXISTS user_history CASCADE;
```

---

#### 20250104000003_add_staff_rls_policies.sql
```sql
-- user_historyテーブルのRLSポリシー
CREATE POLICY "user_history_select_admin"
  ON user_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = user_history.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "user_history_insert_admin"
  ON user_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = user_history.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

-- usersテーブルのRLSポリシー追加
CREATE POLICY "users_select_own_organization"
  ON users FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert_admin_only"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = users.organization_id
      AND role = 'admin'
    )
  );

CREATE POLICY "users_update_admin_only"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = users.organization_id
      AND role = 'admin'
    )
  );

CREATE POLICY "users_delete_admin_only"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = users.organization_id
      AND role = 'admin'
    )
  );
```

**適用日**: 2025-12-04
**ステータス**: ✅ 完了
**ロールバック**:
```sql
DROP POLICY IF EXISTS "user_history_select_admin" ON user_history;
DROP POLICY IF EXISTS "user_history_insert_admin" ON user_history;
DROP POLICY IF EXISTS "users_select_own_organization" ON users;
DROP POLICY IF EXISTS "users_insert_admin_only" ON users;
DROP POLICY IF EXISTS "users_update_admin_only" ON users;
DROP POLICY IF EXISTS "users_delete_admin_only" ON users;
```

---

### Phase 8: 実装チェックリスト

#### Phase 8.1: 基本機能（2週間）✅ 完了
- [x] usersテーブルのカラム追加マイグレーション
- [x] user_historyテーブル作成マイグレーション
- [x] RLSポリシー設定（admin/leader/staff別）
- [x] スタッフ一覧API（`/api/staff`）
- [x] スタッフ追加API（`POST /api/staff`）
- [x] スタッフ編集API（`PATCH /api/staff/[id]`）
- [x] スタッフ削除API（`DELETE /api/staff/[id]`）
- [x] アカウント有効化/無効化API（`POST /api/staff/[id]/toggle-active`）
- [x] スタッフ一覧ページ（検索・フィルタリング・ソート・利用状況バー）
- [x] スタッフ追加モーダル（バリデーション・プラン上限チェック・ランダムパスワード生成）
- [x] スタッフ編集モーダル（変更検知・admin権限削除防止）
- [x] 論理削除確認ダイアログ
- [x] アカウント有効化/無効化トグル

#### Phase 8.2: 管理機能（1週間）✅ 完了
- [x] 変更履歴表示モーダル（時系列・変更者情報・日本語表示）
- [x] 変更履歴取得API（`/api/staff/[id]/history`）
- [x] パスワードリセット機能（トークン生成・メール送信準備）
- [x] パスワードリセットAPI（`POST /api/staff/[id]/reset-password`）
- [x] パスワード更新画面（`/reset-password`）
- [x] トークン検証API（`GET /api/reset-password/validate`）
- [x] パスワード更新API（`POST /api/reset-password/update`）
- [x] 部署一覧取得API（`/api/departments`）
- [x] 部署フィルタリング機能

#### Phase 8.3: 効率化機能（1週間）✅ 完了
- [x] CSV一括登録機能（テンプレート・解析・プレビュー・一括登録処理）
- [x] CSV一括登録API（`POST /api/staff/bulk-import`）
- [x] 権限マトリックス表示コンポーネント

#### Phase 8.4: ドキュメント（完了）
- [x] DATABASE_SCHEMA.md更新
- [x] MIGRATIONS.md更新
- [x] SPECIFICATION_SAAS_FINAL.md更新

### スタッフ管理機能の核心ポイント

1. **プラン別制限（重要）**
   - basic: 10人まで
   - standard: 30人まで
   - premium: 100人まで
   - enterprise: 要相談（個別設定）

2. **権限設計（3階層）**
   - admin: 全機能アクセス可能
   - leader: 閲覧と実務操作のみ
   - staff: 閲覧と基本操作のみ

3. **監査ログ（必須）**
   - すべての変更を`user_history`に記録
   - 変更種別、変更者、変更内容をJSONBで保存
   - RLSで組織内のadminのみ閲覧可能

4. **セキュリティ機能**
   - パスワードリセット（24時間有効なトークン）
   - アカウント有効化/無効化
   - 最低1人のadmin維持（削除・無効化防止）

5. **効率化機能**
   - CSV一括登録（バリデーション・プレビュー付き）
   - 検索・フィルタリング（名前・メール・部署・権限・状態）
   - 権限マトリックス表示（機能別アクセス権限一覧）

6. **将来の拡張計画**
   - 出退勤管理との統合（オプション機能・追加課金）
   - メール通知機能（招待・パスワードリセット）
   - 2段階認証（2FA）

---

## Phase 9: 出退勤管理機能（2025-12-04 〜）

### 概要
スタッフの出退勤を記録・管理し、勤怠データを可視化する機能。
会社出勤・現場出勤の両方に対応し、QRコード打刻と手動打刻をサポート。

### 9.1 20250104000004_create_attendance_management.sql

#### 作成内容
- organization_attendance_settings テーブル（組織の出退勤設定）
- site_attendance_settings テーブル（現場ごとの設定）
- office_qr_codes テーブル（会社QRコード）
- attendance_records テーブル（出退勤記録）
- RLSポリシー（組織分離・権限別アクセス制御）

#### SQL
```sql
-- btree_gist拡張を有効化（EXCLUDE制約でUUIDを使うために必要）
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. 組織の出退勤設定テーブル
CREATE TABLE organization_attendance_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),

  -- 会社出勤設定
  office_attendance_enabled BOOLEAN DEFAULT true,
  office_clock_methods JSONB NOT NULL DEFAULT '{"manual":true,"qr_scan":false,"qr_display":false}',
  office_qr_rotation_days INTEGER DEFAULT 7 CHECK (office_qr_rotation_days IN (1, 3, 7, 30)),

  -- 現場出勤設定
  site_attendance_enabled BOOLEAN DEFAULT true,
  site_clock_methods JSONB NOT NULL DEFAULT '{"manual":true,"qr_scan":false,"qr_display":false}',
  site_qr_type TEXT DEFAULT 'leader' CHECK (site_qr_type IN ('leader', 'fixed', 'both')),

  -- 休憩時間設定
  break_time_mode TEXT DEFAULT 'simple' CHECK (break_time_mode IN ('none', 'simple', 'detailed')),
  auto_break_deduction BOOLEAN DEFAULT false,
  auto_break_minutes INTEGER DEFAULT 45,

  -- 通知設定
  checkin_reminder_enabled BOOLEAN DEFAULT true,
  checkin_reminder_time TIME DEFAULT '10:00',
  checkout_reminder_enabled BOOLEAN DEFAULT true,
  checkout_reminder_time TIME DEFAULT '20:00',
  admin_daily_report_enabled BOOLEAN DEFAULT true,
  admin_daily_report_time TIME DEFAULT '10:00',
  admin_daily_report_email BOOLEAN DEFAULT true,
  qr_expiry_alert_enabled BOOLEAN DEFAULT true,
  qr_expiry_alert_email BOOLEAN DEFAULT true,
  overtime_alert_enabled BOOLEAN DEFAULT false,
  overtime_alert_hours INTEGER DEFAULT 12,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 現場ごとの出退勤設定
CREATE TABLE site_attendance_settings (
  site_id UUID PRIMARY KEY REFERENCES sites(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qr_mode TEXT NOT NULL DEFAULT 'leader' CHECK (qr_mode IN ('leader', 'fixed')),
  has_tablet BOOLEAN DEFAULT false,
  tablet_access_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 会社QRコード（自動更新型）
CREATE TABLE office_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qr_data TEXT NOT NULL UNIQUE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 有効期間の重複防止
  EXCLUDE USING gist (
    organization_id WITH =,
    tstzrange(valid_from, valid_until) WITH &&
  ) WHERE (is_active = true)
);

-- 4. 出退勤記録
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,

  -- 出勤情報
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_location_type TEXT NOT NULL CHECK (clock_in_location_type IN ('office', 'site', 'remote')),
  clock_in_site_id UUID REFERENCES sites(id),
  clock_in_method TEXT NOT NULL CHECK (clock_in_method IN ('manual', 'qr')),
  clock_in_device_type TEXT CHECK (clock_in_device_type IN ('mobile', 'tablet', 'desktop')),

  -- 退勤予定
  planned_checkout_location_type TEXT CHECK (planned_checkout_location_type IN ('office', 'site', 'remote', 'direct_home')),
  planned_checkout_site_id UUID REFERENCES sites(id),

  -- 退勤情報（実績）
  clock_out_time TIMESTAMPTZ,
  clock_out_location_type TEXT CHECK (clock_out_location_type IN ('office', 'site', 'remote', 'direct_home')),
  clock_out_site_id UUID REFERENCES sites(id),
  clock_out_method TEXT CHECK (clock_out_method IN ('manual', 'qr')),
  clock_out_device_type TEXT CHECK (clock_out_device_type IN ('mobile', 'tablet', 'desktop')),

  -- 休憩時間（JSONB配列）
  break_records JSONB DEFAULT '[]',
  auto_break_deducted_minutes INTEGER DEFAULT 0,

  -- メタ情報
  notes TEXT,
  is_offline_sync BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  is_manually_edited BOOLEAN DEFAULT false,
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ,
  edited_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1日1レコード制約
  UNIQUE(organization_id, user_id, date)
);

-- インデックス
CREATE INDEX idx_office_qr_codes_org_active ON office_qr_codes(organization_id, is_active);
CREATE INDEX idx_office_qr_codes_qr_data ON office_qr_codes(qr_data);
CREATE INDEX idx_attendance_records_org ON attendance_records(organization_id);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_attendance_records_date ON attendance_records(date DESC);
CREATE INDEX idx_attendance_records_org_date ON attendance_records(organization_id, date DESC);

-- RLSポリシー
ALTER TABLE organization_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- (詳細なRLSポリシーは割愛)
```

#### 適用日
**ローカル開発環境**: 2025-12-04
**ステータス**: ✅ 適用完了

#### ロールバック手順
```sql
-- RLSポリシー削除
DROP POLICY IF EXISTS "Users can view own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can insert own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can update own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Admins can manage all attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can view their organization's QR codes" ON office_qr_codes;
DROP POLICY IF EXISTS "Admins can manage QR codes" ON office_qr_codes;
DROP POLICY IF EXISTS "Users can view their organization's site settings" ON site_attendance_settings;
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_attendance_settings;
DROP POLICY IF EXISTS "Organizations can manage their own settings" ON organization_attendance_settings;

-- テーブル削除（CASCADE）
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS office_qr_codes CASCADE;
DROP TABLE IF EXISTS site_attendance_settings CASCADE;
DROP TABLE IF EXISTS organization_attendance_settings CASCADE;

-- 拡張削除（他で使われていない場合のみ）
-- DROP EXTENSION IF EXISTS btree_gist;
```

#### 注意事項
1. `btree_gist`拡張が必要（EXCLUDE制約でUUID使用のため）
2. `office_qr_codes`は有効期間の重複を自動防止（GiST EXCLUDE制約）
3. `attendance_records`は1ユーザー1日1レコード制約（UNIQUE制約）
4. 休憩時間は`JSONB`配列で複数回記録可能
5. 手動修正は監査ログ付き（edited_by, edited_at, edited_reason）

#### 関連ドキュメント
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Section 8: 出退勤管理テーブル
- [ATTENDANCE_MANAGEMENT_SPEC.md](./ATTENDANCE_MANAGEMENT_SPEC.md) - 完全仕様書
- [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md) - Section 21: 出退勤管理機能

---

### Phase 9.1 実装状況

#### Week 1: データベース + 設定（2025-12-04）
- [x] データベースマイグレーション作成
- [x] organization_attendance_settings テーブル作成
- [x] site_attendance_settings テーブル作成
- [x] office_qr_codes テーブル作成
- [x] attendance_records テーブル作成
- [x] RLSポリシー設定
- [x] MIGRATIONS.md更新
- [ ] 組織設定API実装（GET/PUT /api/attendance/settings）
- [ ] 設定画面UI実装（/attendance/settings）

#### Week 2: 打刻機能（予定）
- [ ] 出勤打刻API（手動のみ）
- [ ] 退勤打刻API（手動のみ）
- [ ] ダッシュボードウィジェット
- [ ] 打刻状態の取得API
- [ ] 重複打刻防止機能
- [ ] タイムゾーン処理（JST統一）

#### Week 3: 一覧・履歴（予定）
- [ ] 勤怠一覧API（フィルター付き）
- [ ] 勤怠一覧ページ（デスクトップ）
- [ ] 勤怠一覧ページ（モバイル）
- [ ] 自分の履歴ページ（スタッフ用）
- [ ] 休憩時間管理（simple/detailed/none）
- [ ] 手動修正機能（管理者用）


---

## 20251216001500_create_purchase_orders.sql

### 概要
発注書管理機能のデータベーステーブルを作成します。仕入先マスタ、発注書、発注明細、発注履歴の4つのテーブルを追加します。

### 作成テーブル
1. **suppliers** - 仕入先マスタ
2. **purchase_orders** - 発注書
3. **purchase_order_items** - 発注明細
4. **purchase_order_history** - 発注履歴

### SQL内容

```sql
-- 仕入先マスタテーブル
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  name_kana VARCHAR(200),
  postal_code VARCHAR(10),
  address TEXT,
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  contact_person VARCHAR(100),
  payment_terms VARCHAR(100),
  bank_name VARCHAR(100),
  branch_name VARCHAR(100),
  account_type VARCHAR(20),
  account_number VARCHAR(20),
  account_holder VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, supplier_code)
);

-- 発注書テーブル
CREATE TABLE purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  project_id UUID REFERENCES projects(id),
  order_date DATE NOT NULL,
  delivery_date DATE,
  delivery_location TEXT,
  payment_terms VARCHAR(100),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  ordered_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, order_number)
);

-- 発注明細テーブル
CREATE TABLE purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  unit_price DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10,
  amount DECIMAL(12, 2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 発注書履歴テーブル
CREATE TABLE purchase_order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  comment TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

CREATE INDEX idx_purchase_orders_organization_id ON purchase_orders(organization_id);
CREATE INDEX idx_purchase_orders_order_number ON purchase_orders(order_number);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_order_date ON purchase_orders(order_date);

CREATE INDEX idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_sort_order ON purchase_order_items(sort_order);

CREATE INDEX idx_purchase_order_history_purchase_order_id ON purchase_order_history(purchase_order_id);
CREATE INDEX idx_purchase_order_history_created_at ON purchase_order_history(created_at);

-- RLS (Row Level Security) ポリシー設定
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_history ENABLE ROW LEVEL SECURITY;

-- 各テーブルのRLSポリシーは20251216001600で設定
```

### 適用日
**ローカル開発環境**: 2025-12-16 (既存テーブルと重複のため未適用)
**ステータス**: ⏭️ スキップ（既存テーブル存在）

### ロールバック手順
```sql
DROP TABLE IF EXISTS purchase_order_history CASCADE;
DROP TABLE IF EXISTS purchase_order_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
```

---

## 20251216001600_add_purchase_order_missing_columns.sql

### 概要
既存の発注書関連テーブルに不足しているカラムを追加し、制約を更新します。

### 変更内容

#### 1. purchase_ordersテーブルにカラム追加
- `payment_terms` - 支払条件
- `ordered_at` - 発注日時
- `delivered_at` - 納品日時
- `paid_at` - 支払日時

#### 2. ステータス制約の更新
より詳細なワークフロー管理のため、ステータスの種類を拡張：
- `draft` - 下書き
- `submitted` - 承認申請中
- `approved` - 承認済み
- `rejected` - 差戻し
- `ordered` - 発注済み
- `partially_received` - 一部納品済み
- `received` - 納品済み
- `paid` - 支払済み
- `cancelled` - キャンセル

#### 3. purchase_order_historyテーブル作成
変更履歴を記録するテーブルを追加（存在しない場合のみ）

#### 4. RLSポリシー設定
全テーブルに組織単位のデータ分離ポリシーを設定

### SQL内容

```sql
-- カラム追加
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- ステータス制約更新
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'ordered', 
                    'partially_received', 'received', 'paid', 'cancelled'));

-- 履歴テーブル作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS purchase_order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  comment TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー設定（詳細は省略）
```

### 適用日
**ローカル開発環境**: 2025-12-16
**ステータス**: ✅ 適用完了

### ロールバック手順
```sql
-- カラム削除
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS payment_terms;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS ordered_at;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS delivered_at;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS paid_at;

-- ステータス制約を元に戻す
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled'));
```

### 注意事項
1. 既存の`purchase_orders`テーブルが存在することを前提としています
2. `supplier_id`の外部キー制約を`clients`から`suppliers`に変更する処理が含まれています
3. すべてのカラム追加は`IF NOT EXISTS`チェック付きで安全に実行されます

### 関連ドキュメント
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Section 23: 発注書管理テーブル
- [PURCHASE_ORDER_SPEC.md](./PURCHASE_ORDER_SPEC.md) - 完全仕様書

---

### Phase 1 実装状況（発注書管理）

#### データベース設計・マイグレーション（2025-12-16）
- [x] suppliersテーブル作成
- [x] purchase_ordersテーブル作成
- [x] purchase_order_itemsテーブル作成
- [x] purchase_order_historyテーブル作成
- [x] RLSポリシー設定
- [x] インデックス設計
- [x] TypeScript型定義作成（types/purchase-orders.ts）
- [x] DATABASE_SCHEMA.md更新
- [x] MIGRATIONS.md更新
- [ ] 仕入先マスタ管理API実装
- [ ] 仕入先マスタ管理UI実装
- [ ] 発注書CRUD API実装
- [ ] 発注書CRUD UI実装
- [ ] PDF出力機能実装


---

## マイグレーション#8: organizationsテーブルに連絡先情報カラムを追加

### 目的
組織の連絡先情報（代表者名、住所、電話番号、FAX、メールアドレス）を管理し、重複チェック機能を強化する。

### マイグレーション番号
`20251224000001_add_contact_info_to_organizations`

### 実行日
**本番環境**: 2025-12-24
**テスト環境**: 未実行
**ローカル環境**: 未実行

### 変更内容

#### 1. カラム追加
以下のカラムを`organizations`テーブルに追加：
- `representative_name` TEXT - 代表者名
- `postal_code` TEXT - 郵便番号
- `address` TEXT - 住所
- `phone` TEXT - 電話番号
- `fax` TEXT - FAX番号
- `email` TEXT - メールアドレス

#### 2. インデックス作成
重複チェックのパフォーマンス向上のため：
- `idx_organizations_phone` - 電話番号でのインデックス（NULLを除外）
- `idx_organizations_email` - メールアドレスでのインデックス（NULLを除外）

### SQL内容

```sql
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN organizations.representative_name IS '代表者名';
COMMENT ON COLUMN organizations.postal_code IS '郵便番号';
COMMENT ON COLUMN organizations.address IS '住所';
COMMENT ON COLUMN organizations.phone IS '電話番号';
COMMENT ON COLUMN organizations.fax IS 'FAX番号';
COMMENT ON COLUMN organizations.email IS 'メールアドレス';

CREATE INDEX IF NOT EXISTS idx_organizations_phone ON organizations(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email) WHERE email IS NOT NULL;
```

### ロールバック手順

```sql
DROP INDEX IF EXISTS idx_organizations_phone;
DROP INDEX IF EXISTS idx_organizations_email;

ALTER TABLE organizations
DROP COLUMN IF EXISTS representative_name,
DROP COLUMN IF EXISTS postal_code,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS fax,
DROP COLUMN IF EXISTS email;
```

### 影響範囲

#### API
- `POST /api/admin/organizations` - 組織作成時にこれらのフィールドを保存
- `POST /api/admin/organizations/check-duplicate` - 電話番号・住所での重複チェックを実装

#### UI
- `/admin/organizations/new` - 組織登録フォームに各項目を追加
- `/admin/organizations/[id]/edit` - 組織編集フォームに各項目を追加

### 関連ファイル
- マイグレーションファイル: `supabase/migrations/20251224000001_add_contact_info_to_organizations.sql`
- ロールバックファイル: `supabase/migrations/20251224000001_add_contact_info_to_organizations_rollback.sql`
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Section 2.1: organizationsテーブル

---

## 🚨 緊急対応: Supabaseプロジェクト完全再構築（2025-12-27）

### 概要
PostgRESTスキーマキャッシュ問題を根本解決するため、Supabaseプロジェクトを完全に再構築しました。

### 問題の背景
- **症状**: 営業案件一覧ページで `column organizations.sales_status does not exist` エラー
- **根本原因**: Supabase Free PlanのPostgRESTは、プロジェクト起動後に追加されたカラムを認識しない
- **試行錯誤**:
  - `NOTIFY pgrst, 'reload schema'` → 失敗
  - プロジェクトのPause/Resume → 失敗
  - データベース完全削除・再作成 → PostgRESTキャッシュは更新されず失敗

### 解決策
**新しいSupabaseプロジェクトを作成し、最初から全カラムを含むスキーマを適用**

### 実施内容

#### 1. 旧プロジェクト削除
- `zairoku-production` (旧本番環境) → 削除
- `zairoku-test` (旧テスト環境) → 削除
- 理由: Free Planは組織あたり2プロジェクトまで

#### 2. 新テスト環境プロジェクト作成
- プロジェクト名: `zairoku-test`
- リージョン: Northeast Asia (Tokyo)
- Project URL: `https://qbabwwwsookpavwcneqw.supabase.co`

#### 3. スキーマ適用（テスト環境）

**実行順序:**
1. **Functions（関数）適用** - `/tmp/schema_functions_fixed.sql` (492行)
   - 全データベース関数を定義
   - `CREATE SCHEMA public;` 行を除外

2. **Extension有効化**
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```

3. **Tables適用（4分割）**
   - Part 1: `tables_part_aa.sql` (55KB, 1000行)
   - Part 2: `tables_part_ab.sql` (57KB, 1000行)
   - Part 3: `tables_part_ac.sql` (89KB, 1000行)
   - Part 4: `tables_part_ad.sql` (16KB, 残り)

**結果:**
- ✅ 77テーブル作成完了
- ✅ organizationsテーブルに営業管理カラム全て存在確認:
  - `sales_status` (TEXT)
  - `priority` (INTEGER)
  - `expected_contract_amount` (INTEGER)
  - `next_appointment_date` (TIMESTAMP WITH TIME ZONE)
  - `last_contact_date` (TIMESTAMP WITH TIME ZONE)
  - `lead_source` (TEXT)

4. **システム管理者アカウント作成**
   ```sql
   INSERT INTO super_admins (
     email,
     password_hash,
     name,
     role,
     permission_level,
     is_active
   ) VALUES (
     'akashi@next-location.com',
     '$2b$10$oAk24XPb2FEeBnT5vllYQ.apGUzLRrv8orZ6vUO.YvWy3CF5LWWFa',
     'Akashi Youichi',
     'owner',
     'admin',
     true
   );
   ```

### スキーマファイル保存場所
- **デスクトップ** (再利用可能):
  - `/Users/youichiakashi/Desktop/tables_part_aa.sql`
  - `/Users/youichiakashi/Desktop/tables_part_ab.sql`
  - `/Users/youichiakashi/Desktop/tables_part_ac.sql`
  - `/Users/youichiakashi/Desktop/tables_part_ad.sql`

- **tmpフォルダ**:
  - `/tmp/schema_functions_fixed.sql` (492行 - 全関数)
  - `/tmp/production_schema.sql` (3713行 - 完全なスキーマ)

### 次のステップ（未実施）
- [ ] Vercel環境変数を新テスト環境用に更新（Preview）
- [ ] テスト環境で営業案件一覧のsales_status動作確認
- [ ] 新本番環境プロジェクト作成
- [ ] 本番環境にスキーマ適用
- [ ] Vercel環境変数を新本番環境用に更新（Production）

### 教訓
1. **Supabase Free Planの制約**: 後からカラムを追加してもPostgRESTが認識しない
2. **初期スキーマの重要性**: プロジェクト作成時に全カラムを含める必要がある
3. **テスト・本番環境の分離**: 同じ手順で両環境を再構築し、完全一致させる

### 関連ドキュメント
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - 全テーブル定義
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - 環境構築手順

---

## 🔧 追加修正・完了作業（2025-12-27）

### 概要
Supabaseプロジェクト再構築後の追加修正と機能完成作業

### 実施内容

#### 1. organizationsテーブルにカラム追加
**問題**: 組織作成時に`address`等のカラムが存在せずPostgRESTエラー

**対応**: 不足カラムを追加
```sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS fax TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;
```

**適用環境**: テスト・本番両方

#### 2. Vercel環境変数の修正
**問題**: 新Supabaseプロジェクトの`NEXT_PUBLIC_SUPABASE_ANON_KEY`が未設定

**対応**:
- テスト環境（Preview）: `sb_publishable_Ft2W2rYKjYU425-AmUR0YQ_v0lvU...`
- 本番環境（Production）: 新しいPublishable key設定

#### 3. 組織削除機能の修正
**問題**: 組織削除時に外部キー制約エラー
```
insert or update on table "audit_logs" violates foreign key constraint
```

**原因**: `log_organization_changes`トリガーが削除時も`audit_logs`に記録しようとしていた

**対応**: トリガーをINSERT/UPDATEのみに変更
```sql
DROP TRIGGER IF EXISTS log_organization_changes_trigger ON public.organizations;

CREATE TRIGGER log_organization_changes_trigger
AFTER INSERT OR UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.log_organization_changes();
```

**ファイル**: `/Users/youichiakashi/Desktop/disable_organization_delete_audit.sql`

#### 4. 操作ログページの404エラー修正
**問題**: `/admin/logs`が404エラー

**原因**: `.gitignore`の`logs/`パターンが`app/admin/logs/`を除外

**対応**:
```gitignore
# Logs
*.log
# Ignore log directories but not app code
logs/
!app/**/logs/
```

#### 5. ログAPIのカラム名修正
**問題**: `super_admin_logs`テーブルは`performed_at`カラムだが、APIは`created_at`を参照

**対応**: APIコードを`performed_at`に修正

#### 6. Hydration error修正
**問題**: 組織一覧の日付表示でHydration mismatch

**対応**: タイムゾーンを明示的に指定
```typescript
new Date(org.created_at).toLocaleDateString('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Tokyo'
})
```

#### 7. 営業活動履歴の表示問題修正
**問題**: 活動追加後に一覧に表示されない

**対応**:
1. ページに動的レンダリング強制
```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

2. クライアント側で即座に反映
```typescript
setActivities([newActivity.activity, ...activities]);
```

### 完了した機能
- ✅ 組織作成・編集・削除
- ✅ 組織一覧表示
- ✅ 操作ログ閲覧
- ✅ 営業案件管理
- ✅ 営業活動履歴追加・表示

### コミット履歴
```
0f29509 Fix: 営業活動追加後、リロードせずに即座に一覧に反映されるように修正
806566e Fix: 営業詳細ページのキャッシュ問題を修正（活動履歴が表示されない問題）
d260c7c Fix: ログAPIのカラム名をperformed_atに修正
c305174 Fix: .gitignoreを修正してログページを追加
9339ab7 Fix: 組織削除時の外部キー制約エラーを修正、ログAPIのカラム名を修正
3a994c9 Fix: Hydration errorを修正（日付フォーマットにタイムゾーンを明示的に指定）
268c2e3 Fix: 組織作成APIをSupabase Clientのみ使用するよう修正
e16c057 Fix: 本番環境で組織一覧が表示されない問題を修正
```

### テスト環境への反映タイミング
**質問への回答**: テスト環境は手動反映が必要

**フロー**:
1. `dev`ブランチにpush → Vercel Preview自動デプロイ
2. **データベース**: 手動でテスト用Supabase（qbabwwwsookpavwcneqw）にSQL実行
3. 動作確認後、`main`ブランチにマージ → Production自動デプロイ

### 保存ファイル
- `/Users/youichiakashi/Desktop/add_organization_contact_fields.sql` - organizationsカラム追加
- `/Users/youichiakashi/Desktop/disable_organization_delete_audit.sql` - トリガー修正
- `/Users/youichiakashi/Desktop/check_sales_activities.sql` - 営業活動確認用

### 次のステップ
- [ ] デバッグコード削除（営業一覧のconsole.log等）
- [ ] テスト環境にも同様のSQLを適用
- [ ] リリース前の最終動作確認


---

## 2025-12-29: プラン変更機能実装（Phase 4-5完了）

### 実装内容

#### Phase 4: 契約変更画面作成
1. **プラン変更ページ**: `/admin/contracts/[id]/change-plan/page.tsx`
   - active状態の契約のみプラン変更可能
   - 現在のプラン表示
   - 新しいプラン選択（チェックボックス）
   - 変更日選択

2. **プラン変更フォームコンポーネント**: `PlanChangeForm.tsx`
   - プレビュー機能（日割り計算を事前確認）
   - 変更実行機能
   - エラーハンドリング

3. **プレビューAPI**: `/api/admin/contracts/change-plan/preview/route.ts`
   - 日割り計算プレビュー
   - 月払い/年払い対応
   - 次回請求額計算

4. **契約詳細画面修正**: `[id]/page.tsx`
   - activeステータスの契約に「プラン変更」ボタン追加

#### Phase 5: cronジョブ修正（年払い対応）
1. **請求書自動生成cron修正**: `/api/cron/create-monthly-invoices/route.ts`
   - 月払い契約：毎月の請求日に請求書生成
   - 年払い契約：契約開始日の年次記念日に請求書生成（12倍の料金）

2. **料金計算ロジック修正**: `lib/billing/calculate-fee.ts`
   - `Contract`インターフェースに`billing_cycle`追加
   - 年払いの場合、料金を12倍にして計算
   - 請求書の説明文に「年払い」を明記

### マイグレーション履歴
前回実装済み（Phase 1-3）:
- `20251229000001_add_billing_cycle_to_contracts.sql` - billing_cycle追加
- `20251229000002_add_prorated_charge_to_contracts.sql` - 日割り差額カラム追加
- Phase 3で料金計算ロジックとAPI修正済み

### 型エラー修正
`currentPackages`の型変換を追加:
```typescript
const currentPackages = currentPackagesRaw?.map(cp => ({
  package_id: cp.package_id,
  packages: Array.isArray(cp.packages) ? cp.packages[0] : cp.packages
})) || [];
```

### テスト結果
- ✅ ビルド成功（TypeScriptエラーなし）
- ✅ 型チェック通過

### 残作業
- [ ] 開発サーバーでのUI動作確認
- [ ] プレビューAPI動作確認
- [ ] プラン変更実行テスト
- [ ] 年払い請求書生成テスト（cron）

### ファイル
- `app/admin/contracts/[id]/change-plan/page.tsx` - プラン変更画面
- `components/admin/PlanChangeForm.tsx` - プラン変更フォーム
- `app/api/admin/contracts/change-plan/preview/route.ts` - プレビューAPI
- `app/api/cron/create-monthly-invoices/route.ts` - 年払い対応cron
- `lib/billing/calculate-fee.ts` - 年払い料金計算



---

### 20251231000001_add_password_change_tokens.sql

**実行日時**: 2025-12-31
**環境**: ローカル開発環境、本番環境（未実行）

#### 変更内容
- `password_change_tokens`テーブル作成
- パスワード変更時のメール確認コード管理用

#### テーブル構造
```sql
CREATE TABLE password_change_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id UUID REFERENCES super_admins(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### インデックス
- `idx_password_change_tokens_admin` - super_admin_id
- `idx_password_change_tokens_expires` - expires_at
- `idx_password_change_tokens_used` - used

#### RLSポリシー
- サービスロールのみアクセス可能

#### 影響範囲
- 新機能追加（既存機能への影響なし）
- スーパー管理者のパスワード変更機能で使用

#### 実行コマンド
```bash
# ローカル
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20251231000001_add_password_change_tokens.sql

# 本番（リモート接続時）
PGPASSWORD="cF1!hVERlDgjMD" psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/20251231000001_add_password_change_tokens.sql
```

#### ロールバック
```sql
DROP TABLE IF EXISTS password_change_tokens CASCADE;
```

---

### 20250104_rename_order_status.sql

**実行日時**: 2025-01-04
**環境**: ローカル開発環境（未実行）、本番環境（未実行）

#### 変更内容
- 消耗品発注ステータスを「発注中」→「下書き中」に変更
- ステータスの意味を明確化（下書き状態であることを直感的に表現）

#### 背景
- 「発注中」は業者に発注している最中と誤解されやすい
- 「下書き中」の方が未確定状態であることが明確

#### SQL
```sql
-- 既存データの更新
UPDATE consumable_orders
SET status = '下書き中'
WHERE status = '発注中';

-- CHECK制約を削除
ALTER TABLE consumable_orders
DROP CONSTRAINT IF EXISTS consumable_orders_status_check;

-- 新しいCHECK制約を追加
ALTER TABLE consumable_orders
ADD CONSTRAINT consumable_orders_status_check
CHECK (status IN ('下書き中', '発注済み', '納品済み', 'キャンセル'));

-- コメント更新
COMMENT ON COLUMN consumable_orders.status IS '発注ステータス: 下書き中/発注済み/納品済み/キャンセル';
```

#### 影響範囲
- UIコード: 発注一覧・詳細画面のステータス表示
- APIコード: 新規発注作成時のデフォルトステータス
- ドキュメント: MANUAL.md, DATABASE_SCHEMA.md

#### 実行コマンド
```bash
# ローカル
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20250104_rename_order_status.sql

# 本番（Supabase Dashboard → SQL Editor）
# 上記SQLを実行
```

#### ロールバック
```sql
-- 既存データの更新
UPDATE consumable_orders
SET status = '発注中'
WHERE status = '下書き中';

-- CHECK制約を削除
ALTER TABLE consumable_orders
DROP CONSTRAINT IF EXISTS consumable_orders_status_check;

-- 元のCHECK制約を追加
ALTER TABLE consumable_orders
ADD CONSTRAINT consumable_orders_status_check
CHECK (status IN ('発注中', '発注済み', '納品済み', 'キャンセル'));

-- コメント復元
COMMENT ON COLUMN consumable_orders.status IS '発注ステータス: 発注中/発注済み/納品済み/キャンセル';
```

