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
├── require_qr_scan_on_movement BOOLEAN ← QRスキャン必須設定
├── require_qr_scan_on_return BOOLEAN ← 返却時QRスキャン必須
├── require_approval_for_loss BOOLEAN ← 紛失承認フロー
├── enable_monthly_inventory_reminder BOOLEAN ← 月次棚卸し通知
├── enable_site_closure_checklist BOOLEAN ← 現場終了チェックリスト
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

Tool (道具マスタ - 種類) ✨個別管理対応
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── name "電動ドリル"
├── model_number "DRL-5000"
├── manufacturer "マキタ"
├── purchase_date
├── purchase_price
├── quantity INTEGER ← 全体の個数（表示用）
├── minimum_stock ← 最小在庫数
├── category_id (FK)
├── custom_fields JSONB
├── deleted_at (論理削除)
└── created_at

    ↓ 1:N

ToolItem (個別アイテム - 物理的な道具) ✨新規追加
├── id (PK, UUID)
├── tool_id (FK → Tool.id) ← 道具マスタへの参照
├── organization_id (FK) ← 重要！
├── serial_number "001" | "002" | "003" ... ← 個別識別番号
├── qr_code UUID (UQ) ← 個別QRコード
├── current_location "warehouse" | "site" | "repair" | "lost"
├── current_site_id (FK → sites)
├── warehouse_location_id (FK → warehouse_locations) ← 倉庫内位置 ✨NEW
├── status "available" | "in_use" | "maintenance" | "lost"
├── notes TEXT ← 個別メモ
├── deleted_at (論理削除)
├── created_at
└── updated_at

ToolMovement (移動履歴) ✨tool_item_id対応
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── tool_id (FK → Tool.id) ← DEPRECATED
├── tool_item_id (FK → ToolItem.id) ← 個別アイテムIDを使用
├── user_id (FK)
├── from_location TEXT
├── to_location TEXT
├── from_site_id (FK)
├── to_site_id (FK)
├── movement_type "check_out" | "check_in" | "transfer" | "repair" | "return_from_repair" | "lost" | "disposed" | "maintenance" | "correction"
├── quantity INTEGER DEFAULT 1
├── performed_by (FK → User.id) ← 実行者
├── notes TEXT
├── created_at
└── deleted_at (論理削除)

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

ToolSet (道具セット - テンプレート) ✨新規追加
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── name "基本工具セット" | "電動工具セット" | ...
├── description TEXT
├── created_by (FK → User.id)
├── created_at
├── updated_at
└── deleted_at (論理削除)

    ↓ 1:N

ToolSetItem (道具セット内容) ✨tool_item_id対応
├── id (PK, UUID)
├── tool_set_id (FK → ToolSet.id)
├── tool_id (FK → Tool.id) ← DEPRECATED: 種類単位での登録用
├── tool_item_id (FK → ToolItem.id) ← 個別アイテムを明示的に指定
├── quantity INTEGER ← DEPRECATED (tool_item_idを使う場合は不要)
└── created_at

**運用方針**: セットは「よく使う道具の組み合わせ」のテンプレート。
個別アイテム（#001, #002）を明示的に登録し、移動時に間違いを防ぐ。

**道具マスタ選択機能** (v1.2.0で追加):
道具登録時に既存の道具マスタから選択可能。同じ種類の道具を追加登録する際、
道具名・型番・メーカーなどの再入力が不要になり、ユーザビリティが向上。
- **既存マスタから登録**: 道具マスタを選択 → 個数のみ入力 → 個別アイテム作成
- **新規マスタ作成**: 道具マスタを新規作成 → 個数入力 → 個別アイテム作成
- serial_numberは既存の最大値+1から開始（例: #003まで存在 → 次は#004から）

---

WarehouseLocationTemplate (倉庫階層設定) ✨NEW
├── id (PK, UUID)
├── organization_id (FK → Organization.id) ← 重要！
├── level INTEGER (1, 2, 3, 4, 5) ← 階層レベル
├── label TEXT "エリア" | "棚" | "保管方法" | "段" ... ← 階層名
├── is_active BOOLEAN DEFAULT true ← 有効/無効
├── display_order INTEGER DEFAULT 0 ← 表示順
├── created_at
└── updated_at

**用途**: 企業ごとに倉庫の階層構造をカスタマイズ
- 例1（3階層）: レベル1=エリア、レベル2=棚、レベル3=段
- 例2（1階層）: レベル1=場所のみ
- 例3（4階層）: レベル1=フロア、レベル2=エリア、レベル3=保管方法、レベル4=番号

UNIQUE(organization_id, level) ← 1組織で同じレベルは1つのみ

    ↓ 設定に基づいて位置を登録

WarehouseLocation (倉庫位置マスタ) ✨NEW
├── id (PK, UUID)
├── organization_id (FK → Organization.id) ← 重要！
├── code TEXT "A-1-上" | "北側-壁掛け-3" | "1F-工具-棚-5" ← 位置コード
├── display_name TEXT "Aエリア 1番棚 上段" ← 表示名
├── parent_id (FK → WarehouseLocation.id) ← 親位置（階層構造）
├── level INTEGER DEFAULT 0 ← 階層レベル（0=ルート）
├── qr_code TEXT (UQ) ← 位置QRコード（UUID）
├── description TEXT ← 説明（「入口から左手2番目の棚」）
├── sort_order INTEGER DEFAULT 0 ← 表示順
├── is_active BOOLEAN DEFAULT true
├── created_at
├── updated_at
└── deleted_at (論理削除)

**用途**: 倉庫内の具体的な位置を管理
- QRコード付きで位置を識別
- 階層構造で柔軟な管理（棚、壁掛け、床置き、コンテナなど）
- 位置から道具を検索可能

UNIQUE(organization_id, code) ← 1組織内で位置コードは一意

    ↓ 1:N (1つの位置に複数の道具)

ToolItem.warehouse_location_id (FK → WarehouseLocation.id)
- current_location = 'warehouse' の場合のみ有効
- 現場にいる道具は NULL

---

ConsumableInventory (消耗品在庫) ✨NEW
├── id (PK, UUID)
├── organization_id (FK → Organization.id) ← 重要！
├── tool_id (FK → Tool.id) ← 消耗品マスタ
├── location_type "warehouse" | "site" ← 在庫場所タイプ
├── site_id (FK → Site.id) ← 現場の場合
├── warehouse_location_id (FK → WarehouseLocation.id) ← 倉庫の場合
├── quantity INTEGER ← 在庫数量
├── created_at
└── updated_at

