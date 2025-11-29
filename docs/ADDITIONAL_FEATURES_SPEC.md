# 追加開発機能仕様書

> **対象**: リリース後の段階的追加機能
> **目的**: 現場系企業のDX化を加速し、工具管理から総合業務管理へ拡張
> **作成日**: 2025-11-29

---

## 📋 機能一覧と優先度

| 機能名 | 優先度 | 推奨時期 | 価値 |
|--------|--------|----------|------|
| 作業報告 | ⭐⭐⭐⭐⭐ | 3ヶ月後 | 報告書作成の手間削減、工具使用履歴の自動化 |
| 出退勤管理 | ⭐⭐⭐⭐⭐ | 3ヶ月後 | 直行直帰対応、工具持出との連携 |
| 資材発注・在庫管理 | ⭐⭐⭐⭐⭐ | 6ヶ月後 | 工具+資材の一元管理 |
| 請求書作成 | ⭐⭐⭐⭐⭐ | 6ヶ月後 | 作業報告からの自動生成 |
| 定期点検・校正期限管理 | ⭐⭐⭐⭐⭐ | 3ヶ月後 | コンプライアンス強化 |
| 現場指示管理 | ⭐⭐⭐⭐ | 6ヶ月後 | ペーパーレス化 |
| 車両・重機管理 | ⭐⭐⭐⭐ | 6ヶ月後 | 工具と車両の統合管理 |
| 顧客・現場情報管理 | ⭐⭐⭐⭐ | 1年後 | 施工履歴の蓄積 |
| 見積もり作成 | ⭐⭐⭐⭐ | 1年後 | 受注から請求まで一元化 |
| 安全管理・KY活動記録 | ⭐⭐⭐⭐ | 1年後 | 労災防止、ISO対応 |
| スタッフ資格・免許管理 | ⭐⭐⭐⭐ | 1年後 | 適材適所の人員配置 |

---

## 1. 作業報告機能

### 概要
現場での作業完了後、その場で写真付き報告書を作成。使用した工具リストを自動的に添付。

### 解決する課題
- 報告書作成のために事務所に戻る必要がある
- 使用工具の記録が手動で漏れやすい
- 施工写真と報告書が別管理

### データモデル
```sql
-- 作業報告テーブル
CREATE TABLE work_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  site_id UUID REFERENCES sites(id),
  created_by UUID NOT NULL REFERENCES users(id),

  -- 基本情報
  report_date DATE NOT NULL,
  work_type TEXT NOT NULL, -- 塗装、電気工事、配管等
  work_description TEXT NOT NULL,

  -- 作業内容
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  worker_count INTEGER,

  -- 進捗
  progress_percentage INTEGER DEFAULT 0,
  next_steps TEXT,
  issues TEXT, -- 問題点・課題

  -- 天候
  weather TEXT, -- 晴れ、雨、曇り等
  temperature DECIMAL(3,1),

  -- ステータス
  status TEXT DEFAULT 'draft', -- draft, submitted, approved
  submitted_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  -- メタデータ
  custom_fields JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 作業報告に添付された写真
CREATE TABLE work_report_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_report_id UUID NOT NULL REFERENCES work_reports(id),
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMP,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 作業報告で使用した工具（チェックアウト履歴から自動生成）
CREATE TABLE work_report_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_report_id UUID NOT NULL REFERENCES work_reports(id),
  tool_id UUID NOT NULL REFERENCES tools(id),
  checkout_id UUID REFERENCES checkouts(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 作業報告で使用した資材
CREATE TABLE work_report_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_report_id UUID NOT NULL REFERENCES work_reports(id),
  material_id UUID REFERENCES materials(id),
  material_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 機能詳細

#### 報告書作成フロー
```typescript
// 1. その日の工具使用履歴を自動取得
const getToolsUsedToday = async (userId: string, siteId: string, date: Date) => {
  const { data: checkouts } = await supabase
    .from('checkouts')
    .select(`
      *,
      tool:tools(*)
    `)
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .gte('checked_out_at', startOfDay(date))
    .lte('checked_out_at', endOfDay(date));

  return checkouts.map(c => c.tool);
};

// 2. 写真に位置情報・タイムスタンプを埋め込み
const addPhotoMetadata = async (photo: File) => {
  const location = await getCurrentLocation();
  return {
    file: photo,
    taken_at: new Date(),
    gps_latitude: location.latitude,
    gps_longitude: location.longitude
  };
};

