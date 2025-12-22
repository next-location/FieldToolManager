-- ========================================
-- STEP 3: 業務管理テーブルの作成
-- ========================================

-- Clients (取引先)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    name_kana TEXT,
    type TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'supplier', 'both')),
    postal_code TEXT,
    address TEXT,
    phone TEXT,
    fax TEXT,
    email TEXT,
    website TEXT,
    representative_name TEXT,
    representative_title TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    payment_terms TEXT,
    payment_method TEXT,
    bank_name TEXT,
    bank_branch TEXT,
    bank_account_type TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,
    tax_registration_number TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Work Reports (作業報告書)
CREATE TABLE IF NOT EXISTS work_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    title TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    site_name TEXT,
    start_time TIME,
    end_time TIME,
    weather TEXT,
    temperature DECIMAL(3,1),
    humidity INTEGER,
    workers_count INTEGER,
    work_content TEXT,
    materials_used TEXT,
    equipment_used TEXT,
    safety_notes TEXT,
    quality_notes TEXT,
    tomorrow_plan TEXT,
    issues TEXT,
    improvements TEXT,
    photos JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'revised')),
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    approval_comments TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Records (勤怠記録)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    break_start TIME,
    break_end TIME,
    work_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    location_type TEXT CHECK (location_type IN ('office', 'site', 'remote', 'other')),
    notes TEXT,
    status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded', 'approved', 'corrected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Attendance Settings (勤怠設定)
CREATE TABLE IF NOT EXISTS attendance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    work_start_time TIME DEFAULT '09:00',
    work_end_time TIME DEFAULT '18:00',
    break_duration INTEGER DEFAULT 60,
    overtime_threshold DECIMAL(3,1) DEFAULT 8.0,
    auto_break BOOLEAN DEFAULT false,
    allow_early_clock_in INTEGER DEFAULT 15,
    allow_late_clock_out INTEGER DEFAULT 60,
    require_location BOOLEAN DEFAULT false,
    require_photo BOOLEAN DEFAULT false,
    enable_site_qr BOOLEAN DEFAULT true,
    enable_leader_qr BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimates (見積書)
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_number TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    title TEXT NOT NULL,
    estimate_date DATE NOT NULL,
    valid_until DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_terms TEXT,
    delivery_date TEXT,
    delivery_location TEXT,
    notes TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'sent', 'approved', 'rejected', 'expired', 'cancelled')),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approval_comment TEXT,
    is_tax_inclusive BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, estimate_number)
);

-- Estimate Items (見積項目)
CREATE TABLE IF NOT EXISTS estimate_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (請求書)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT,
    payment_terms TEXT,
    bank_details TEXT,
    notes TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    paid_date DATE,
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_to_emails TEXT[],
    reminder_sent_at TIMESTAMPTZ,
    is_tax_inclusive BOOLEAN DEFAULT false,
    registration_number TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

-- Invoice Items (請求項目)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'normal' CHECK (item_type IN ('normal', 'discount', 'tax_adjustment')),
    item_name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders (発注書)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    supplier_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    title TEXT NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    delivery_location TEXT,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_terms TEXT,
    payment_method TEXT,
    notes TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'sent', 'approved', 'rejected', 'received', 'cancelled')),
    is_tax_inclusive BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, order_number)
);

-- Purchase Order Items (発注項目)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_order INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing Invoices (Stripe請求書)
CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    stripe_invoice_id TEXT UNIQUE,
    invoice_number TEXT NOT NULL,
    billing_month DATE NOT NULL,
    amount INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    description TEXT,
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_organization ON work_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_status ON work_reports(status);
CREATE INDEX IF NOT EXISTS idx_attendance_organization ON attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_estimates_organization ON estimates(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_organization ON billing_invoices(organization_id);

-- Success message
SELECT 'Step 3: Business management tables created successfully' as status;