**用途**: 消耗品（軍手、テープなど）の場所別在庫を数量で管理
- 倉庫在庫: location_type = 'warehouse', site_id = NULL
- 現場在庫: location_type = 'site', site_id = '現場ID'
- UNIQUE制約: (organization_id, tool_id, location_type, site_id, warehouse_location_id)

ConsumableMovement (消耗品移動履歴) ✨NEW
├── id (PK, UUID)
├── organization_id (FK → Organization.id) ← 重要！
├── tool_id (FK → Tool.id) ← 消耗品マスタ
├── movement_type "入庫" | "出庫" | "移動" | "調整" | "棚卸"
├── from_location_type "warehouse" | "site" ← 移動元タイプ
├── from_site_id (FK → Site.id) ← 移動元現場
├── to_location_type "warehouse" | "site" ← 移動先タイプ
├── to_site_id (FK → Site.id) ← 移動先現場
├── quantity INTEGER ← 移動数量
├── notes TEXT ← メモ
├── performed_by (FK → User.id) ← 実行者
└── created_at

**用途**: 消耗品の移動・調整履歴を記録
- tool_movementsとは別テーブルで管理
- 個別アイテムIDは不要（数量管理）

---

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
| 2025-12-02 | 1.1.0 | **個別アイテム管理対応**: tool_itemsテーブル追加、各物理道具に個別QRコード割り当て |
| 2025-12-02 | 1.1.0 | **組織設定機能追加**: QRスキャン必須モード、紛失承認フロー等の運用カスタマイズ設定 |
| 2025-12-02 | 1.1.0 | **道具セット更新**: tool_item_id対応、テンプレート方式での運用 |
| 2025-12-02 | 1.2.0 | **道具マスタ選択機能追加**: 既存の道具マスタから選択可能に、再入力不要でUX向上 |
| 2025-12-02 | 1.3.0 | **スマート移動フォーム実装**: 移動種別自動判定、位置修正モード（2ステップ）、個別アイテム詳細ページ追加 |
| 2025-12-02 | 1.4.0 | **ステータス管理機能追加**: 紛失報告、廃棄登録、メンテナンス登録機能、新しいmovement_type追加 |
| 2025-12-02 | 1.5.0 | **消耗品管理機能実装**: consumable_inventory（在庫）、consumable_movements（移動履歴）テーブル追加 |

---

## 最新の機能詳細

### v1.4.0: ステータス管理機能（紛失・廃棄・メンテナンス）

#### 概要
個別アイテムの特別な状態（紛失、廃棄、メンテナンス）を管理する機能を追加。通常の移動とは異なる、道具のライフサイクル管理を実現。

#### 新しいステータスとmovement_type

| ステータス | movement_type | 説明 | アイコン |
|-----------|---------------|------|---------|
| `lost` | `lost` | 紛失した道具 | 🚨 |
| `disposed` | `disposed` | 廃棄済みの道具（修理不可、老朽化） | 🗑️ |
| `maintenance` | `maintenance` | メンテナンス中の道具 | 🔧 |
| - | `correction` | 位置修正（既存） | 🔄 |

#### 実装された機能

**1. ステータス変更UI**

個別アイテム詳細ページ（`/tool-items/[id]`）に「ステータス変更」カードを追加：
- 🚨 **紛失報告**ボタン
- 🗑️ **廃棄登録**ボタン
- 🔧 **メンテナンス**ボタン

**2. モーダルダイアログ**

各ボタンクリック時にモーダルが表示：
- 詳細入力（必須）
  - 紛失: 紛失した状況や最後に見た場所
  - 廃棄: 廃棄の理由（故障、老朽化など）
  - メンテナンス: メンテナンス内容や実施予定日
- 確認ボタン/キャンセルボタン

**3. データ更新フロー**

```
ステータス変更ボタンクリック
  ↓
モーダル表示
  ↓
詳細入力（必須）
  ↓
登録
  ↓
1. tool_items.status を更新
2. tool_movements に履歴記録
3. tools.quantity を更新（紛失・廃棄の場合）
  ↓
個別アイテム詳細ページ更新
```

**4. 在庫数の自動調整**

紛失・廃棄時の処理：
```typescript
// 利用可能な個別アイテム数をカウント
const { count } = await supabase
  .from('tool_items')
  .select('*', { count: 'exact', head: true })
  .eq('tool_id', toolId)
  .in('status', ['available', 'in_use', 'maintenance'])
  .is('deleted_at', null)

// 道具マスタの数量を更新
await supabase
  .from('tools')
  .update({ quantity: count || 0 })
  .eq('id', toolId)
```

**5. 移動履歴への記録**

tool_movementsテーブルに以下の情報を記録：
- `movement_type`: 'lost' | 'disposed' | 'maintenance'
- `from_location`: 現在地（変更なし）
- `to_location`: 現在地（変更なし）
- `notes`: ユーザー入力の詳細
- `performed_by`: 実行者のユーザーID

#### 実装ファイル

| ファイル | 役割 | タイプ |
|---------|------|--------|
| `/app/tool-items/actions.ts` | ステータス更新ロジック | Server Action |
| `/app/tool-items/[id]/StatusChangeButton.tsx` | UIコンポーネント | Client Component |
| `/app/tool-items/[id]/page.tsx` | 個別アイテム詳細ページ（更新） | Server Component |
| `/app/movements/page.tsx` | 移動履歴一覧（ラベル追加） | Server Component |

#### ボタン表示制御

現在のステータスによって表示されるボタンを制限：

| 現在のステータス | 表示されるボタン |
|-----------------|-----------------|
| `available` | 🚨 紛失報告、🗑️ 廃棄登録、🔧 メンテナンス |
| `in_use` | 🚨 紛失報告、🗑️ 廃棄登録、🔧 メンテナンス |
| `maintenance` | 🚨 紛失報告、🗑️ 廃棄登録 |
| `lost` | 🗑️ 廃棄登録 |
| `disposed` | なし（最終状態） |

#### 監査ログ

すべてのステータス変更は`tool_movements`テーブルに記録され、以下の情報が追跡可能：
- いつ（created_at）
- 誰が（performed_by）
- 何を（movement_type）
- なぜ（notes）

---

### v1.3.0: スマート移動フォームと位置修正機能

#### 1. 移動種別の自動判定
現在地と移動先の組み合わせから、移動種別を自動的に決定：

| 現在地 | 移動先 | 移動種別 | ラベル |
|--------|--------|---------|--------|
| 倉庫 | 現場 | `check_out` | 🔵 持ち出し |
| 現場 | 倉庫 | `check_in` | 🟢 返却 |
| 現場 | 現場 | `transfer` | 🔄 移動 |
| 任意 | 修理 | `repair` | 🔧 修理に出す |
| 修理 | 倉庫 | `return_from_repair` | ✅ 修理完了 |

