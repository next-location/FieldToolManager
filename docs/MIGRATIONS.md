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
