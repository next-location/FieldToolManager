-- ========================================
-- STEP 2: 道具・現場管理テーブルの作成
-- ========================================

-- Tool Categories (工具カテゴリ)
CREATE TABLE IF NOT EXISTS tool_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES tool_categories(id) ON DELETE SET NULL,
    is_common BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Tool Manufacturers (メーカー)
CREATE TABLE IF NOT EXISTS tool_manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_kana TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites (現場)
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Tool Sets (工具セット)
CREATE TABLE IF NOT EXISTS tool_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    qr_code UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES tool_categories(id) ON DELETE SET NULL,
    model_number TEXT,
    manufacturer TEXT,
    manufacturer_id UUID REFERENCES tool_manufacturers(id) ON DELETE SET NULL,
    image_url TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    minimum_stock INTEGER DEFAULT 1,
    warranty_date DATE,
    warranty_info TEXT,
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Tool Items (個別工具)
CREATE TABLE IF NOT EXISTS tool_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tool_set_id UUID NOT NULL REFERENCES tool_sets(id) ON DELETE CASCADE,
    qr_code UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    serial_number TEXT,
    individual_name TEXT,
    current_location TEXT NOT NULL DEFAULT 'warehouse' CHECK (current_location IN ('warehouse', 'site', 'repair', 'lost')),
    current_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost', 'disposed')),
    condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor')),
    last_inspection_date DATE,
    next_inspection_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Tool Movements (工具移動履歴)
CREATE TABLE IF NOT EXISTS tool_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tool_item_id UUID NOT NULL REFERENCES tool_items(id) ON DELETE CASCADE,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    from_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    to_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    moved_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouse Locations (倉庫位置)
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Consumables (消耗品)
CREATE TABLE IF NOT EXISTS consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tool_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    model_number TEXT,
    manufacturer TEXT,
    manufacturer_id UUID REFERENCES tool_manufacturers(id) ON DELETE SET NULL,
    image_url TEXT,
    unit TEXT NOT NULL DEFAULT '個' CHECK (unit IN ('個', '箱', 'セット', 'パック', 'ケース', '本', '枚', '巻', 'kg', 'L', 'm')),
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    unit_price DECIMAL(10, 2),
    supplier TEXT,
    order_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Consumable Orders (消耗品発注)
CREATE TABLE IF NOT EXISTS consumable_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    consumable_id UUID NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'delivered', 'cancelled')),
    supplier TEXT,
    notes TEXT,
    ordered_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Heavy Equipment (重機)
CREATE TABLE IF NOT EXISTS heavy_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    qr_code UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    name TEXT NOT NULL,
    model TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    registration_number TEXT,
    image_url TEXT,
    current_location TEXT NOT NULL DEFAULT 'warehouse' CHECK (current_location IN ('warehouse', 'site', 'maintenance', 'disposed')),
    current_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'inspection', 'disposed')),
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    last_inspection_date DATE,
    next_inspection_date DATE,
    inspection_certificate_url TEXT,
    insurance_expiry_date DATE,
    insurance_document_url TEXT,
    fuel_type TEXT,
    hour_meter_reading DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Tool Master Presets (共通道具マスタ)
CREATE TABLE IF NOT EXISTS tool_master_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    model_number TEXT,
    manufacturer TEXT,
    manufacturer_id UUID REFERENCES tool_manufacturers(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tool_categories_organization ON tool_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_organization ON sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_tool_sets_organization ON tool_sets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tool_items_organization ON tool_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_tool_items_tool_set ON tool_items(tool_set_id);
CREATE INDEX IF NOT EXISTS idx_tool_movements_organization ON tool_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumables_organization ON consumables(organization_id);
CREATE INDEX IF NOT EXISTS idx_heavy_equipment_organization ON heavy_equipment(organization_id);

-- Success message
SELECT 'Step 2: Tool and site management tables created successfully' as status;