**実装ファイル**: `/app/movements/new/MovementForm.tsx`

```typescript
const getMovementType = (): string => {
  if (correctionMode) return 'correction'
  const from = selectedItem.current_location
  const to = destination

  if (to === 'repair') return 'repair'
  if (from === 'repair' && to === 'warehouse') return 'return_from_repair'
  if (from === 'warehouse' && to === 'site') return 'check_out'
  if (from === 'site' && to === 'warehouse') return 'check_in'
  if (from === 'site' && to === 'site') return 'transfer'
  return ''
}
```

#### 2. 位置修正モード（Location Correction）

システムの記録と実際の場所が異なる場合に使用する特別なモード。

**使用例**:
- システム記録: 「現場A」
- 実際の場所: 「倉庫」（返却記録漏れ）
- 移動先: 「現場B」

**2ステップのフロー**:

**STEP 1**: 実際の現在地を選択
- ユーザーが物理的に道具を見つけた場所を選択
- システム記録をこの場所に修正

**STEP 2**: 移動先を選択
- 位置修正後、道具をどこに移動するか選択

**監査ログ**:
- `movement_type = 'correction'` として記録
- `notes` に `[位置修正]` タグを自動付与
- 位置修正の理由入力が必須（ユーザー入力）

#### 3. 個別アイテム詳細ページ

**URL**: `/tool-items/[id]`

表示内容:
- 基本情報（シリアル番号、現在地、ステータス）
- QRコード表示（200px）
- この個別アイテムの移動履歴タイムライン
- 「📦 移動」ボタン（移動フォームへ遷移）

**実装ファイル**: `/app/tool-items/[id]/page.tsx`

#### 4. UI/UX改善

**削除された要素**:
- ❌ 移動元現場の選択フィールド → 自動取得・表示（読み取り専用）
- ❌ 移動種別の手動選択 → 自動判定
- ❌ 数量入力フィールド → 常に1（hidden field）
- ❌ 移動履歴の数量列 → 個別管理では不要

**追加された要素**:
- ✅ 3つの大きなボタン（倉庫に戻す / 現場に移動 / 修理に出す）
- ✅ 位置修正モードトグル
- ✅ 自動判定された移動種別の表示（青いボックス）
- ✅ 位置修正の処理説明プレビュー（黄色いボックス）

#### 5. データフロー

```
個別アイテム詳細ページ
  ↓ 「📦 移動」ボタン
  ↓
移動登録フォーム（tool_item_id付き）
  ↓ 現在地を自動取得
  ↓ 移動先を選択
  ↓ 移動種別を自動判定
  ↓
tool_movements レコード作成
  ↓
tool_items.current_location 更新
  ↓
移動履歴一覧へリダイレクト
```

#### 6. 実装されたコンポーネント

| ファイル | タイプ | 役割 |
|---------|--------|------|
| `/app/movements/new/page.tsx` | Server Component | データ取得、MovementFormへprops渡し |
| `/app/movements/new/MovementForm.tsx` | Client Component | 状態管理、移動種別自動判定、フォーム送信 |
| `/app/tool-items/[id]/page.tsx` | Server Component | 個別アイテム詳細表示 |
| `/app/movements/page.tsx` | Server Component | 移動履歴一覧（数量列削除済み） |

---

## 7. 消耗品管理テーブル ✨NEW

### 7.1 consumable_inventory（消耗品在庫）

#### テーブル定義（SQL）
```sql
CREATE TABLE consumable_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,  -- 消耗品マスタ
  location_type TEXT NOT NULL CHECK (location_type IN ('warehouse', 'site')),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, tool_id, location_type, site_id, warehouse_location_id)
);

COMMENT ON TABLE consumable_inventory IS '消耗品の在庫管理テーブル（場所別数量）';
COMMENT ON COLUMN consumable_inventory.tool_id IS '消耗品マスタID（tools.management_type = consumable）';
COMMENT ON COLUMN consumable_inventory.location_type IS '在庫場所タイプ（倉庫 or 現場）';
COMMENT ON COLUMN consumable_inventory.site_id IS '現場ID（location_type = site の場合）';
COMMENT ON COLUMN consumable_inventory.warehouse_location_id IS '倉庫位置ID（location_type = warehouse の場合）';
COMMENT ON COLUMN consumable_inventory.quantity IS '在庫数量';

-- インデックス
CREATE INDEX idx_consumable_inventory_org ON consumable_inventory(organization_id);
CREATE INDEX idx_consumable_inventory_tool ON consumable_inventory(tool_id);
CREATE INDEX idx_consumable_inventory_site ON consumable_inventory(site_id);
CREATE INDEX idx_consumable_inventory_location ON consumable_inventory(warehouse_location_id);

-- RLS ポリシー
ALTER TABLE consumable_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's consumable inventory"
  ON consumable_inventory FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their organization's consumable inventory"
  ON consumable_inventory FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### TypeScript型定義
```typescript
export interface ConsumableInventory {
  id: string;
  organization_id: string;
  tool_id: string;              // 消耗品マスタID
  location_type: 'warehouse' | 'site';
  site_id: string | null;       // 現場の場合
  warehouse_location_id: string | null;  // 倉庫の場合
  quantity: number;             // 在庫数量
  created_at: string;
  updated_at: string;
}
```

### 7.2 consumable_movements（消耗品移動履歴）

#### テーブル定義（SQL）
```sql
CREATE TABLE consumable_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,  -- 消耗品マスタ
  movement_type TEXT NOT NULL CHECK (movement_type IN ('入庫', '出庫', '移動', '調整', '棚卸')),
  from_location_type TEXT CHECK (from_location_type IN ('warehouse', 'site')),
  from_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  to_location_type TEXT CHECK (to_location_type IN ('warehouse', 'site')),
  to_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_valid_movement CHECK (
    (from_location_type IS NOT NULL AND from_location_type != to_location_type) OR
    (from_location_type IS NOT NULL AND from_site_id != to_site_id) OR
    movement_type IN ('調整', '棚卸')
  )
);

COMMENT ON TABLE consumable_movements IS '消耗品の移動履歴を記録するテーブル';
COMMENT ON COLUMN consumable_movements.movement_type IS '移動タイプ: 入庫/出庫/移動/調整/棚卸';
COMMENT ON COLUMN consumable_movements.from_location_type IS '移動元の場所タイプ';
COMMENT ON COLUMN consumable_movements.from_site_id IS '移動元現場ID（site の場合）';
COMMENT ON COLUMN consumable_movements.to_location_type IS '移動先の場所タイプ';
COMMENT ON COLUMN consumable_movements.to_site_id IS '移動先現場ID（site の場合）';
COMMENT ON COLUMN consumable_movements.quantity IS '移動数量（マイナスの場合は減少）';
COMMENT ON COLUMN consumable_movements.performed_by IS '実行者のユーザーID';

