-- ========================================
-- Clients Master (取引先マスタ)
-- ========================================

-- 取引先マスタテーブル
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- 基本情報
    code TEXT NOT NULL, -- 取引先コード（例: CL-0001）
    name TEXT NOT NULL, -- 取引先名（例: 株式会社ABC建設）
    name_kana TEXT, -- フリガナ（例: カブシキガイシャエービーシーケンセツ）
    short_name TEXT, -- 略称（例: ABC建設）

    -- 取引先分類
    client_type TEXT NOT NULL CHECK (client_type IN (
        'customer',      -- 顧客（発注者）
        'supplier',      -- 仕入先（資材・道具調達先）
        'partner',       -- 協力会社（下請け・外注先）
        'both'           -- 顧客兼仕入先
    )),
    industry TEXT, -- 業種（例: 建築、土木、電気工事）

    -- 連絡先情報
    postal_code TEXT, -- 郵便番号（例: 100-0001）
    address TEXT, -- 住所
    phone TEXT, -- 電話番号
    fax TEXT, -- FAX番号
    email TEXT, -- メールアドレス
    website TEXT, -- ウェブサイト

    -- 担当者情報
    contact_person TEXT, -- 担当者名
    contact_department TEXT, -- 担当部署
    contact_phone TEXT, -- 担当者電話番号
    contact_email TEXT, -- 担当者メールアドレス

    -- 取引条件
    payment_terms TEXT, -- 支払条件（例: 月末締め翌月末払い）
    payment_method TEXT CHECK (payment_method IN (
        'bank_transfer',  -- 銀行振込
        'cash',           -- 現金
        'check',          -- 小切手
        'credit',         -- 掛売り
        'other'           -- その他
    )),
    payment_due_days INTEGER DEFAULT 30, -- 支払期日（日数）

    -- 銀行情報
    bank_name TEXT, -- 銀行名
    bank_branch TEXT, -- 支店名
    bank_account_type TEXT CHECK (bank_account_type IN (
        'savings',   -- 普通預金
        'current',   -- 当座預金
        'other'      -- その他
    )),
    bank_account_number TEXT, -- 口座番号
    bank_account_holder TEXT, -- 口座名義

    -- 財務情報
    credit_limit DECIMAL(15, 2), -- 与信限度額
    current_balance DECIMAL(15, 2) DEFAULT 0, -- 現在残高（売掛金・買掛金）

    -- 税務情報
    tax_id TEXT, -- 法人番号・事業者番号
    tax_registration_number TEXT, -- インボイス登録番号（適格請求書発行事業者登録番号）
    is_tax_exempt BOOLEAN DEFAULT false, -- 非課税事業者

    -- 取引実績
    first_transaction_date DATE, -- 初回取引日
    last_transaction_date DATE, -- 最終取引日
    total_transaction_count INTEGER DEFAULT 0, -- 取引回数
    total_transaction_amount DECIMAL(15, 2) DEFAULT 0, -- 累計取引額

    -- 評価・メモ
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 評価（1-5）
    notes TEXT, -- 備考・メモ
    internal_notes TEXT, -- 社内用メモ（取引先には見せない）

    -- ステータス
    is_active BOOLEAN DEFAULT true, -- 有効/無効

    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- 論理削除

    -- 制約
    UNIQUE(organization_id, code), -- 組織内でコードは一意
    UNIQUE(organization_id, name) -- 組織内で取引先名は一意
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

-- コメント追加
COMMENT ON TABLE clients IS '取引先マスタ（顧客・仕入先・協力会社）';
COMMENT ON COLUMN clients.code IS '取引先コード（例: CL-0001）';
COMMENT ON COLUMN clients.client_type IS '取引先分類: customer=顧客, supplier=仕入先, partner=協力会社, both=顧客兼仕入先';
COMMENT ON COLUMN clients.payment_terms IS '支払条件（例: 月末締め翌月末払い）';
COMMENT ON COLUMN clients.payment_due_days IS '支払期日（日数）';
COMMENT ON COLUMN clients.credit_limit IS '与信限度額';
COMMENT ON COLUMN clients.current_balance IS '現在残高（売掛金・買掛金）';
COMMENT ON COLUMN clients.tax_registration_number IS 'インボイス登録番号（適格請求書発行事業者登録番号）';
COMMENT ON COLUMN clients.rating IS '評価（1-5）';
COMMENT ON COLUMN clients.internal_notes IS '社内用メモ（取引先には見せない）';

-- RLS有効化
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 同じ組織のデータのみアクセス可能
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

-- ========================================
-- Sites (現場) に取引先参照を追加
-- ========================================

-- 現場テーブルに取引先IDを追加
ALTER TABLE sites ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id);

-- コメント追加
COMMENT ON COLUMN sites.client_id IS '取引先ID（現場の発注者・元請け企業）';

-- ========================================
-- 取引先コード自動生成関数
-- ========================================

-- シーケンス作成（組織ごとの連番管理）
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
    -- 組織の次の番号を取得または初期化
    INSERT INTO client_code_sequences (organization_id, last_number)
    VALUES (org_id, 1)
    ON CONFLICT (organization_id)
    DO UPDATE SET
        last_number = client_code_sequences.last_number + 1,
        updated_at = NOW()
    RETURNING last_number INTO next_number;

    -- コード生成（例: CL-0001）
    new_code := prefix || '-' || LPAD(next_number::TEXT, 4, '0');

    RETURN new_code;
END;
$$;

COMMENT ON FUNCTION generate_client_code IS '取引先コードを自動生成（例: CL-0001）';

-- ========================================
-- 取引先の更新日時を自動更新するトリガー
-- ========================================

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
