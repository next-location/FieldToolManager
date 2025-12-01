-- ========================================
-- Field Tool Manager Initial Schema
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Organizations (組織)
-- ========================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'enterprise')),
    payment_method TEXT NOT NULL DEFAULT 'invoice' CHECK (payment_method IN ('invoice', 'bank_transfer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ========================================
-- Users (ユーザー)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- ========================================
-- Tool Categories (工具カテゴリ)
-- ========================================
CREATE TABLE tool_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES tool_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- ========================================
-- Tools (工具)
-- ========================================
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tool_categories(id) ON DELETE SET NULL,
    qr_code UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    name TEXT NOT NULL,
    model_number TEXT,
    manufacturer TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    current_location TEXT NOT NULL DEFAULT 'warehouse' CHECK (current_location IN ('warehouse', 'site', 'repair', 'lost')),
    current_site_id UUID,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost', 'disposed')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    minimum_stock INTEGER DEFAULT 1,
    custom_fields JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ========================================
-- Sites (現場)
-- ========================================
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(organization_id, name)
);

-- ========================================
-- Tool Movements (工具移動履歴)
-- ========================================
CREATE TABLE tool_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('check_out', 'check_in', 'transfer', 'repair', 'return_from_repair')),
    from_location TEXT,
    to_location TEXT,
    from_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    to_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Contracts (契約管理)
-- ========================================
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_number TEXT NOT NULL UNIQUE,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('monthly', 'annual')),
    plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
    monthly_fee DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ========================================
-- Invoices (請求書)
-- ========================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    sent_date TIMESTAMPTZ,
    paid_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Payment Records (入金記録)
-- ========================================
CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ========================================
-- Audit Logs (監査ログ)
-- ========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Indexes for Performance
-- ========================================
CREATE INDEX idx_tools_organization ON tools(organization_id);
CREATE INDEX idx_tools_qr_code ON tools(qr_code);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_location ON tools(current_location);
CREATE INDEX idx_tools_deleted_at ON tools(deleted_at);

CREATE INDEX idx_movements_organization ON tool_movements(organization_id);
CREATE INDEX idx_movements_tool ON tool_movements(tool_id);
CREATE INDEX idx_movements_created_at ON tool_movements(created_at DESC);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_sites_organization ON sites(organization_id);

CREATE INDEX idx_contracts_organization ON contracts(organization_id);
CREATE INDEX idx_contracts_status ON contracts(status);

CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_audit_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ========================================
-- Updated At Trigger Function
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- Apply Updated At Triggers
-- ========================================
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_categories_updated_at BEFORE UPDATE ON tool_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();