-- インデックス
CREATE INDEX idx_consumable_movements_org ON consumable_movements(organization_id);
CREATE INDEX idx_consumable_movements_tool ON consumable_movements(tool_id);
CREATE INDEX idx_consumable_movements_created ON consumable_movements(created_at DESC);

-- RLS ポリシー
ALTER TABLE consumable_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's consumable movements"
  ON consumable_movements FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create consumable movements for their organization"
  ON consumable_movements FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### TypeScript型定義
```typescript
export interface ConsumableMovement {
  id: string;
  organization_id: string;
  tool_id: string;                      // 消耗品マスタID
  movement_type: '入庫' | '出庫' | '移動' | '調整' | '棚卸';
  from_location_type: 'warehouse' | 'site' | null;
  from_site_id: string | null;
  to_location_type: 'warehouse' | 'site' | null;
  to_site_id: string | null;
  quantity: number;
  notes: string | null;
  performed_by: string;                 // 実行者のユーザーID
  created_at: string;
}
```

### 7.3 消耗品管理の仕組み

#### データフロー
```
1. 消耗品マスタ登録（tools.management_type = 'consumable'）
   ↓
2. 在庫登録（consumable_inventory）
   - 倉庫在庫: location_type = 'warehouse', site_id = NULL
   - 現場在庫: location_type = 'site', site_id = '現場ID'
   ↓
3. 移動処理
   a) 在庫更新（consumable_inventory）
      - 移動元の quantity を減算
      - 移動先の quantity を加算
   b) 履歴記録（consumable_movements）
      - 移動タイプ、数量、移動元・移動先を記録
```

#### 個別管理道具との違い

| 項目 | 個別管理道具 | 消耗品 |
|------|-------------|--------|
| テーブル | `tool_items` | `consumable_inventory` |
| 管理単位 | 個別アイテム（#001, #002...） | 数量 |
| 移動履歴 | `tool_movements` | `consumable_movements` |
| QRコード | 各アイテムに1つ | マスタに1つ |
| 在庫数 | アイテム数をカウント | quantity列で管理 |
| ユースケース | 高価な工具、管理が重要な機材 | 軍手、テープ、ビスなど |

#### クエリ例

```sql
-- 消耗品の合計在庫を取得
SELECT
  t.id,
  t.name,
  t.unit,
  COALESCE(SUM(ci.quantity), 0) as total_quantity
FROM tools t
LEFT JOIN consumable_inventory ci ON t.id = ci.tool_id
WHERE t.management_type = 'consumable'
  AND t.organization_id = 'org-1'
  AND t.deleted_at IS NULL
GROUP BY t.id, t.name, t.unit;

-- 倉庫と現場別の在庫
SELECT
  t.name,
  ci.location_type,
  s.name as site_name,
  ci.quantity
FROM consumable_inventory ci
JOIN tools t ON ci.tool_id = t.id
LEFT JOIN sites s ON ci.site_id = s.id
WHERE ci.organization_id = 'org-1'
ORDER BY t.name, ci.location_type;

-- 低在庫アラート
SELECT
  t.id,
  t.name,
  t.minimum_stock,
  COALESCE(SUM(ci.quantity), 0) as current_quantity
FROM tools t
LEFT JOIN consumable_inventory ci ON t.id = ci.tool_id
WHERE t.management_type = 'consumable'
  AND t.organization_id = 'org-1'
  AND t.deleted_at IS NULL
  AND t.minimum_stock > 0
GROUP BY t.id, t.name, t.minimum_stock
HAVING COALESCE(SUM(ci.quantity), 0) < t.minimum_stock;

-- 消耗品移動履歴（最新100件）
SELECT
  cm.created_at,
  t.name as tool_name,
  cm.movement_type,
  CASE
    WHEN cm.from_location_type = 'warehouse' THEN '倉庫'
    WHEN cm.from_location_type = 'site' THEN fs.name
  END as from_location,
  CASE
    WHEN cm.to_location_type = 'warehouse' THEN '倉庫'
    WHEN cm.to_location_type = 'site' THEN ts.name
  END as to_location,
  cm.quantity,
  u.name as performed_by_name
FROM consumable_movements cm
JOIN tools t ON cm.tool_id = t.id
LEFT JOIN sites fs ON cm.from_site_id = fs.id
LEFT JOIN sites ts ON cm.to_site_id = ts.id
JOIN users u ON cm.performed_by = u.id
WHERE cm.organization_id = 'org-1'
ORDER BY cm.created_at DESC
LIMIT 100;
```

---

## 8. 倉庫内位置管理テーブル ✨NEW

### 7.1 テーブル定義（SQL）

```sql
-- 倉庫階層設定テーブル
CREATE TABLE warehouse_location_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, level)
);

COMMENT ON TABLE warehouse_location_templates IS '組織ごとの倉庫階層構造設定';
COMMENT ON COLUMN warehouse_location_templates.level IS '階層レベル（1-5）';
COMMENT ON COLUMN warehouse_location_templates.label IS '階層名（例：エリア、棚、保管方法、段）';
COMMENT ON COLUMN warehouse_location_templates.is_active IS '有効/無効フラグ';

-- 倉庫位置マスタテーブル
CREATE TABLE warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  parent_id UUID REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  qr_code TEXT UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(organization_id, code)
);

COMMENT ON TABLE warehouse_locations IS '倉庫内位置マスタ（階層構造）';
COMMENT ON COLUMN warehouse_locations.code IS '位置コード（例：A-1-上、北側-壁掛け-3）';
COMMENT ON COLUMN warehouse_locations.display_name IS '表示名（例：Aエリア 1番棚 上段）';
COMMENT ON COLUMN warehouse_locations.parent_id IS '親位置ID（階層構造）';
COMMENT ON COLUMN warehouse_locations.level IS '階層レベル（0=ルート、1=第1階層...）';
COMMENT ON COLUMN warehouse_locations.qr_code IS '位置識別用QRコード（UUID）';
COMMENT ON COLUMN warehouse_locations.description IS '補足説明（例：入口から左手2番目の棚）';

-- tool_itemsに倉庫位置カラムを追加
ALTER TABLE tool_items
  ADD COLUMN warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL;

COMMENT ON COLUMN tool_items.warehouse_location_id IS '倉庫内位置（current_location=warehouse時のみ有効）';

-- インデックス
CREATE INDEX idx_warehouse_location_templates_org
  ON warehouse_location_templates(organization_id);

CREATE INDEX idx_warehouse_locations_org
  ON warehouse_locations(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_warehouse_locations_parent
  ON warehouse_locations(parent_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_warehouse_locations_qr
  ON warehouse_locations(qr_code) WHERE qr_code IS NOT NULL;

CREATE INDEX idx_warehouse_locations_code
  ON warehouse_locations(organization_id, code);

CREATE INDEX idx_tool_items_warehouse_location
  ON tool_items(warehouse_location_id) WHERE warehouse_location_id IS NOT NULL;

-- RLS ポリシー
ALTER TABLE warehouse_location_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's location templates"
  ON warehouse_location_templates FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage location templates"
  ON warehouse_location_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view their organization's warehouse locations"
  ON warehouse_locations FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can manage warehouse locations"
  ON warehouse_locations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
```