// 3. 報告書テンプレート
interface WorkReportTemplate {
  title: string; // 「〇〇邸 外壁塗装工事」
  sections: Array<{
    type: 'text' | 'photo' | 'tool_list' | 'material_list';
    content: any;
  }>;
}
```

#### UI/UX設計
```typescript
// components/WorkReportForm.tsx
export default function WorkReportForm() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">作業報告書作成</h1>
        <p className="text-gray-600">現場: {site.name}</p>
        <p className="text-gray-600">日付: {format(today, 'yyyy年MM月dd日')}</p>
      </div>

      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="作業時間" type="time-range" />
        <Input label="作業人数" type="number" />
        <Select label="天候" options={['晴れ', '曇り', '雨']} />
        <Input label="気温" type="number" suffix="℃" />
      </div>

      {/* 作業内容 */}
      <Textarea
        label="本日の作業内容"
        placeholder="外壁の高圧洗浄を実施..."
      />

      {/* 写真添付 */}
      <PhotoUploader
        label="施工写真"
        multiple={true}
        onUpload={handlePhotoUpload}
      />

      {/* 使用工具（自動取得） */}
      <div className="border rounded-lg p-4">
        <h3 className="font-bold mb-2">使用工具</h3>
        <p className="text-sm text-gray-600 mb-3">
          本日スキャンした工具が自動的にリストアップされます
        </p>
        <ToolList tools={toolsUsedToday} editable={true} />
      </div>

      {/* 使用資材 */}
      <MaterialUsageForm />

      {/* 提出ボタン */}
      <Button variant="primary">報告書を提出</Button>
    </div>
  );
}
```

### 想定価格
- 基本機能: 30万円
- 写真メタデータ機能: 10万円
- PDF出力機能: 10万円
- **合計: 50万円**

---

## 2. 出退勤管理機能

### 概要
工具管理と連動した出退勤管理。直行直帰に対応し、現場到着時の打刻と工具持出を同時に記録。

### 解決する課題
- 直行直帰の勤怠管理が困難
- 誰がどの現場にいるか不明
- 工具持出と出勤の二重管理

### データモデル
```sql
-- 勤怠記録テーブル
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- 出勤情報
  clock_in_time TIMESTAMP NOT NULL,
  clock_in_location_id UUID REFERENCES locations(id),
  clock_in_gps_latitude DECIMAL(10, 8),
  clock_in_gps_longitude DECIMAL(11, 8),
  clock_in_method TEXT, -- 'qr', 'manual', 'gps'

  -- 退勤情報
  clock_out_time TIMESTAMP,
  clock_out_location_id UUID REFERENCES locations(id),
  clock_out_gps_latitude DECIMAL(10, 8),
  clock_out_gps_longitude DECIMAL(11, 8),
  clock_out_method TEXT,

  -- 勤務情報
  scheduled_hours DECIMAL(4,2),
  actual_hours DECIMAL(4,2),
  overtime_hours DECIMAL(4,2),
  break_minutes INTEGER DEFAULT 0,

  -- 現場情報
  primary_site_id UUID REFERENCES sites(id),

  -- ステータス
  status TEXT DEFAULT 'working', -- working, completed, approved
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  notes TEXT,

  -- 連携
  linked_checkouts UUID[], -- 同時に持ち出した工具

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 休憩記録
CREATE TABLE break_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendances(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  break_type TEXT, -- 'lunch', 'rest'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 現場移動記録
CREATE TABLE site_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendances(id),
  from_site_id UUID REFERENCES sites(id),
  to_site_id UUID REFERENCES sites(id),
  moved_at TIMESTAMP NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 機能詳細

#### 出勤フロー
```typescript
// 出勤 + 工具持出の統合処理
const clockInWithTools = async (data: {
  userId: string;
  siteId: string;
  toolIds: string[];
  location: GeolocationCoordinates;
}) => {
  const { userId, siteId, toolIds, location } = data;

  // トランザクション処理
  const { data: attendance, error } = await supabase.rpc('clock_in_with_tools', {
    p_user_id: userId,
    p_site_id: siteId,
    p_tool_ids: toolIds,
    p_latitude: location.latitude,
    p_longitude: location.longitude
  });

  // プッシュ通知
  await sendNotification({
    to: 'managers',
    title: '出勤通知',
    body: `${user.name}さんが${site.name}に出勤しました`
  });

  return attendance;
};
```

#### 勤怠集計
```typescript
// 月次勤怠集計
const getMonthlyAttendanceSummary = async (userId: string, month: Date) => {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*')
    .eq('user_id', userId)
    .gte('clock_in_time', startDate)
    .lte('clock_in_time', endDate);

  return {
    totalDays: attendances.length,
    totalHours: sum(attendances.map(a => a.actual_hours)),
    overtimeHours: sum(attendances.map(a => a.overtime_hours)),
    sites: groupBy(attendances, 'primary_site_id')
  };
};
```

#### UI/UX設計
```typescript
// components/ClockInScreen.tsx
export default function ClockInScreen() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 現在時刻 */}
      <div className="text-center mb-6">
        <p className="text-4xl font-bold">{currentTime}</p>
        <p className="text-gray-600">{currentDate}</p>
      </div>

      {/* 出勤ボタン（大きく） */}
      <button className="w-full py-8 bg-green-600 text-white text-2xl font-bold rounded-lg">
        出勤する
      </button>

      {/* 現場選択 */}
      <Select
        label="本日の現場"
        options={sites}
        className="mt-4"
      />

      {/* 持出工具（オプション） */}
      <div className="mt-6 p-4 border rounded-lg">
        <h3 className="font-bold mb-2">工具も一緒に持ち出す</h3>
        <button className="text-blue-600">
          QRスキャン or 工具選択
        </button>
      </div>

      {/* 直行直帰モード */}
      <div className="mt-4 flex items-center">
        <input type="checkbox" id="direct" />
        <label htmlFor="direct" className="ml-2">
          現場へ直行
        </label>
      </div>
    </div>
  );
}
```

### 想定価格
- 基本勤怠機能: 40万円
- GPS打刻機能: 10万円
- 工具連携機能: 10万円
- 勤怠集計レポート: 20万円
- **合計: 80万円**

---

## 3. 資材発注・在庫管理機能

### 概要
消耗品・資材の在庫管理と発注を効率化。最低在庫アラート、現場への直送手配も可能。

### 解決する課題
- 資材不足による作業中断
- 過剰在庫による資金圧迫
- 発注履歴が不明瞭

### データモデル
```sql
-- 資材マスタ
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 基本情報
  material_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  manufacturer TEXT,
  model_number TEXT,

  -- 在庫管理
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL, -- 個、本、kg、L等
  minimum_stock DECIMAL(10,2),
  reorder_point DECIMAL(10,2),
  reorder_quantity DECIMAL(10,2),

  -- 価格情報
  unit_price DECIMAL(10,2),
  supplier_id UUID REFERENCES suppliers(id),

  -- 保管場所
  default_location_id UUID REFERENCES locations(id),

  custom_fields JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 仕入先マスタ
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  delivery_lead_time INTEGER, -- 日数
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 発注履歴
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_number TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),

  -- 発注情報
  ordered_by UUID NOT NULL REFERENCES users(id),
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  delivery_site_id UUID REFERENCES sites(id),

  -- 金額
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),

  -- ステータス
  status TEXT DEFAULT 'pending', -- pending, ordered, partial, completed, cancelled

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 発注明細
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  material_id UUID REFERENCES materials(id),

  -- 発注内容
  material_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),

  -- 納品状況
  received_quantity DECIMAL(10,2) DEFAULT 0,
  received_date DATE,

  created_at TIMESTAMP DEFAULT NOW()
);

-- 在庫移動履歴
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id),
  movement_type TEXT NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
  quantity DECIMAL(10,2) NOT NULL,

  -- 移動元・先
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),

  -- 関連情報
  work_report_id UUID REFERENCES work_reports(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),

  -- 記録者
  recorded_by UUID NOT NULL REFERENCES users(id),
  reason TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 機能詳細

#### 自動発注提案
```typescript
// 最低在庫を下回った資材を検出
const checkLowStock = async () => {
  const { data: lowStockItems } = await supabase
    .from('materials')
    .select('*')
    .lt('current_stock', 'minimum_stock');

  // 発注提案を生成
  const suggestions = lowStockItems.map(item => ({
    material: item,
    suggestedQuantity: item.reorder_quantity || (item.minimum_stock * 2),
    urgency: item.current_stock === 0 ? 'critical' : 'normal',
    estimatedCost: item.unit_price * item.reorder_quantity
  }));

  return suggestions;
};

// ワンクリック発注
const quickOrder = async (materialId: string, siteId?: string) => {
  const { data: material } = await supabase
    .from('materials')
    .select('*, supplier:suppliers(*)')
    .eq('id', materialId)
    .single();

  // 発注書を自動生成
  const order = await createPurchaseOrder({
    supplier_id: material.supplier_id,
    items: [{
      material_id: materialId,
      quantity: material.reorder_quantity,
      unit_price: material.unit_price
    }],
    delivery_site_id: siteId || material.default_location_id
  });

  // メールで発注書送信
  await sendOrderEmail(order, material.supplier);

  return order;
};
```

#### UI/UX設計
```typescript
// components/MaterialStockDashboard.tsx
export default function MaterialStockDashboard() {
  return (
    <div className="space-y-6">
      {/* 在庫アラート */}
      <Alert variant="warning">
        <AlertTitle>在庫不足アラート</AlertTitle>
        <AlertDescription>
          以下の資材が最低在庫を下回っています
        </AlertDescription>
        <div className="mt-2 space-y-2">
          {lowStockItems.map(item => (
            <div key={item.id} className="flex justify-between items-center">
              <span>{item.name}: 残り{item.current_stock}{item.unit}</span>
              <Button size="sm" onClick={() => quickOrder(item.id)}>
                発注する
              </Button>
            </div>
          ))}
        </div>
      </Alert>

      {/* 在庫一覧 */}
      <DataTable
        columns={[
          { header: '資材名', accessor: 'name' },
          { header: '在庫数', accessor: 'current_stock' },
          { header: '最低在庫', accessor: 'minimum_stock' },
          { header: 'ステータス', accessor: 'status' }
        ]}
        data={materials}
      />

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-4">
        <Button variant="primary">新規発注</Button>
        <Button variant="secondary">在庫調整</Button>
      </div>
    </div>
  );
}
```

### 想定価格
- 基本在庫管理: 40万円
- 発注管理: 30万円
- 自動発注提案: 20万円
- 仕入先管理: 10万円
- **合計: 100万円**

---

## 4. 請求書作成機能

### 概要
作業報告から自動的に請求書を生成。使用した工具・資材・作業時間を元に請求額を計算。

### 解決する課題
- 請求書作成に時間がかかる
- 作業内容と請求内容の不一致
- 請求漏れの発生

### データモデル
```sql
-- 請求書テーブル
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 請求先
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  client_address TEXT,

  -- 請求情報
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- 工事情報
  project_id UUID REFERENCES projects(id),
  project_name TEXT,
  site_id UUID REFERENCES sites(id),

  -- 金額
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 10.0,
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2) NOT NULL,

  -- 支払い状況
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,

  -- ステータス
  status TEXT DEFAULT 'draft', -- draft, sent, approved, cancelled
  sent_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),

  -- 備考
  notes TEXT,
  payment_terms TEXT,

  -- 関連データ
  work_report_ids UUID[], -- 関連する作業報告

  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 請求明細
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),

  -- 項目情報
  item_type TEXT NOT NULL, -- 'labor', 'material', 'equipment', 'other'
  description TEXT NOT NULL,

  -- 数量・単価
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,

  -- 関連情報
  work_report_id UUID REFERENCES work_reports(id),
  material_id UUID REFERENCES materials(id),
  tool_id UUID REFERENCES tools(id),

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 顧客マスタ
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 基本情報
  client_code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_kana TEXT,

  -- 連絡先
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,

  -- 請求情報
  billing_address TEXT,
  payment_terms TEXT DEFAULT 'month_end_next_month',
  payment_method TEXT DEFAULT 'bank_transfer',

  -- 取引履歴
  first_transaction_date DATE,
  total_transaction_amount DECIMAL(12,2) DEFAULT 0,

  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 入金記録
CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),

  payment_date DATE NOT NULL,
  payment_amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT,

  recorded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 機能詳細

#### 作業報告からの自動生成
```typescript
// 作業報告から請求書を生成
const createInvoiceFromWorkReports = async (
  workReportIds: string[],
  clientId: string
) => {
  // 作業報告を取得
  const { data: workReports } = await supabase
    .from('work_reports')
    .select(`
      *,
      work_report_tools(tool:tools(*)),
      work_report_materials(*)
    `)
    .in('id', workReportIds);

  // 請求項目を生成
  const invoiceItems = [];

  // 1. 作業費
  workReports.forEach(report => {
    const hours = calculateHours(report.start_time, report.end_time);
    invoiceItems.push({
      item_type: 'labor',
      description: `${report.work_type} - ${format(report.report_date, 'MM月dd日')}`,
      quantity: hours,
      unit: '時間',
      unit_price: 5000, // 時間単価
      total_price: hours * 5000,
      work_report_id: report.id
    });
  });

  // 2. 使用資材
  const materials = workReports.flatMap(r => r.work_report_materials);
  materials.forEach(material => {
    invoiceItems.push({
      item_type: 'material',
      description: material.material_name,
      quantity: material.quantity,
      unit: material.unit,
      unit_price: material.unit_price * 1.3, // 30%マージン
      total_price: material.quantity * material.unit_price * 1.3,
      material_id: material.material_id
    });
  });

  // 3. 工具使用料（レンタル扱いの場合）
  const toolUsage = calculateToolUsageCharges(workReports);
  if (toolUsage.length > 0) {
    invoiceItems.push(...toolUsage);
  }

  // 請求書作成
  const subtotal = sum(invoiceItems.map(i => i.total_price));
  const taxAmount = subtotal * 0.1;

  const invoice = await supabase
    .from('invoices')
    .insert({
      client_id: clientId,
      invoice_number: generateInvoiceNumber(),
      invoice_date: new Date(),
      due_date: getPaymentDueDate(clientId),
      subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount,
      work_report_ids: workReportIds
    })
    .select()
    .single();

  // 明細追加
  await supabase
    .from('invoice_items')
    .insert(invoiceItems.map(item => ({
      ...item,
      invoice_id: invoice.id
    })));

  return invoice;
};
```

