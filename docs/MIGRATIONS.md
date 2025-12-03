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