### 7.2 TypeScript型定義

```typescript
// 倉庫階層設定
export interface WarehouseLocationTemplate {
  id: string;
  organization_id: string;
  level: number;              // 1-5
  label: string;              // 例：「エリア」「棚」「保管方法」
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 倉庫位置
export interface WarehouseLocation {
  id: string;
  organization_id: string;
  code: string;               // 例：「A-1-上」「北側-壁掛け-3」
  display_name: string;       // 例：「Aエリア 1番棚 上段」
  parent_id: string | null;   // 親位置ID
  level: number;              // 階層レベル（0=ルート）
  qr_code: string | null;     // 位置QRコード
  description: string | null; // 説明
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// 道具アイテムに倉庫位置を追加
export interface ToolItem {
  id: string;
  tool_id: string;
  organization_id: string;
  serial_number: string;
  qr_code: string;
  current_location: 'warehouse' | 'site' | 'repair' | 'lost';
  current_site_id: string | null;
  warehouse_location_id: string | null; // ✨NEW
  status: 'available' | 'in_use' | 'maintenance' | 'lost';
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  tools?: Tool;
  current_site?: Site;
  warehouse_location?: WarehouseLocation; // ✨NEW
}
```

### 7.3 使用例

#### 例1: 3階層倉庫（エリア-棚-段）

```sql
-- 階層設定
INSERT INTO warehouse_location_templates (organization_id, level, label) VALUES
  ('org-1', 1, 'エリア'),
  ('org-1', 2, '棚'),
  ('org-1', 3, '段');

-- 位置登録
INSERT INTO warehouse_locations (organization_id, code, display_name, level, qr_code) VALUES
  ('org-1', 'A-1-上', 'Aエリア 1番棚 上段', 3, gen_random_uuid()::text),
  ('org-1', 'A-1-中', 'Aエリア 1番棚 中段', 3, gen_random_uuid()::text),
  ('org-1', 'A-1-下', 'Aエリア 1番棚 下段', 3, gen_random_uuid()::text),
  ('org-1', 'B-2-上', 'Bエリア 2番棚 上段', 3, gen_random_uuid()::text);
```

#### 例2: 1階層倉庫（場所のみ）

```sql
-- 階層設定
INSERT INTO warehouse_location_templates (organization_id, level, label) VALUES
  ('org-2', 1, '場所');

-- 位置登録
INSERT INTO warehouse_locations (organization_id, code, display_name, level, qr_code) VALUES
  ('org-2', '北側', '北側エリア', 1, gen_random_uuid()::text),
  ('org-2', '南側', '南側エリア', 1, gen_random_uuid()::text),
  ('org-2', '入口付近', '入口付近', 1, gen_random_uuid()::text);
```

#### 例3: 4階層倉庫（フロア-エリア-保管方法-番号）

```sql
-- 階層設定
INSERT INTO warehouse_location_templates (organization_id, level, label) VALUES
  ('org-3', 1, 'フロア'),
  ('org-3', 2, 'エリア'),
  ('org-3', 3, '保管方法'),
  ('org-3', 4, '番号');

-- 位置登録
INSERT INTO warehouse_locations (organization_id, code, display_name, level, qr_code, description) VALUES
  ('org-3', '1F-工具-壁掛け-3', '1階 工具エリア 壁掛け 3番', 4, gen_random_uuid()::text, '入口から左手、壁掛けフックの3番目'),
  ('org-3', '1F-工具-棚-5', '1階 工具エリア 棚 5番', 4, gen_random_uuid()::text, 'メイン通路沿いの5番棚'),
  ('org-3', '2F-電動-床置き-1', '2階 電動工具エリア 床置き 1番', 4, gen_random_uuid()::text, '階段上がってすぐ左');
```

### 7.4 クエリ例

```sql
-- 位置から道具を検索
SELECT ti.*, t.name, wl.display_name as location_name
FROM tool_items ti
JOIN tools t ON ti.tool_id = t.id
JOIN warehouse_locations wl ON ti.warehouse_location_id = wl.id
WHERE wl.code = 'A-1-上'
AND ti.current_location = 'warehouse'
AND ti.deleted_at IS NULL;

-- 部分一致検索（Aエリアの全道具）
SELECT ti.*, t.name, wl.code, wl.display_name
FROM tool_items ti
JOIN tools t ON ti.tool_id = t.id
JOIN warehouse_locations wl ON ti.warehouse_location_id = wl.id
WHERE wl.code LIKE 'A-%'
AND ti.current_location = 'warehouse'
AND ti.deleted_at IS NULL;

-- 倉庫にある道具の位置別集計
SELECT
  wl.code,
  wl.display_name,
  COUNT(ti.id) as tool_count
FROM warehouse_locations wl
LEFT JOIN tool_items ti ON wl.id = ti.warehouse_location_id AND ti.current_location = 'warehouse'
WHERE wl.organization_id = 'org-1'
AND wl.deleted_at IS NULL
GROUP BY wl.id, wl.code, wl.display_name
ORDER BY wl.code;
```

---

## 📝 実装履歴

### 2025-12-02: QRコードセキュリティとマルチテナント認証の実装

#### Issue #9 - UUIDベースのQRコードセキュリティ

**実装内容**:
- QRコード生成機能（訂正レベルH、30%復元可能）
- QRコードスキャン機能（HTML5 QRコード）
- UUID検証とアクセス制御

**セキュリティ特性**:
```typescript
// QRコードの内容例
UUID直接: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
URL形式: "https://app.fieldtool.com/scan?id=a1b2c3d4-..."

// 訂正レベル
errorCorrectionLevel: 'H'  // 30%復元可能（最高レベル）
```

**関連ファイル**:
- `components/qr/QRCodeGenerator.tsx` - QRコード生成コンポーネント
- `components/qr/QRCodeScanner.tsx` - QRコードスキャナー
- `app/api/tools/by-qr/[qrCode]/route.ts` - QRコード検索API
- `app/tools/[id]/QRCodeDisplay.tsx` - QRコード表示（訂正レベルH対応）

