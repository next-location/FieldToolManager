-- 取引先マスタテーブル作成マイグレーション
-- ==========================================

-- 1. 取引先マスタテーブル
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  client_code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_kana TEXT,

  -- 種別
  client_type TEXT NOT NULL CHECK (client_type IN ('customer', 'supplier', 'both')),

  -- 住所情報
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,

  -- 担当者情報
  contact_person TEXT,
  contact_person_title TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- 支払条件（請求書に自動反映）
  payment_terms TEXT,
  payment_method TEXT,
  payment_due_days INTEGER DEFAULT 30,

  -- 銀行情報（振込先として請求書に記載）
  bank_name TEXT,
  branch_name TEXT,
  account_type TEXT,
  account_number TEXT,
  account_name TEXT,

  -- インボイス対応
  tax_registration_number TEXT,
  is_tax_exempt BOOLEAN DEFAULT false,

  -- 与信管理
  credit_limit DECIMAL(12, 2),
  current_balance DECIMAL(12, 2) DEFAULT 0,

  -- メモ
  notes TEXT,

  -- ステータス
  is_active BOOLEAN DEFAULT true,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(organization_id, client_code)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_clients_org_active ON clients(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- RLSを有効化
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
-- 閲覧権限: リーダー以上
CREATE POLICY "Leaders can view clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'leader')
    )
  );

-- 作成・更新・削除権限: 管理者のみ
CREATE POLICY "Admin can insert clients" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can update clients" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can delete clients" ON clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

-- コメント追加
COMMENT ON COLUMN clients.client_type IS '取引先種別: customer=顧客, supplier=仕入先, both=両方';
COMMENT ON COLUMN clients.payment_terms IS '支払条件: 月末締め翌月末払いなど';
COMMENT ON COLUMN clients.payment_method IS '支払方法: 銀行振込、現金など';
COMMENT ON COLUMN clients.tax_registration_number IS 'インボイス登録番号（T + 13桁）';
COMMENT ON COLUMN clients.is_tax_exempt IS '免税事業者フラグ';
COMMENT ON COLUMN clients.credit_limit IS '与信限度額';
COMMENT ON COLUMN clients.current_balance IS '現在の売掛金残高';