#### PDF出力
```typescript
// 請求書PDF生成
import PDFDocument from 'pdfkit';

const generateInvoicePDF = async (invoiceId: string) => {
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*),
      client:clients(*),
      organization:organizations(*)
    `)
    .eq('id', invoiceId)
    .single();

  const doc = new PDFDocument({ size: 'A4' });

  // ヘッダー
  doc.fontSize(20)
     .text('請求書', 50, 50);

  doc.fontSize(12)
     .text(`請求書番号: ${invoice.invoice_number}`, 400, 50)
     .text(`請求日: ${format(invoice.invoice_date, 'yyyy年MM月dd日')}`, 400, 70);

  // 宛先
  doc.fontSize(14)
     .text(`${invoice.client.name} 御中`, 50, 120);

  // 請求金額
  doc.fontSize(16)
     .text(`請求金額: ¥${invoice.total_amount.toLocaleString()}`, 50, 180);

  // 明細テーブル
  let y = 250;
  doc.fontSize(10);

  // テーブルヘッダー
  doc.text('品目', 50, y)
     .text('数量', 300, y)
     .text('単価', 380, y)
     .text('金額', 460, y);

  y += 20;

  // 明細行
  invoice.items.forEach(item => {
    doc.text(item.description, 50, y)
       .text(`${item.quantity} ${item.unit}`, 300, y)
       .text(`¥${item.unit_price.toLocaleString()}`, 380, y)
       .text(`¥${item.total_price.toLocaleString()}`, 460, y);
    y += 20;
  });

  // 合計
  y += 20;
  doc.text(`小計: ¥${invoice.subtotal.toLocaleString()}`, 400, y);
  y += 20;
  doc.text(`消費税: ¥${invoice.tax_amount.toLocaleString()}`, 400, y);
  y += 20;
  doc.fontSize(12)
     .text(`合計: ¥${invoice.total_amount.toLocaleString()}`, 400, y);

  // 振込先
  doc.fontSize(10)
     .text('【振込先】', 50, 650)
     .text(invoice.organization.bank_account_info, 50, 670);

  return doc;
};
```

#### UI/UX設計
```typescript
// components/InvoiceCreator.tsx
export default function InvoiceCreator() {
  return (
    <div className="space-y-6">
      {/* ステップ1: 作業報告選択 */}
      <Card>
        <CardHeader>
          <CardTitle>1. 請求対象の作業を選択</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkReportSelector
            onSelect={setSelectedReports}
            filter={{ status: 'approved', invoiced: false }}
          />
        </CardContent>
      </Card>

      {/* ステップ2: 顧客選択 */}
      <Card>
        <CardHeader>
          <CardTitle>2. 請求先を選択</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSelector onSelect={setClient} />
        </CardContent>
      </Card>

      {/* ステップ3: 請求内容確認 */}
      <Card>
        <CardHeader>
          <CardTitle>3. 請求内容の確認</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicePreview items={invoiceItems} />

          {/* 項目の追加・編集 */}
          <Button variant="outline" className="mt-4">
            項目を追加
          </Button>
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="flex gap-4">
        <Button variant="primary">
          請求書を作成
        </Button>
        <Button variant="outline">
          プレビュー
        </Button>
      </div>
    </div>
  );
}
```

### 想定価格
- 基本請求書機能: 40万円
- 作業報告連携: 20万円
- PDF出力: 15万円
- 入金管理: 15万円
- 顧客管理: 10万円
- **合計: 100万円**

---

## 5. 定期点検・校正期限管理機能

### 概要
法定点検や校正が必要な工具・機器の期限管理。自動アラートでコンプライアンス強化。

### 解決する課題
- 校正期限切れによる測定値の信頼性低下
- 法定点検漏れによる違反リスク
- 点検スケジュールの管理負荷

### データモデル
```sql
-- 点検・校正スケジュール
CREATE TABLE inspection_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES tools(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- スケジュール情報
  inspection_type TEXT NOT NULL, -- 'calibration', 'legal', 'routine'
  interval_months INTEGER NOT NULL,
  last_inspection_date DATE,
  next_inspection_date DATE NOT NULL,

  -- 通知設定
  alert_days_before INTEGER[] DEFAULT '{30, 14, 7, 1}',
  notify_users UUID[] DEFAULT '{}',

  -- 実施情報
  inspection_vendor TEXT,
  estimated_cost DECIMAL(10,2),
  estimated_days INTEGER, -- 点検にかかる日数

  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 点検実施記録
CREATE TABLE inspection_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES inspection_schedules(id),
  tool_id UUID NOT NULL REFERENCES tools(id),

  -- 実施情報
  inspection_date DATE NOT NULL,
  inspector TEXT NOT NULL,
  certificate_number TEXT,

  -- 結果
  result TEXT NOT NULL, -- 'passed', 'failed', 'conditional'
  issues_found TEXT,
  actions_taken TEXT,

  -- コスト
  actual_cost DECIMAL(10,2),

  -- 次回予定
  next_inspection_date DATE,

  -- 添付ファイル
  certificate_url TEXT,
  report_url TEXT,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- アラート送信履歴
CREATE TABLE inspection_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES inspection_schedules(id),

  alert_type TEXT NOT NULL, -- 'upcoming', 'overdue', 'critical'
  days_until_due INTEGER,

  sent_to UUID[] NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),

  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP
);
```

### 機能詳細

#### 自動アラートシステム
```typescript
// 日次バッチ: 点検期限チェック
const checkInspectionDeadlines = async () => {
  const today = new Date();
  const alerts = [];

  // 期限が近い点検を取得
  const { data: upcomingInspections } = await supabase
    .from('inspection_schedules')
    .select(`
      *,
      tool:tools(*)
    `)
    .eq('is_active', true)
    .gte('next_inspection_date', today)
    .lte('next_inspection_date', addDays(today, 30));

  for (const schedule of upcomingInspections) {
    const daysUntilDue = differenceInDays(
      new Date(schedule.next_inspection_date),
      today
    );

    // アラート送信タイミングチェック
    if (schedule.alert_days_before.includes(daysUntilDue)) {
      // アラート作成
      const alert = {
        schedule_id: schedule.id,
        alert_type: daysUntilDue <= 7 ? 'critical' : 'upcoming',
        days_until_due: daysUntilDue,
        message: `${schedule.tool.name}の${getInspectionTypeName(schedule.inspection_type)}期限まであと${daysUntilDue}日です`,
        tool: schedule.tool
      };

      // 通知送信
      await sendInspectionAlert(alert, schedule.notify_users);

      // 記録
      await supabase
        .from('inspection_alerts')
        .insert({
          schedule_id: schedule.id,
          alert_type: alert.alert_type,
          days_until_due: daysUntilDue,
          sent_to: schedule.notify_users
        });

      alerts.push(alert);
    }
  }

  // 期限切れチェック
  const { data: overdueInspections } = await supabase
    .from('inspection_schedules')
    .select('*, tool:tools(*)')
    .eq('is_active', true)
    .lt('next_inspection_date', today);

  for (const schedule of overdueInspections) {
    // 工具を使用停止に
    await supabase
      .from('tools')
      .update({
        status: 'inspection_required',
        custom_fields: {
          ...schedule.tool.custom_fields,
          inspection_overdue_since: today
        }
      })
      .eq('id', schedule.tool_id);

    // 緊急アラート
    await sendEmergencyAlert({
      type: 'INSPECTION_OVERDUE',
      tool: schedule.tool,
      message: `${schedule.tool.name}の点検期限が切れています。使用を停止してください。`
    });
  }

  return alerts;
};
```

#### 点検スケジュール最適化
```typescript
// 複数工具の点検をまとめて実施
const optimizeInspectionSchedule = async (organizationId: string) => {
  const { data: schedules } = await supabase
    .from('inspection_schedules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('inspection_type', 'calibration')
    .order('next_inspection_date');

  // 同じ業者・同じ月の点検をグループ化
  const grouped = groupBy(schedules, (s) => {
    return `${s.inspection_vendor}_${format(s.next_inspection_date, 'yyyy-MM')}`;
  });

  const recommendations = [];

  Object.entries(grouped).forEach(([key, group]) => {
    if (group.length >= 3) {
      recommendations.push({
        vendor: group[0].inspection_vendor,
        month: format(group[0].next_inspection_date, 'yyyy年MM月'),
        tools: group.map(g => g.tool_id),
        potentialSaving: group.length * 1000, // まとめ割引想定
        message: `${group.length}台まとめて点検に出すと、約${group.length * 1000}円節約できます`
      });
    }
  });

  return recommendations;
};
```

### 想定価格
- 基本スケジュール管理: 30万円
- 自動アラート機能: 20万円
- 点検記録管理: 20万円
- レポート機能: 10万円
- **合計: 80万円**

---

## 6. 現場指示管理機能

### 概要
作業指示書の電子化。誰が・どこで・何をするかを明確化し、工具・資材の準備も連動。

### 解決する課題
- 紙の指示書の紛失・伝達ミス
- 指示内容と実作業の乖離
- 必要な工具・資材の準備漏れ

### データモデル
```sql
-- 作業指示書
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 基本情報
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- 現場・日程
  site_id UUID NOT NULL REFERENCES sites(id),
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  -- 担当者
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID[] NOT NULL, -- 複数人アサイン可
  team_leader_id UUID REFERENCES users(id),

  -- 作業内容
  work_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- 必要リソース
  required_tools UUID[], -- 必要工具リスト
  required_materials JSONB, -- [{material_id, quantity}]
  required_skills TEXT[], -- 必要資格・スキル

  -- ステータス
  status TEXT DEFAULT 'draft', -- 'draft', 'assigned', 'in_progress', 'completed', 'cancelled'

  -- 完了情報
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 作業指示書へのコメント
CREATE TABLE work_order_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 作業指示書の承認フロー
CREATE TABLE work_order_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  approver_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
  comments TEXT,
  approved_at TIMESTAMP
);
```

### 機能詳細

#### 指示書作成と配布
```typescript
// 作業指示書の作成と通知
const createWorkOrder = async (data: WorkOrderInput) => {
  // 必要スキルを持つスタッフを推奨
  const { data: qualifiedStaff } = await supabase
    .from('users')
    .select('*')
    .contains('certifications', data.required_skills);

  // 作業指示書作成
  const workOrder = await supabase
    .from('work_orders')
    .insert({
      ...data,
      order_number: generateOrderNumber(),
      status: 'assigned'
    })
    .select()
    .single();

  // 担当者に通知
  for (const userId of data.assigned_to) {
    await sendNotification({
      user_id: userId,
      type: 'work_order_assigned',
      title: '新しい作業指示',
      body: `${data.title} - ${format(data.scheduled_date, 'MM月dd日')}`,
      data: { work_order_id: workOrder.id }
    });
  }

  // 必要工具の自動予約
  if (data.required_tools.length > 0) {
    await reserveToolsForWork(
      data.required_tools,
      data.scheduled_date,
      data.assigned_to[0]
    );
  }

  return workOrder;
};
```

### 想定価格
- 基本機能: 40万円
- 承認フロー: 20万円
- 工具・資材連携: 20万円
- **合計: 80万円**

---

## 7. 車両・重機管理機能

### 概要
トラック、クレーン車などの配車管理と、積載工具の追跡を統合。

### 解決する課題
- 車両の所在が不明
- 車検・保険の期限管理
- どの車両に何が積まれているか不明

### データモデル
```sql
-- 車両マスタ
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 基本情報
  vehicle_code TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'truck', 'van', 'crane', 'forklift'
  manufacturer TEXT,
  model TEXT,
  license_plate TEXT NOT NULL,

  -- 管理情報
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  current_driver_id UUID REFERENCES users(id),
  current_location_id UUID REFERENCES locations(id),

  -- 点検・保険
  inspection_due_date DATE, -- 車検
  insurance_expiry_date DATE,

  -- 状態
  status TEXT DEFAULT 'available', -- 'available', 'in_use', 'maintenance'
  fuel_level INTEGER, -- パーセンテージ
  odometer_reading INTEGER, -- 走行距離

  custom_fields JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 車両使用記録