**データベース対応**:
```sql
-- tools テーブル
qr_code UUID NOT NULL DEFAULT uuid_generate_v4()

-- tool_items テーブル
qr_code UUID NOT NULL DEFAULT uuid_generate_v4()

-- UNIQUEインデックス
CREATE UNIQUE INDEX idx_tools_qr_code ON tools(qr_code);
CREATE UNIQUE INDEX idx_tool_items_qr_code ON tool_items(qr_code);
```

#### Issue #13 - マルチテナント認証システム

**実装内容**:
- 組織別データ分離（RLS使用）
- サブドメインベースの組織識別
- 組織間アクセス制御

**アーキテクチャ**:
```
データベースレベル:
├── RLS (Row Level Security) ポリシー
│   └── get_organization_id() 関数で自動フィルタリング
│
アプリケーションレベル:
├── middleware.ts
│   ├── サブドメイン検証（本番環境のみ）
│   ├── 組織の存在確認
│   └── ユーザー組織一致確認
│
└── lib/multi-tenant.ts
    ├── getCurrentOrganizationId()
    ├── getCurrentOrganization()
    ├── checkOrganizationAccess()
    ├── getUserRole()
    └── checkRole()
```

**RLSポリシー例**:
```sql
-- toolsテーブルのRLSポリシー
CREATE POLICY "Users can view organization tools" 
ON tools FOR SELECT
USING (
  organization_id = get_organization_id() 
  AND deleted_at IS NULL
);

CREATE POLICY "Users can insert tools"
ON tools FOR INSERT
WITH CHECK (
  organization_id = get_organization_id()
);

CREATE POLICY "Users can update tools"
ON tools FOR UPDATE
USING (
  organization_id = get_organization_id()
);
```

**get_organization_id() 関数**:
```sql
CREATE OR REPLACE FUNCTION get_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- usersテーブルから現在のユーザーの組織IDを取得
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = auth.uid();

    RETURN org_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
```

**環境別動作**:
```typescript
// 開発環境（localhost）
- サブドメイン検証: スキップ
- RLS: 有効（データベースレベル）
- 理由: 開発の利便性のため

// 本番環境（*.tool-manager.com）
- サブドメイン検証: 有効
- RLS: 有効
- 組織分離: 完全分離
```

**セキュリティチェックフロー**:
```
1. ミドルウェア（middleware.ts）
   ↓
2. サブドメイン抽出
   例: a-kensetsu.tool-manager.com → "a-kensetsu"
   ↓
3. 組織の存在・アクティブ確認
   SELECT * FROM organizations WHERE subdomain = 'a-kensetsu'
   ↓
4. ユーザー組織一致確認
   user.organization_id === organization.id
   ↓
5. RLSポリシー適用
   自動的に organization_id でフィルタリング
```

**マルチテナント機能の説明**:

開発環境と本番環境で動作が異なる理由：

1. **開発環境（localhost）**:
   - すべての組織のデータにアクセス可能
   - サブドメインなしでも動作
   - 開発・テストが簡単

2. **本番環境（a-kensetsu.tool-manager.com）**:
   - サブドメインで組織を識別
   - A建設のユーザーはA建設のデータのみ
   - B塗装のユーザーはB塗装のデータのみ
   - 完全に分離され、他社データは見えない

**データ分離の仕組み**:
```
例: A建設とB塗装が同じシステムを使用

┌─────────────────────────────────────┐
│ a-kensetsu.tool-manager.com         │
│ (A建設専用サブドメイン)              │
├─────────────────────────────────────┤
│ ユーザー: 田中さん                   │
│ organization_id: org-a-001          │
│                                     │
│ 見えるデータ:                        │
│ ✅ A建設の道具                       │
│ ✅ A建設のユーザー                   │
│ ✅ A建設の現場                       │
│ ❌ B塗装のデータは一切見えない       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ b-tosou.tool-manager.com            │
│ (B塗装専用サブドメイン)              │
├─────────────────────────────────────┤
│ ユーザー: 佐藤さん                   │
│ organization_id: org-b-002          │
│                                     │
│ 見えるデータ:                        │
│ ✅ B塗装の道具                       │
│ ✅ B塗装のユーザー                   │
│ ✅ B塗装の現場                       │
│ ❌ A建設のデータは一切見えない       │
└─────────────────────────────────────┘
```

**実装ファイル**:
- `middleware.ts` - マルチテナント検証ミドルウェア
- `lib/multi-tenant.ts` - マルチテナントヘルパー関数
- `app/api/tools/by-qr/[qrCode]/route.ts` - 組織別QRコード検索

---


## 実装履歴（追加：組織セットアップ機能）

### 実装日時
2025-01-02

### 実装内容
組織の初回セットアップ機能と業種マスタシステム、組織設定テーブルを実装。

---

## 新規追加テーブル

### 1. industry_categories（業種マスタ）

建設業の業種分類を管理するマスタテーブル。親子関係を持ち、大分類と中分類を表現。

```sql
CREATE TABLE industry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES industry_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### TypeScript型定義
```typescript
interface IndustryCategory {
  id: string
  parent_id: string | null
  name: string
  name_en: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
```

#### 初期データ

**大分類（parent_id = NULL）:**
1. 土木・基礎（7業種）
2. 建築・構造（5業種）
3. 内装・仕上（5業種）
4. 設備・インフラ（5業種）

**中分類（例）:**
- 土木・基礎配下: 土工事、基礎工事、杭工事、鉄筋工事、コンクリート工事、舗装工事、解体工事、**その他**
- 建築・構造配下: 大工工事、鉄骨工事、屋根工事、板金工事、防水工事、**その他**
- 内装・仕上配下: 左官工事、塗装工事、内装仕上工事、タイル工事、ガラス工事、**その他**
- 設備・インフラ配下: 電気工事、管工事（配管）、空調設備工事、通信設備工事、造園工事、**その他**

> **📝 2025-12-02 更新**: 各大分類に「その他」業種を追加（sort_order: 99）。業種選択UIで予期しない業種に対応するため。

#### RLSポリシー
```sql
-- 全ての認証済みユーザーが参照可能（読み取り専用）
CREATE POLICY "Industry categories are viewable by all authenticated users"
  ON industry_categories FOR SELECT
  TO authenticated
  USING (true);
```

---

### 2. organization_settings（組織設定）

各組織の運用ルールや設定をカスタマイズするためのテーブル。

```sql
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 在庫管理設定
  enable_low_stock_alert BOOLEAN DEFAULT true,
  default_minimum_stock_level INTEGER DEFAULT 5,

