-- 個別道具アイテムテーブルの作成
-- tools: 道具マスタ（種類）
-- tool_items: 物理的な個別アイテム（各QRコード）

-- Step 1: tool_itemsテーブルを作成
CREATE TABLE tool_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- 個別識別情報
    serial_number TEXT NOT NULL, -- "001", "002", "A", "B" など
    qr_code UUID NOT NULL DEFAULT uuid_generate_v4(),

    -- 現在の状態
    current_location TEXT NOT NULL DEFAULT 'warehouse' CHECK (current_location IN ('warehouse', 'site', 'repair', 'lost')),
    current_site_id UUID REFERENCES sites(id),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost')),

    -- メモ（個別アイテムに対する特記事項）
    notes TEXT,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- 制約：同じ組織内で同じ道具の同じシリアル番号は重複不可
    UNIQUE(organization_id, tool_id, serial_number)
);

-- Step 2: インデックス作成
CREATE INDEX idx_tool_items_tool_id ON tool_items(tool_id);
CREATE INDEX idx_tool_items_organization_id ON tool_items(organization_id);
CREATE INDEX idx_tool_items_qr_code ON tool_items(qr_code);
CREATE INDEX idx_tool_items_current_site ON tool_items(current_site_id);
CREATE INDEX idx_tool_items_deleted ON tool_items(deleted_at);
CREATE INDEX idx_tool_items_status ON tool_items(status);

-- Step 3: toolsテーブルから不要になるフィールドを削除する前の準備
-- 既存のtoolsテーブルから個別アイテム関連フィールドをコメント化
COMMENT ON COLUMN tools.quantity IS 'DEPRECATED: 個別アイテム数はtool_itemsテーブルで管理';
COMMENT ON COLUMN tools.current_location IS 'DEPRECATED: 個別の位置情報はtool_itemsテーブルで管理';
COMMENT ON COLUMN tools.current_site_id IS 'DEPRECATED: 個別の現場情報はtool_itemsテーブルで管理';
COMMENT ON COLUMN tools.status IS 'DEPRECATED: 個別のステータスはtool_itemsテーブルで管理';
COMMENT ON COLUMN tools.qr_code IS 'DEPRECATED: 個別のQRコードはtool_itemsテーブルで管理';

-- Step 4: tool_movementsテーブルを更新（tool_idからtool_item_idへ）
ALTER TABLE tool_movements ADD COLUMN tool_item_id UUID REFERENCES tool_items(id);
COMMENT ON COLUMN tool_movements.tool_id IS 'DEPRECATED: tool_item_idを使用してください';

-- Step 5: tool_set_itemsテーブルを更新
ALTER TABLE tool_set_items ADD COLUMN tool_item_id UUID REFERENCES tool_items(id);
COMMENT ON COLUMN tool_set_items.tool_id IS 'DEPRECATED: 種類単位での登録に使用（後でtool_item_id指定に移行）';

-- Step 6: updated_atトリガー
CREATE TRIGGER update_tool_items_updated_at
    BEFORE UPDATE ON tool_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: RLSを有効化
ALTER TABLE tool_items ENABLE ROW LEVEL SECURITY;

-- Step 8: RLSポリシー作成
-- SELECT: 同じ組織のユーザーは閲覧可能
CREATE POLICY "Users can view tool items in their organization"
    ON tool_items FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- INSERT: 同じ組織のadmin/managerが作成可能
CREATE POLICY "Admins and managers can create tool items"
    ON tool_items FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- UPDATE: 同じ組織のadmin/managerが更新可能
CREATE POLICY "Admins and managers can update tool items"
    ON tool_items FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- DELETE: 削除は stored procedure 経由のみ（論理削除）
CREATE POLICY "No direct deletes on tool items"
    ON tool_items FOR DELETE
    USING (false);

-- Step 9: 論理削除用のストアドプロシージャ
CREATE OR REPLACE FUNCTION delete_tool_item(item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
  item_org_id UUID;
  user_role TEXT;
BEGIN
  -- ユーザーの組織とロールを取得
  SELECT organization_id, role INTO user_org_id, user_role
  FROM users WHERE id = auth.uid();

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION '認証が必要です';
  END IF;

  -- アイテムの組織を取得
  SELECT organization_id INTO item_org_id
  FROM tool_items WHERE id = item_id;

  IF item_org_id IS NULL THEN
    RAISE EXCEPTION '指定された道具アイテムが見つかりません';
  END IF;

  -- 組織が一致するか確認
  IF user_org_id != item_org_id THEN
    RAISE EXCEPTION '他の組織の道具アイテムは削除できません';
  END IF;

  -- 権限確認
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 論理削除を実行
  UPDATE tool_items
  SET deleted_at = NOW()
  WHERE id = item_id;
END;
$$;
