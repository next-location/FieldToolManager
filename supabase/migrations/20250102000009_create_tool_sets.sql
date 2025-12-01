-- ========================================
-- Tool Sets (道具セット機能)
-- ========================================

-- 道具セットマスタ
CREATE TABLE tool_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- 道具セットの内容（セットに含まれる道具）
CREATE TABLE tool_set_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_set_id UUID NOT NULL REFERENCES tool_sets(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tool_set_id, tool_id)
);

-- インデックス
CREATE INDEX idx_tool_sets_organization ON tool_sets(organization_id);
CREATE INDEX idx_tool_sets_deleted_at ON tool_sets(deleted_at);
CREATE INDEX idx_tool_set_items_set ON tool_set_items(tool_set_id);
CREATE INDEX idx_tool_set_items_tool ON tool_set_items(tool_id);

-- 更新日時の自動更新
CREATE TRIGGER update_tool_sets_updated_at BEFORE UPDATE ON tool_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシー
ALTER TABLE tool_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_set_items ENABLE ROW LEVEL SECURITY;

-- 道具セット: 組織内のユーザーは閲覧可能
CREATE POLICY "Users can view organization tool sets"
    ON tool_sets FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- 道具セット: 管理者とマネージャーは作成・更新・削除可能
CREATE POLICY "Managers can manage tool sets"
    ON tool_sets FOR ALL
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')));

-- 道具セットアイテム: 組織内のユーザーは閲覧可能
CREATE POLICY "Users can view organization tool set items"
    ON tool_set_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM tool_sets WHERE id = tool_set_items.tool_set_id
                   AND organization_id = public.get_organization_id() AND deleted_at IS NULL));

-- 道具セットアイテム: 管理者とマネージャーは作成・更新・削除可能
CREATE POLICY "Managers can manage tool set items"
    ON tool_set_items FOR ALL
    USING (EXISTS (SELECT 1 FROM tool_sets
                   WHERE id = tool_set_items.tool_set_id
                   AND organization_id = public.get_organization_id()
                   AND EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                               AND id = auth.uid() AND role IN ('admin', 'manager'))));