  -- 承認フロー設定
  require_checkout_approval BOOLEAN DEFAULT false,
  require_return_approval BOOLEAN DEFAULT false,

  -- 通知設定
  enable_email_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,

  -- UI設定
  theme VARCHAR(20) DEFAULT 'light',

  -- その他の設定（JSON形式で柔軟に拡張可能）
  custom_settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);
```

#### TypeScript型定義
```typescript
interface OrganizationSettings {
  id: string
  organization_id: string
  enable_low_stock_alert: boolean
  default_minimum_stock_level: number
  require_checkout_approval: boolean
  require_return_approval: boolean
  enable_email_notifications: boolean
  notification_email: string | null
  theme: 'light' | 'dark'
  custom_settings: Record<string, any>
  created_at: string
  updated_at: string
}
```

#### RLSポリシー
```sql
-- 自組織の設定のみ参照可能
CREATE POLICY "Users can view their own organization settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (organization_id = get_organization_id());

-- 管理者のみ設定を作成可能
CREATE POLICY "Admins can insert their organization settings"
  ON organization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = get_organization_id()
      AND users.role = 'admin'
    )
  );

-- 管理者のみ設定を更新可能
CREATE POLICY "Admins can update their organization settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = get_organization_id()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (organization_id = get_organization_id());
```

---

## organizations テーブルへの追加カラム

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS representative_name VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry_category_id UUID REFERENCES industry_categories(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;
```

### 追加カラムの説明

| カラム名 | 型 | 説明 |
|---------|---|------|
| representative_name | VARCHAR(100) | 代表者名 |
| phone | VARCHAR(20) | 電話番号 |
| postal_code | VARCHAR(10) | 郵便番号 |
| address | TEXT | 住所 |
| industry_category_id | UUID | 業種ID（industry_categories参照） |
| setup_completed_at | TIMESTAMPTZ | 初回セットアップ完了日時 |

---

## 初回セットアップフロー

### 1. 管理者が初回ログイン
```
app/page.tsx → セットアップ未完了チェック → /onboarding にリダイレクト
```

### 2. 4ステップウィザード

**Step 1: 組織情報入力**
- 組織名（必須）
- 代表者名（必須）
- 電話番号（必須）
- 郵便番号
- 住所
- 業種選択（大分類 → 中分類、必須）

**Step 2: 運用設定**
- 低在庫アラート有効化
- デフォルト最小在庫レベル
- 貸出時承認必須
- 返却時承認必須

**Step 3: カテゴリー設定**
- デフォルトカテゴリーから選択（電動工具、測定機器など）
- カスタムカテゴリーの追加

**Step 4: ユーザー招待**
- メールアドレスと権限（admin/leader/staff）を入力
- 複数ユーザーを一括招待可能

### 3. セットアップ完了時の処理

**API: `/api/onboarding/complete`**

```typescript
// 1. organizations テーブル更新
UPDATE organizations SET
  name = '入力された組織名',
  representative_name = '入力された代表者名',
  phone = '電話番号',
  postal_code = '郵便番号',
  address = '住所',
  industry_category_id = '選択された業種ID',
  setup_completed_at = NOW()
WHERE id = 'organization_id';

// 2. organization_settings テーブル作成
INSERT INTO organization_settings (
  organization_id,
  enable_low_stock_alert,
  default_minimum_stock_level,
  require_checkout_approval,
  require_return_approval
) VALUES (...);

// 3. categories テーブルに選択されたカテゴリーを作成
INSERT INTO categories (organization_id, name, icon, sort_order)
VALUES
  ('org-id', '電動工具', '⚡', 1),
  ('org-id', '測定機器', '📏', 2),
  ...;

// 4. ユーザー招待（Phase 2で実装予定）
// メール送信とトークン生成
```

---

## 業種マスタの拡張性

### 今後の活用方法

1. **道具テンプレート機能**
   - 業種ごとによく使う道具のテンプレートを提供
   - 「塗装工事」を選択 → スプレーガン、養生シート、ハケなどを自動提案

2. **在庫レベルの推奨値**
   - 業種ごとに最適な在庫レベルを提案
   - 「電気工事」→ テスター最小在庫3個など

3. **レポート機能**
   - 業種別の道具使用傾向分析
   - 同業他社との比較データ提供

4. **カスタムフィールド**
   - 業種特有の管理項目を追加
   - 例: 電気工事 → 絶縁耐圧試験日、校正有効期限

---

## 関連ファイル

### 実装ファイル
- `supabase/migrations/20250102_add_organization_settings_and_industry.sql`
- `app/onboarding/page.tsx`
- `components/onboarding/OnboardingWizard.tsx`
- `components/onboarding/Step1OrganizationInfo.tsx`
- `components/onboarding/Step2OperationSettings.tsx`
- `components/onboarding/Step3CategorySetup.tsx`
- `components/onboarding/Step4UserInvitation.tsx`
- `app/api/industries/route.ts`
- `app/api/onboarding/complete/route.ts`
- `types/organization.ts`

### ドキュメント
- `docs/DEVELOPMENT_MULTITENANT.md` - 開発環境でのマルチテナント機能テスト手順
- `docs/SPECIFICATION_SAAS_FINAL.md` - Phase 5本番移行タスク追加

### GitHub Issue
- Issue #35: 🚀 本番環境移行タスク


---

## 実装履歴（更新：初回セットアップ機能の改善）

### 実装日時
2025-01-02 (更新)

### 実装内容
初回セットアップウィザードに以下の機能を追加・改善しました。

---

### 1. 郵便番号から住所自動入力機能

**実装場所:** `components/onboarding/Step1OrganizationInfo.tsx`

