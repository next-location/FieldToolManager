# データベーススキーマ設計書

> **重要**: このファイルはデータベース設計の中央管理ドキュメントです。
> テーブル構造やカラムの変更時は、必ずこのファイルを更新してください。

## 目次
1. [マルチテナント対応ER図](#1-マルチテナント対応er図)
2. [全テーブル定義（SQL）](#2-全テーブル定義sql)
3. [TypeScript型定義](#3-typescript型定義)
4. [インデックス設計](#4-インデックス設計)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [制約とバリデーション](#6-制約とバリデーション)

---

## 1. マルチテナント対応ER図

### 1.1 全体構造

```
Organization (組織・企業)
├── id (PK, UUID)
├── name "A建設株式会社"
├── subdomain "a-kensetsu" (UQ)
├── plan "basic" | "premium" | "enterprise"
├── payment_method "invoice" | "bank_transfer"
├── max_users 20
├── max_tools 500
├── is_active true
└── created_at

    ↓ 1:N

User (ユーザー)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── email
├── name
├── role "admin" | "leader" | "staff"
├── deleted_at (論理削除)
└── created_at

Tool (道具) ✨UUID主キー化
├── id (PK, UUID) ← QRコードに使用
├── organization_id (FK) ← 重要！
├── tool_code TEXT ← 表示用（A-0123）
├── category_id (FK)
├── name
├── model_number
├── manufacturer
├── purchase_date
├── purchase_price
├── status "normal" | "repair" | "broken" | "disposed"
├── current_location_id (FK)
├── management_type "individual" | "quantity"
├── current_quantity INTEGER
├── unit TEXT
├── custom_fields JSONB
├── deleted_at (論理削除)
└── created_at

ToolMovement (移動履歴)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── tool_id (FK → Tool.id UUID)
├── user_id (FK)
├── from_location_id (FK)
├── to_location_id (FK)
├── movement_type "checkout" | "checkin" | "transfer"
├── quantity INTEGER DEFAULT 1
├── note
├── moved_at
├── deleted_at (論理削除)
└── created_at

Location (場所)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── type "company" | "site"
├── name
├── address
├── manager_name
├── is_active
├── deleted_at (論理削除)
└── created_at

ToolCategory (道具カテゴリ)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── name
├── code_prefix "A" | "B" | "C" | "D" | ...
├── display_order INTEGER
├── is_active BOOLEAN
└── created_at

AuditLog (監査ログ)
├── id (PK, UUID)
├── organization_id (FK)
├── user_id (FK)
├── action TEXT
├── table_name TEXT
├── record_id UUID
├── old_value JSONB
├── new_value JSONB
├── ip_address INET
├── user_agent TEXT
├── reason TEXT
└── created_at

OrganizationFeatures (機能フラグ)
├── id (PK, UUID)
├── organization_id (FK)
├── feature_key TEXT
├── is_enabled BOOLEAN
└── config JSONB

CustomFieldDefinitions (カスタムフィールド定義)
├── id (PK, UUID)
├── organization_id (FK)
├── entity_type "tool" | "location"
├── field_key TEXT
├── field_label TEXT
├── field_type "text" | "number" | "date" | "select"
├── field_options JSONB
├── is_required BOOLEAN
├── display_order INTEGER
└── created_at

Contract (契約管理)
├── id (PK, UUID)
├── organization_id (FK)
├── contract_number TEXT (UQ)
├── contract_type "monthly" | "annual"
├── plan "basic" | "premium" | "enterprise"
├── start_date DATE
├── end_date DATE
├── auto_renew BOOLEAN
├── monthly_fee DECIMAL(10, 2)
├── status "active" | "expired" | "cancelled"
├── billing_contact_name TEXT
├── billing_contact_email TEXT
├── billing_contact_phone TEXT
├── billing_address TEXT
├── notes TEXT
├── created_at TIMESTAMP
└── updated_at TIMESTAMP

Invoice (請求書)
├── id (PK, UUID)
├── organization_id (FK)
├── contract_id (FK)
├── invoice_number TEXT (UQ)
├── billing_period_start DATE
├── billing_period_end DATE
├── subtotal DECIMAL(10, 2)
├── tax DECIMAL(10, 2)
├── total DECIMAL(10, 2)
├── due_date DATE
├── status "draft" | "sent" | "paid" | "overdue" | "cancelled"
├── sent_date TIMESTAMP
├── paid_date TIMESTAMP
├── pdf_url TEXT
├── notes TEXT
├── created_at TIMESTAMP
└── updated_at TIMESTAMP

PaymentRecord (入金記録)
├── id (PK, UUID)
├── organization_id (FK)
├── invoice_id (FK)
├── payment_date DATE
├── amount DECIMAL(10, 2)
├── payment_method "bank_transfer" | "cash" | "other"
├── reference_number TEXT
├── bank_account_name TEXT
├── recorded_by UUID (FK → User)
├── notes TEXT
└── created_at TIMESTAMP
```

### 1.2 リレーション図

```
organizations
    ↓ 1:N
    ├─→ users
    ├─→ tools
    ├─→ locations
    ├─→ tool_categories
    ├─→ contracts
    ├─→ invoices
    ├─→ payment_records
    ├─→ audit_logs
    ├─→ organization_features
    └─→ custom_field_definitions

tools
    ↓ 1:N
    └─→ tool_movements

contracts
    ↓ 1:N
    └─→ invoices
            ↓ 1:N
            └─→ payment_records
```

---

## 2. 全テーブル定義（SQL）

### 2.1 コアテーブル

#### organizations (組織・企業)
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
  payment_method TEXT DEFAULT 'invoice' CHECK (payment_method IN ('invoice', 'bank_transfer')),
  max_users INTEGER DEFAULT 20,
  max_tools INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
```

#### users (ユーザー)
```sql
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

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

#### tools (道具マスタ)
```sql
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_code TEXT NOT NULL, -- 表示用ID (例: A-0123)
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

-- RLS有効化
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
```

#### tool_movements (移動履歴)
```sql
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

-- RLS有効化
ALTER TABLE tool_movements ENABLE ROW LEVEL SECURITY;
```

#### locations (場所)
```sql
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

-- RLS有効化
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
```

#### tool_categories (道具カテゴリ)
```sql
CREATE TABLE tool_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code_prefix TEXT NOT NULL, -- "A", "B", "C", ...
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, code_prefix)
);

CREATE INDEX idx_tool_categories_organization_id ON tool_categories(organization_id);
CREATE INDEX idx_tool_categories_display_order ON tool_categories(display_order);

-- RLS有効化
ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;
```

### 2.2 セキュリティ・監査テーブル

#### audit_logs (監査ログ)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
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

-- RLS有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### 2.3 機能管理テーブル

#### organization_features (機能フラグ)
```sql
CREATE TABLE organization_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- 'custom_fields', 'bulk_import', etc.
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, feature_key)
);

CREATE INDEX idx_organization_features_org_id ON organization_features(organization_id);
CREATE INDEX idx_organization_features_feature_key ON organization_features(feature_key);

-- RLS有効化
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;
```

#### custom_field_definitions (カスタムフィールド定義)
```sql
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tool', 'location')),
  field_key TEXT NOT NULL, -- 'calibration_date', 'rental_due_date', etc.
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select')),
  field_options JSONB DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, entity_type, field_key)
);

CREATE INDEX idx_custom_field_defs_org_id ON custom_field_definitions(organization_id);
CREATE INDEX idx_custom_field_defs_entity_type ON custom_field_definitions(entity_type);

-- RLS有効化
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
```

### 2.4 契約・請求管理テーブル

#### contracts (契約管理)
```sql
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

CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);

-- RLS有効化
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
```

#### invoices (請求書)
```sql
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

CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- RLS有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

#### payment_records (入金記録)
```sql
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
  reference_number TEXT,
  bank_account_name TEXT,
  recorded_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_records_organization_id ON payment_records(organization_id);
CREATE INDEX idx_payment_records_invoice_id ON payment_records(invoice_id);
CREATE INDEX idx_payment_records_payment_date ON payment_records(payment_date DESC);

-- RLS有効化
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
```

---

## 3. TypeScript型定義

### 3.1 コア型

#### Organization
```typescript
export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  plan: 'basic' | 'premium' | 'enterprise';
  payment_method: 'invoice' | 'bank_transfer';
  max_users: number;
  max_tools: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

#### User
```typescript
export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: 'staff' | 'leader' | 'admin' | 'super_admin';
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

#### Tool
```typescript
export interface Tool {
  id: string; // UUID - QRコードに使用
  organization_id: string;
  tool_code: string; // "A-0123" 表示用ID
  category_id: string;
  name: string;
  model_number?: string;
  manufacturer?: string;
  purchase_date?: Date;
  purchase_price?: number;
  status: 'normal' | 'repair' | 'broken' | 'disposed';
  current_location_id: string;
  management_type: 'individual' | 'quantity';
  current_quantity?: number;
  unit?: string;
  custom_fields?: {
    [key: string]: any;
  };
  min_stock_alert?: number;
  photo_url?: string;
  manual_url?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

#### ToolMovement
```typescript
export interface ToolMovement {
  id: string;
  organization_id: string;
  tool_id: string;
  user_id: string;
  from_location_id: string;
  to_location_id: string;
  movement_type: 'checkout' | 'checkin' | 'transfer';
  quantity: number;
  note?: string;
  moved_at: Date;
  deleted_at?: Date;
  created_at: Date;
}
```

#### Location
```typescript
export interface Location {
  id: string;
  organization_id: string;
  type: 'company' | 'site';
  name: string;
  address?: string;
  manager_name?: string;
  is_active: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

#### ToolCategory
```typescript
export interface ToolCategory {
  id: string;
  organization_id: string;
  name: string;
  code_prefix: string; // "A", "B", "C", ...
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### 3.2 監査・機能管理型

#### AuditLog
```typescript
export interface AuditLog {
  id: string;
  organization_id?: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  created_at: Date;
}
```

#### OrganizationFeature
```typescript
export interface OrganizationFeature {
  id: string;
  organization_id: string;
  feature_key: string;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
```

#### CustomFieldDefinition
```typescript
export interface CustomFieldDefinition {
  id: string;
  organization_id: string;
  entity_type: 'tool' | 'location';
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select';
  field_options?: {
    choices?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
  };
  is_required: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}
```

### 3.3 契約・請求型

#### Contract
```typescript
export interface Contract {
  id: string;
  organization_id: string;
  contract_number: string;
  contract_type: 'monthly' | 'annual';
  plan: 'basic' | 'premium' | 'enterprise';
  start_date: Date;
  end_date?: Date;
  auto_renew: boolean;
  monthly_fee: number;
  status: 'active' | 'expired' | 'cancelled';
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
  billing_address?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### Invoice
```typescript
export interface Invoice {
  id: string;
  organization_id: string;
  contract_id?: string;
  invoice_number: string;
  billing_period_start: Date;
  billing_period_end: Date;
  subtotal: number;
  tax: number;
  total: number;
  due_date: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sent_date?: Date;
  paid_date?: Date;
  pdf_url?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### PaymentRecord
```typescript
export interface PaymentRecord {
  id: string;
  organization_id: string;
  invoice_id: string;
  payment_date: Date;
  amount: number;
  payment_method: 'bank_transfer' | 'cash' | 'other';
  reference_number?: string;
  bank_account_name?: string;
  recorded_by?: string;
  notes?: string;
  created_at: Date;
}
```

---

## 4. インデックス設計

### 4.1 パフォーマンス最適化のためのインデックス

```sql
-- 頻繁に使用されるクエリのための複合インデックス

-- ツール検索（組織内 + 未削除）
CREATE INDEX idx_tools_org_active ON tools(organization_id, deleted_at)
WHERE deleted_at IS NULL;

-- 移動履歴検索（組織内 + 日付降順）
CREATE INDEX idx_movements_org_date ON tool_movements(organization_id, moved_at DESC)
WHERE deleted_at IS NULL;

-- ユーザー検索（組織内 + 未削除）
CREATE INDEX idx_users_org_active ON users(organization_id, deleted_at)
WHERE deleted_at IS NULL;

-- 請求書ステータス検索
CREATE INDEX idx_invoices_org_status ON invoices(organization_id, status, due_date);

-- 監査ログ検索（組織内 + 日付降順）
CREATE INDEX idx_audit_org_date ON audit_logs(organization_id, created_at DESC);
```

### 4.2 全文検索用インデックス（オプション）

```sql
-- ツール名・型番の全文検索
CREATE INDEX idx_tools_fulltext ON tools
USING gin(to_tsvector('japanese', name || ' ' || COALESCE(model_number, '')));

-- ユーザー名・メールの全文検索
CREATE INDEX idx_users_fulltext ON users
USING gin(to_tsvector('japanese', name || ' ' || email));
```

---

## 5. Row Level Security (RLS)

### 5.1 基本ポリシー

#### tools テーブルのRLS
```sql
-- 自組織のデータのみ閲覧可能
CREATE POLICY "tools_select_own_org"
  ON tools FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 自組織のデータのみ挿入可能
CREATE POLICY "tools_insert_own_org"
  ON tools FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 自組織のデータのみ更新可能
CREATE POLICY "tools_update_own_org"
  ON tools FOR UPDATE
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 自組織のデータのみ削除可能（論理削除）
CREATE POLICY "tools_delete_own_org"
  ON tools FOR DELETE
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### users テーブルのRLS
```sql
CREATE POLICY "users_select_own_org"
  ON users FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "users_insert_own_org"
  ON users FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_org"
  ON users FOR UPDATE
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### tool_movements テーブルのRLS
```sql
CREATE POLICY "movements_select_own_org"
  ON tool_movements FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "movements_insert_own_org"
  ON tool_movements FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### locations テーブルのRLS
```sql
CREATE POLICY "locations_select_own_org"
  ON locations FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "locations_insert_own_org"
  ON locations FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### audit_logs テーブルのRLS
```sql
-- 監査ログは管理者のみ閲覧可能
CREATE POLICY "audit_logs_admin_only"
  ON audit_logs FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 監査ログは自動記録のみ（ユーザーは直接挿入不可）
CREATE POLICY "audit_logs_system_insert"
  ON audit_logs FOR INSERT
  WITH CHECK (false); -- トリガーからのみ挿入
```

### 5.2 機能フラグによる制御

```sql
-- カスタムフィールドへのアクセス制御
CREATE POLICY "custom_fields_feature_enabled"
  ON custom_field_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_features
      WHERE organization_id = custom_field_definitions.organization_id
        AND feature_key = 'custom_fields'
        AND is_enabled = true
    )
  );
```

---

## 6. 制約とバリデーション

### 6.1 CHECK制約

```sql
-- ツールの在庫数は0以上
ALTER TABLE tools ADD CONSTRAINT tools_quantity_positive
CHECK (current_quantity >= 0);

-- 請求書の金額は0以上
ALTER TABLE invoices ADD CONSTRAINT invoices_total_positive
CHECK (total >= 0);

-- 契約の開始日は終了日より前
ALTER TABLE contracts ADD CONSTRAINT contracts_date_order
CHECK (start_date < end_date OR end_date IS NULL);
```

### 6.2 外部キー制約

```sql
-- カスケード削除の設定
-- organization削除時、関連データも削除
ALTER TABLE users
ADD CONSTRAINT users_organization_fk
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- tool削除時、移動履歴も削除
ALTER TABLE tool_movements
ADD CONSTRAINT movements_tool_fk
FOREIGN KEY (tool_id)
REFERENCES tools(id)
ON DELETE CASCADE;
```

### 6.3 UNIQUE制約

```sql
-- 組織内でtool_codeは一意
ALTER TABLE tools
ADD CONSTRAINT tools_code_unique
UNIQUE (organization_id, tool_code);

-- 組織内でカテゴリのcode_prefixは一意
ALTER TABLE tool_categories
ADD CONSTRAINT categories_prefix_unique
UNIQUE (organization_id, code_prefix);

-- サブドメインはグローバルに一意
ALTER TABLE organizations
ADD CONSTRAINT organizations_subdomain_unique
UNIQUE (subdomain);
```

---

## 参照ドキュメント

- **マイグレーション管理**: [MIGRATIONS.md](./MIGRATIONS.md)
- **全体仕様**: [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md)
- **環境セットアップ**: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-01 | 1.0.0 | 初版作成（SPECIFICATION_SAAS_FINAL.mdから分離） |