CREATE TABLE vehicle_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  driver_id UUID NOT NULL REFERENCES users(id),

  -- 使用情報
  purpose TEXT NOT NULL,
  destination TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  start_odometer INTEGER,
  end_odometer INTEGER,
  fuel_added DECIMAL(5,2),

  -- 積載工具
  loaded_tools UUID[],

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 想定価格
- 基本車両管理: 30万円
- 配車管理: 20万円
- 点検・保険アラート: 10万円
- **合計: 60万円**

---

## 8. 顧客・現場情報管理機能

### 概要
顧客情報と現場情報、過去の施工履歴を一元管理。

### 解決する課題
- 過去の施工内容が不明
- 現場特有の注意事項の引き継ぎ不足
- 顧客情報の散逸

### データモデル
```sql
-- プロジェクト（案件）
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),

  -- 基本情報
  project_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- 期間・金額
  start_date DATE,
  end_date DATE,
  contract_amount DECIMAL(12,2),

  -- ステータス
  status TEXT DEFAULT 'planning', -- 'planning', 'active', 'completed', 'cancelled'

  created_at TIMESTAMP DEFAULT NOW()
);

-- 現場詳細情報
CREATE TABLE site_details (
  site_id UUID PRIMARY KEY REFERENCES sites(id),

  -- アクセス情報
  access_notes TEXT, -- 鍵の場所、入場方法等
  parking_info TEXT,
  nearest_station TEXT,

  -- 注意事項
  special_requirements TEXT, -- ペット、静音作業等
  prohibited_items TEXT,

  -- 連絡先
  site_contact_name TEXT,
  site_contact_phone TEXT,
  emergency_contact TEXT,

  -- 施設情報
  has_electricity BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,
  has_toilet BOOLEAN DEFAULT true,

  updated_at TIMESTAMP DEFAULT NOW()
);

-- 施工履歴
CREATE TABLE project_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  site_id UUID REFERENCES sites(id),

  work_date DATE NOT NULL,
  work_type TEXT NOT NULL,
  description TEXT,
  workers TEXT[],
  tools_used TEXT[],
  materials_used JSONB,

  photos TEXT[],
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 想定価格
- 顧客管理: 30万円
- 現場情報管理: 20万円
- 施工履歴: 20万円
- **合計: 70万円**

---

## 9. 見積もり作成機能

### 概要
過去の施工実績を基に見積もりを自動生成。工数・資材を予測。

### 解決する課題
- 見積もり作成に時間がかかる
- 見積もり精度のばらつき
- 過去の類似案件の参照が困難

### データモデル
```sql
-- 見積書
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 基本情報
  quote_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  project_name TEXT NOT NULL,

  -- 見積情報
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,

  -- 金額
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2) NOT NULL,

  -- ステータス
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'

  -- 受注情報
  accepted_date DATE,
  project_id UUID REFERENCES projects(id),

  notes TEXT,
  terms_and_conditions TEXT,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 見積明細
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id),

  category TEXT NOT NULL, -- '労務費', '材料費', '諸経費'等
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,

  -- 原価情報（非表示）
  cost_price DECIMAL(10,2),
  profit_margin DECIMAL(5,2),

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 見積テンプレート
CREATE TABLE quote_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  name TEXT NOT NULL,
  work_type TEXT NOT NULL,

  -- テンプレート項目
  template_items JSONB NOT NULL,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 機能詳細