**API使用:** [zipcloud API](https://zipcloud.ibsnet.co.jp/doc/api)

**機能:**
- 郵便番号（7桁）を入力後、「住所検索」ボタンをクリック
- 外部APIから住所情報を取得し、自動的に住所フィールドに入力
- エラーハンドリング（住所が見つからない場合、API接続失敗時）

**実装例:**
```typescript
const searchAddress = async () => {
  const postalCode = formData.postalCode.replace(/-/g, '')
  if (postalCode.length !== 7) {
    alert('7桁の郵便番号を入力してください')
    return
  }

  setIsSearching(true)
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const result = data.results[0]
      const address = `${result.address1}${result.address2}${result.address3}`
      updateFormData({ address })
    } else {
      alert('住所が見つかりませんでした')
    }
  } catch (error) {
    alert('住所検索に失敗しました')
  } finally {
    setIsSearching(false)
  }
}
```

---

### 2. 業種の複数選択機能

**変更点:**
- **旧:** 単一選択（ドロップダウン）
- **新:** 複数選択（チェックボックス）

**型定義の変更:**
```typescript
// Before
industryCategoryId: string

// After
industryCategoryIds: string[]
```

**データベース保存方法:**
- `organizations.industry_category_id`: 最初に選択された業種を代表として保存（既存カラム）
- `organization_settings.custom_settings.selected_industries`: 全ての選択された業種IDを配列で保存

**UI実装:**
```typescript
// 大分類選択（ドロップダウン）
<select value={selectedParentId} onChange={(e) => handleParentChange(e.target.value)}>
  <option value="">大分類を選択してください</option>
  {industries.parent.map((category) => (
    <option key={category.id} value={category.id}>{category.name}</option>
  ))}
</select>

// 中分類選択（チェックボックス）
{industries.children[selectedParentId].map((category) => (
  <label key={category.id}>
    <input
      type="checkbox"
      checked={formData.industryCategoryIds.includes(category.id)}
      onChange={() => toggleIndustryCategory(category.id)}
    />
    {category.name}
  </label>
))}
```

**選択状態の表示:**
- 選択中の業種数をリアルタイムで表示: 「選択中: 3件」

---

### 3. 在庫管理単位の選択機能

**実装場所:** `components/onboarding/Step2OperationSettings.tsx`

**型定義の追加:**
```typescript
export interface OnboardingFormData {
  // ...
  defaultStockUnit: string  // 追加
  // ...
}
```

**選択可能な単位（13種類）:**
| 単位 | 用途 |
|-----|------|
| 個 | 一般的な道具・部品 |
| 本 | 棒状の物（配管、木材など） |
| 枚 | 板状の物（合板、シートなど） |
| セット | 複数アイテムの組み合わせ |
| 箱 | 箱単位の管理 |
| 袋 | 袋単位の管理 |
| 缶 | 塗料など |
| L（リットル） | 液体 |
| ml（ミリリットル） | 液体（少量） |
| kg（キログラム） | 重量単位 |
| g（グラム） | 重量単位（少量） |
| m（メートル） | 長さ単位 |
| cm（センチメートル） | 長さ単位（短い） |

**データベース保存:**
```json
// organization_settings.custom_settings
{
  "default_stock_unit": "L",
  "selected_industries": ["uuid1", "uuid2", "uuid3"]
}
```

**UI実装:**
```typescript
<div className="flex gap-2">
  <input
    type="number"
    min="1"
    value={formData.defaultMinimumStockLevel}
    onChange={(e) => updateFormData({ defaultMinimumStockLevel: parseInt(e.target.value) })}
  />
  <select
    value={formData.defaultStockUnit}
    onChange={(e) => updateFormData({ defaultStockUnit: e.target.value })}
  >
    <option value="個">個</option>
    <option value="本">本</option>
    <option value="L">L（リットル）</option>
    {/* ... */}
  </select>
</div>
```

---

### 4. APIエラーハンドリングの改善

**実装場所:** `app/api/onboarding/complete/route.ts`

**改善点:**

#### エラーログの詳細化
```typescript
try {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Auth error:', authError)  // 詳細ログ
    return NextResponse.json({ 
      error: 'Unauthorized', 
      details: authError?.message  // クライアントへの詳細情報
    }, { status: 401 })
  }
  // ...
} catch (error: any) {
  console.error('Onboarding error:', error)
  return NextResponse.json({
    error: 'Internal server error',
    details: error?.message || 'Unknown error',
    hint: error?.hint  // Supabaseのヒント情報
  }, { status: 500 })
}
```

#### 複数業種IDの保存ロジック
```typescript
// 1. 組織情報を更新（最初の業種IDのみ保存）
await supabase
  .from('organizations')
  .update({
    industry_category_id: formData.industryCategoryIds[0] || null,
    // ...
  })

// 2. 全ての業種IDをcustom_settingsに保存
const customSettings = {
  default_stock_unit: formData.defaultStockUnit,
  selected_industries: formData.industryCategoryIds,
}

await supabase.from('organization_settings').upsert({
  custom_settings: customSettings,
  // ...
})
```

---

### 5. organization_settings.custom_settingsの拡張

**JSONBカラムの活用:**

`organization_settings.custom_settings` に以下の情報を保存:

```json
{
  "selected_industries": [
    "industry-uuid-1",
    "industry-uuid-2",
    "industry-uuid-3"
  ],
  "future_settings": {
    // 将来的な拡張用
  }
}
```

> **📝 2025-12-02 更新**: `default_stock_unit`フィールドを削除。在庫単位は道具・消耗品マスタに個別設定する方式に変更。

**TypeScript型定義:**
```typescript
interface OrganizationCustomSettings {
  selected_industries: string[]  // 選択した全ての業種ID
  [key: string]: any  // 柔軟な拡張性
}
```

**設計変更の理由:**
- 組織全体のデフォルト単位では、品目ごとに異なる単位（手袋=個、ペンキ=L、接着剤=ml）に対応できない
- 道具・消耗品マスタに`stock_unit`と`minimum_stock`カラムを追加し、品目ごとに設定する方式に変更

---

### 今後の活用例

#### 業種情報を活用した機能

1. **業種別道具テンプレート:**
```typescript
async function getRecommendedTools(organizationId: string) {
  const settings = await getOrganizationSettings(organizationId)
  const industries = settings.custom_settings.selected_industries
  
  if (industries.includes('塗装工事')) {
    return ['スプレーガン', '養生シート', 'ハケ', 'ローラー']
  }
  // ...
}
```

2. **業種別カスタムフィールド:**
```typescript
if (industries.includes('電気工事')) {
  // 絶縁耐圧試験日、校正有効期限などのフィールドを自動追加
  addCustomField('insulation_test_date')
  addCustomField('calibration_expiry')
}
```

---

### 関連ファイル

**更新したファイル（2025-12-02）:**
- `types/organization.ts` - 型定義更新（defaultStockUnit削除）
- `components/onboarding/OnboardingWizard.tsx` - 初期値とリダイレクト先修正
- `components/onboarding/Step1OrganizationInfo.tsx` - 郵便番号検索・業種複数選択・全選択ボタン
- `components/onboarding/Step2OperationSettings.tsx` - デフォルト単位設定を削除
- `app/api/onboarding/complete/route.ts` - upsert修正・エラーハンドリング改善
- `app/onboarding/page.tsx` - リダイレクト先を`/dashboard`から`/`に変更
- `supabase/migrations/20250102000017_add_other_industry_categories.sql` - 各大分類に「その他」業種追加

**ドキュメント:**
- `docs/DATABASE_SCHEMA.md` - このファイル
- `docs/MIGRATIONS.md` - マイグレーション履歴
- `docs/UI_DESIGN.md` - UI設計書

