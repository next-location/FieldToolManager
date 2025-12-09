-- ========================================
-- 道具マスタプリセットシステムの実装
-- ========================================
-- 共通道具マスタ（全組織共通テンプレート）と組織固有道具マスタの2層構造を実現
--
-- 目的:
-- 1. システム側で標準的な道具マスタを事前登録
-- 2. 各組織は共通マスタをコピーして使用可能
-- 3. 組織独自の道具マスタも追加可能
-- ========================================

-- ========================================
-- Step 1: 共通道具マスタプリセットテーブル作成
-- ========================================
CREATE TABLE tool_master_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 基本情報
    name TEXT NOT NULL,
    model_number TEXT,
    manufacturer TEXT,
    category TEXT,
    unit TEXT DEFAULT '個',

    -- 画像
    image_url TEXT,

    -- 説明・備考
    description TEXT,
    notes TEXT,

    -- 表示順序
    sort_order INTEGER DEFAULT 0,

    -- 有効/無効フラグ
    is_active BOOLEAN DEFAULT true,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Step 2: インデックス作成
-- ========================================
CREATE INDEX idx_tool_master_presets_category ON tool_master_presets(category);
CREATE INDEX idx_tool_master_presets_is_active ON tool_master_presets(is_active);
CREATE INDEX idx_tool_master_presets_sort_order ON tool_master_presets(sort_order);
CREATE INDEX idx_tool_master_presets_name ON tool_master_presets(name);

-- ========================================
-- Step 3: 既存toolsテーブルの拡張
-- ========================================
-- プリセットとの関連付け
ALTER TABLE tools ADD COLUMN preset_id UUID REFERENCES tool_master_presets(id) ON DELETE SET NULL;
ALTER TABLE tools ADD COLUMN is_from_preset BOOLEAN DEFAULT false;

-- コメント追加
COMMENT ON COLUMN tools.preset_id IS 'プリセットからコピーした場合の参照ID';
COMMENT ON COLUMN tools.is_from_preset IS 'プリセットからコピーされた道具マスタかどうか';

-- インデックス追加
CREATE INDEX idx_tools_preset_id ON tools(preset_id);
CREATE INDEX idx_tools_is_from_preset ON tools(is_from_preset);

-- ========================================
-- Step 4: updated_atトリガー
-- ========================================
CREATE TRIGGER update_tool_master_presets_updated_at
    BEFORE UPDATE ON tool_master_presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Step 5: RLSを有効化
-- ========================================
ALTER TABLE tool_master_presets ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Step 6: RLSポリシー作成
-- ========================================

-- SELECT: 全ての認証済みユーザーが閲覧可能（共通マスタのため）
CREATE POLICY "Authenticated users can view tool master presets"
    ON tool_master_presets FOR SELECT
    TO authenticated
    USING (is_active = true);

-- INSERT: super_adminのみ作成可能
CREATE POLICY "Only super admins can create tool master presets"
    ON tool_master_presets FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- UPDATE: super_adminのみ更新可能
CREATE POLICY "Only super admins can update tool master presets"
    ON tool_master_presets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- DELETE: super_adminのみ削除可能（論理削除推奨のため、実際は使用しない）
CREATE POLICY "Only super admins can delete tool master presets"
    ON tool_master_presets FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- ========================================
-- Step 7: プリセットからのコピー用関数
-- ========================================
CREATE OR REPLACE FUNCTION copy_preset_to_organization(
    p_preset_id UUID,
    p_organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_tool_id UUID;
    v_preset RECORD;
    v_user_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- ユーザーの組織とロールを取得
    SELECT organization_id, role INTO v_user_org_id, v_user_role
    FROM users WHERE id = auth.uid();

    IF v_user_org_id IS NULL THEN
        RAISE EXCEPTION '認証が必要です';
    END IF;

    -- 権限確認（admin以上）
    IF v_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION '権限がありません';
    END IF;

    -- 組織確認
    IF v_user_org_id != p_organization_id THEN
        RAISE EXCEPTION '他の組織の道具マスタは作成できません';
    END IF;

    -- プリセット情報取得
    SELECT * INTO v_preset FROM tool_master_presets WHERE id = p_preset_id AND is_active = true;

    IF v_preset IS NULL THEN
        RAISE EXCEPTION '指定されたプリセットが見つかりません';
    END IF;

    -- 新しい道具マスタを作成
    INSERT INTO tools (
        organization_id,
        name,
        model_number,
        manufacturer,
        management_type,
        unit,
        minimum_stock,
        notes,
        preset_id,
        is_from_preset
    ) VALUES (
        p_organization_id,
        v_preset.name,
        v_preset.model_number,
        v_preset.manufacturer,
        'individual',  -- 個別管理固定
        v_preset.unit,
        1,  -- デフォルト最小在庫
        v_preset.notes,
        p_preset_id,
        true
    ) RETURNING id INTO v_new_tool_id;

    RETURN v_new_tool_id;
END;
$$;

-- 関数へのコメント
COMMENT ON FUNCTION copy_preset_to_organization IS 'プリセット道具マスタを組織にコピーする関数';

-- ========================================
-- Step 8: データベーススキーマドキュメント更新用コメント
-- ========================================
COMMENT ON TABLE tool_master_presets IS '共通道具マスタプリセット: 全組織で共有される標準的な道具マスタテンプレート';
COMMENT ON COLUMN tool_master_presets.name IS '道具名';
COMMENT ON COLUMN tool_master_presets.model_number IS '型番';
COMMENT ON COLUMN tool_master_presets.manufacturer IS 'メーカー名';
COMMENT ON COLUMN tool_master_presets.category IS 'カテゴリ（電動工具、手工具など）';
COMMENT ON COLUMN tool_master_presets.unit IS '単位（個、台など）';
COMMENT ON COLUMN tool_master_presets.image_url IS '道具の画像URL';
COMMENT ON COLUMN tool_master_presets.description IS '説明';
COMMENT ON COLUMN tool_master_presets.notes IS '備考';
COMMENT ON COLUMN tool_master_presets.sort_order IS '表示順序';
COMMENT ON COLUMN tool_master_presets.is_active IS '有効/無効フラグ';