#### AI見積もりアシスト
```typescript
// 過去の類似案件から見積もりを生成
const generateQuoteFromSimilarProjects = async (
  workType: string,
  siteArea: number,
  requirements: string
) => {
  // 類似案件を検索
  const { data: similarProjects } = await supabase
    .from('projects')
    .select(`
      *,
      quotes(*),
      project_history(*)
    `)
    .eq('work_type', workType)
    .gte('site_area', siteArea * 0.8)
    .lte('site_area', siteArea * 1.2)
    .eq('status', 'completed')
    .limit(5);

  // 平均値を計算
  const avgCost = average(similarProjects.map(p => p.contract_amount));
  const avgDuration = average(similarProjects.map(p => p.duration_days));
  const commonMaterials = getMostUsedMaterials(similarProjects);

  // 見積もり項目を生成
  const quoteItems = [
    {
      category: '労務費',
      description: `${workType} 作業員 ${avgDuration}日間`,
      quantity: avgDuration,
      unit: '人日',
      unit_price: 25000,
      total_price: avgDuration * 25000
    },
    ...commonMaterials.map(m => ({
      category: '材料費',
      description: m.name,
      quantity: m.avgQuantity,
      unit: m.unit,
      unit_price: m.unitPrice * 1.3, // 30%マージン
      total_price: m.avgQuantity * m.unitPrice * 1.3
    }))
  ];

  return {
    estimatedCost: avgCost,
    estimatedDuration: avgDuration,
    quoteItems,
    similarProjects: similarProjects.map(p => ({
      name: p.name,
      cost: p.contract_amount,
      duration: p.duration_days
    }))
  };
};
```

