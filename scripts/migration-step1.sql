-- ========================================
-- STEP 1: 基本テーブルの作成
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (組織)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'standard', 'premium')),
    payment_method TEXT NOT NULL DEFAULT 'invoice' CHECK (payment_method IN ('invoice', 'bank_transfer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    subdomain TEXT UNIQUE,
    industry TEXT,
    other_industry TEXT,
    employee_count INTEGER,
    representative_name TEXT,
    postal_code TEXT,
    address TEXT,
    phone TEXT,
    billing_email TEXT,
    billing_postal_code TEXT,
    billing_address TEXT,
    invoice_number TEXT,
    company_seal_url TEXT
);

-- Super Admins (システム管理者)
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'operator', 'sales')),
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    backup_codes TEXT[],
    backup_codes_used TEXT[],
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts (契約)
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('basic', 'standard', 'premium')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'active', 'suspended', 'cancelled', 'completed')),
    start_date DATE NOT NULL,
    end_date DATE,
    created_by UUID,
    created_by_name TEXT,
    billing_start_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    initial_cost INTEGER DEFAULT 0,
    monthly_cost INTEGER NOT NULL,
    additional_user_cost INTEGER DEFAULT 0,
    initial_discount_rate DECIMAL(5,2) DEFAULT 0,
    initial_discount_amount INTEGER DEFAULT 0,
    notes TEXT,
    features JSONB DEFAULT '{}',
    package_field_management BOOLEAN DEFAULT false,
    package_office_efficiency BOOLEAN DEFAULT false,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (ユーザー)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'leader', 'manager', 'staff')),
    is_active BOOLEAN DEFAULT true,
    department TEXT,
    employee_code TEXT,
    hire_date DATE,
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    address TEXT,
    must_change_password BOOLEAN DEFAULT false,
    personal_seal_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(email, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_contracts_organization ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Success message
SELECT 'Step 1: Basic tables created successfully' as status;