### 想定価格
- 基本見積機能: 40万円
- テンプレート機能: 20万円
- 類似案件検索: 20万円
- PDF出力: 10万円
- **合計: 90万円**

---

## 10. 安全管理・KY活動記録機能

### 概要
危険予知活動、ヒヤリハット報告、安全装備チェックを電子化。

### 解決する課題
- 紙ベースのKY活動記録の管理
- ヒヤリハット情報の共有不足
- 安全装備の装着確認漏れ

### データモデル
```sql
-- KY（危険予知）活動記録
CREATE TABLE ky_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  site_id UUID NOT NULL REFERENCES sites(id),

  -- 実施情報
  activity_date DATE NOT NULL,
  leader_id UUID NOT NULL REFERENCES users(id),
  participants UUID[] NOT NULL,

  -- 作業内容
  work_description TEXT NOT NULL,

  -- 危険予知
  hazards JSONB NOT NULL, -- [{hazard, risk_level, countermeasure}]

  -- 重点実施項目
  key_points TEXT[],

  -- 確認事項
  safety_equipment_check JSONB,
  tool_inspection_done BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

-- ヒヤリハット報告
CREATE TABLE near_miss_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 発生情報
  occurred_at TIMESTAMP NOT NULL,
  site_id UUID REFERENCES sites(id),
  reported_by UUID NOT NULL REFERENCES users(id),

  -- 内容
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  potential_consequence TEXT,

  -- 原因と対策
  root_cause TEXT,
  immediate_action TEXT,
  preventive_measure TEXT,

  -- 重要度
  severity_level INTEGER, -- 1-5

  -- 共有状況
  shared_with_team BOOLEAN DEFAULT false,
  shared_date DATE,

  photos TEXT[],

  created_at TIMESTAMP DEFAULT NOW()
);

-- 安全パトロール記録
CREATE TABLE safety_patrols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id),

  patrol_date DATE NOT NULL,
  inspector_id UUID NOT NULL REFERENCES users(id),

  -- チェック項目
  checklist_results JSONB, -- [{item, result, notes}]

  -- 指摘事項
  violations JSONB, -- [{violation, severity, corrective_action}]

  overall_score INTEGER, -- 0-100

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 想定価格
- KY活動記録: 30万円
- ヒヤリハット: 30万円
- 安全パトロール: 20万円
- レポート機能: 20万円
- **合計: 100万円**

---

## 11. スタッフ資格・免許管理機能

### 概要
スタッフの保有資格、免許の期限管理、スキルマトリックスの作成。

### 解決する課題
- 誰がどの資格を持っているか不明
- 資格・免許の更新漏れ
- 適材適所の人員配置困難

### データモデル
```sql
-- スタッフ資格情報
CREATE TABLE staff_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- 資格情報
  certification_type TEXT NOT NULL, -- 'license', 'qualification', 'training'
  name TEXT NOT NULL,
  issuer TEXT,

  -- 有効期限
  issue_date DATE NOT NULL,
  expiry_date DATE,

  -- 証明書
  certificate_number TEXT,
  certificate_url TEXT,

  -- 更新情報
  renewal_required BOOLEAN DEFAULT false,
  renewal_reminder_days INTEGER DEFAULT 30,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- スキルマトリックス
CREATE TABLE skill_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- スキルレベル（1-5）
  skills JSONB, -- {welding: 4, painting: 5, electrical: 2}

  -- 経験年数
  experience_years JSONB, -- {welding: 5, painting: 8}

  -- 得意分野
  specialties TEXT[],

  updated_at TIMESTAMP DEFAULT NOW()
);

-- 研修記録
CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),

  training_name TEXT NOT NULL,
  training_type TEXT, -- 'safety', 'skill', 'compliance'
  provider TEXT,

  completed_date DATE NOT NULL,
  valid_until DATE,

  score INTEGER,
  certificate_url TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 想定価格
- 資格管理: 30万円
- 期限アラート: 20万円
- スキルマトリックス: 20万円
- 研修管理: 10万円
- **合計: 80万円**

---

## 消耗品管理について（初期開発での対応）

### 既存仕様での対応状況

SPECIFICATION_SAAS_FINAL.mdで既に以下の対応がされています：

```sql
-- toolsテーブルで消耗品も管理
CREATE TABLE tools (
  id UUID PRIMARY KEY,

  -- 管理方式の切り替え
  management_type TEXT DEFAULT 'individual', -- 'individual'（個別）or 'quantity'（数量）

  -- 数量管理用フィールド
  current_quantity INTEGER, -- 現在の在庫数
  unit TEXT DEFAULT '個', -- 単位（個、本、箱、L、kg等）

  -- カスタムフィールドで拡張
  custom_fields JSONB DEFAULT '{}',
  -- {
  --   minimum_stock: 100,  // 最低在庫数
  --   reorder_point: 150,  // 発注点
  --   supplier: "モノタロウ",
  --   unit_price: 15.5
  -- }
);
```

### 運用例

#### 工具（個別管理）
```typescript
{
  management_type: 'individual',
  tool_code: 'A-0123',
  name: 'インパクトドライバー',
  current_quantity: null // 使用しない
}
```

#### 消耗品（数量管理）
```typescript
{
  management_type: 'quantity',
  tool_code: 'C-0001',
  name: 'ビス 65mm',
  current_quantity: 5000, // 5000本
  unit: '本',
  custom_fields: {
    minimum_stock: 1000,
    reorder_point: 1500
  }
}
```

### 追加開発での拡張

上記の「資材発注・在庫管理機能」で、より高度な消耗品管理が可能になります：
- 自動発注提案
- 使用履歴分析
- 現場ごとの消費量予測
- 仕入先管理

---

## 開発ロードマップまとめ

### フェーズ1（3ヶ月後）- 現場DX基盤
1. **作業報告** - 50万円
2. **出退勤管理** - 80万円
3. **定期点検・校正期限管理** - 80万円
- **小計: 210万円**

### フェーズ2（6ヶ月後）- 業務効率化
4. **資材発注・在庫管理** - 100万円
5. **請求書作成** - 100万円
6. **現場指示管理** - 80万円
7. **車両・重機管理** - 60万円
- **小計: 340万円**

### フェーズ3（1年後）- 経営支援
8. **顧客・現場情報管理** - 70万円
9. **見積もり作成** - 90万円
10. **安全管理・KY活動** - 100万円
11. **スタッフ資格・免許管理** - 80万円
- **小計: 340万円**

**総計: 890万円**

---

## 推奨事項

1. **最優先機能**
   - 作業報告（工具使用履歴の自動化が差別化要素）
   - 出退勤管理（直行直帰対応）
   - 定期点検・校正期限管理（コンプライアンス）

2. **競合優位性を生む機能**
   - 工具×作業報告の連携
   - 工具×出退勤の連携
   - AI異常検知（盗難防止）

3. **収益化の観点**
   - 基本プラン: 工具管理のみ
   - 標準プラン: +作業報告、出退勤
   - プレミアムプラン: 全機能

---

**作成日**: 2025-11-29
**更新日**: -