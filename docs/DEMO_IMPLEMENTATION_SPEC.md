# ザイロク 資料請求・デモ環境 実装仕様書

## 📋 1. 全体概要

### システム構成
```
[トップページ]
    ↓ ボタンクリック
[資料請求フォーム]
    ↓ 申込
[自動処理]
    ├→ PDF資料メール送信
    ├→ デモアカウント自動生成
    └→ CRM連携・KPI記録

[デモ環境]
    ├→ 7日間限定アクセス
    └→ 機能制限版で体験
```

---

## 🔧 2. 実装タスク詳細

### **Phase 1: 基盤構築（3日）**

#### 2.1 トップページ修正
```typescript
// 変更箇所: app/(public)/page.tsx
const changes = {
  before: "機能と料金プランを見る",
  after: "資料請求してデモ画面を見る",
  link: "/request-demo",
  style: "既存のオレンジボタンスタイルを維持"
}
```

**実装ファイル:**
- `app/(public)/page.tsx`

**変更内容:**
- ヒーローセクションのCTAボタンテキストとリンク先を変更

---

#### 2.2 資料請求フォームページ作成
```typescript
// 新規作成: app/(public)/request-demo/page.tsx
const formStructure = {
  // 必須項目
  required: {
    companyName: "会社名",
    personName: "ご担当者名",
    email: "メールアドレス（会社ドメイン推奨）",
    phone: "電話番号"
  },

  // 任意項目
  optional: {
    department: "部署名",
    employeeCount: "従業員数（選択式）",
    toolCount: "管理予定の資材数（選択式）",
    timeline: "導入予定時期（選択式）",
    message: "ご要望・ご質問"
  },

  // バリデーション
  validation: {
    email: "フリーメール警告（Gmail/Yahoo等）",
    duplicate: "24時間以内の重複申請チェック",
    spam: "同一IPからの連続申請ブロック"
  }
}
```

**実装ファイル:**
- `app/(public)/request-demo/page.tsx` - メインページ
- `components/RequestDemoForm.tsx` - フォームコンポーネント
- `app/api/demo/request/route.ts` - API エンドポイント

**従業員数の選択肢:**
- 〜50名
- 51-100名
- 101-300名
- 301名〜

**管理予定の資材数の選択肢:**
- 〜100個
- 101-500個
- 501-1000個
- 1000個〜

**導入予定時期の選択肢:**
- 1ヶ月以内
- 3ヶ月以内
- 6ヶ月以内
- 未定

---

#### 2.3 データベース設計
```sql
-- demo_requests テーブル
CREATE TABLE demo_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  person_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT,
  employee_count TEXT,
  tool_count TEXT,
  timeline TEXT,
  message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  -- デモアカウント情報
  demo_email TEXT UNIQUE,
  demo_password_hash TEXT,
  demo_user_id UUID,
  demo_company_id UUID,
  demo_expires_at TIMESTAMP,
  demo_activated_at TIMESTAMP,

  -- ステータス
  status TEXT DEFAULT 'pending', -- pending/approved/expired/converted

  -- KPI追跡
  pdf_downloaded_at TIMESTAMP,
  demo_login_count INTEGER DEFAULT 0,
  last_demo_login_at TIMESTAMP,

  -- 営業管理
  assigned_to TEXT,
  follow_up_date DATE,
  notes TEXT
);

-- demo_activity_logs テーブル（行動追跡用）
CREATE TABLE demo_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demo_request_id UUID REFERENCES demo_requests(id),
  action TEXT NOT NULL, -- login/feature_use/export_attempt等
  feature_name TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_demo_requests_email ON demo_requests(email);
CREATE INDEX idx_demo_requests_status ON demo_requests(status);
CREATE INDEX idx_demo_requests_created_at ON demo_requests(created_at);
CREATE INDEX idx_demo_activity_logs_request_id ON demo_activity_logs(demo_request_id);
```

**マイグレーションファイル:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_demo_tables.sql`

---

## 📄 3. PDF資料配布方式

### **メール添付 + ダウンロードリンク併用**

```typescript
const pdfDelivery = {
  // 即時メール送信
  email: {
    subject: "【ザイロク】資料とデモ環境のご案内",
    attachments: [
      "zairoku_catalog.pdf (2MB)", // 基本資料
      "zairoku_casestudy.pdf (1MB)" // 導入事例
    ],
    body: `
      ${company_name} ${person_name} 様

      この度は資料請求いただきありがとうございます。

      【資料ダウンロード】
      以下のリンクからもダウンロード可能です（7日間有効）：
      https://zairoku.com/download/${unique_token}

      【デモ環境アクセス情報】
      URL: https://demo.zairoku.com
      メール: ${demo_email}
      パスワード: ${demo_password}
      有効期限: ${expiry_date}（7日間）

      【デモ環境でお試しいただける機能】
      ✓ QRコードでの工具管理
      ✓ リアルタイム在庫確認
      ✓ 作業報告書作成
      ✓ チーム管理機能

      ※デモ環境は一部機能に制限があります。
      ※製品版では全機能をご利用いただけます。

      ご不明点がございましたらお気軽にお問い合わせください。

      株式会社ザイロク
      support@zairoku.com
    `
  },

  // PDFセキュリティ
  security: {
    watermark: "資料請求者の会社名を透かし",
    expiry: "ダウンロードリンク7日間",
    tracking: "ダウンロード回数記録"
  }
}
```

**実装ファイル:**
- `app/api/demo/send-email/route.ts` - メール送信API
- `lib/email/templates/demo-welcome.tsx` - メールテンプレート（React Email使用）
- `public/pdfs/zairoku_catalog.pdf` - カタログPDF（作成必要）
- `public/pdfs/zairoku_casestudy.pdf` - 導入事例PDF（作成必要）
- `app/api/download/[token]/route.ts` - PDFダウンロードAPI

**使用サービス:**
- Resend または SendGrid（メール送信）
- Vercel Blob Storage（PDF保存）

---

## 🔐 4. デモ環境仕様

### 4.1 自動アカウント生成フロー

```typescript
// API Route: app/api/demo/create/route.ts
async function createDemoAccount(requestData: DemoRequest) {
  // 1. デモ用メールアドレス生成
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const demoEmail = `demo_${timestamp}_${random}@demo.zairoku.com`;
  const demoPassword = generateSecurePassword(10);

  // 2. Supabaseでユーザー作成
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: demoEmail,
    password: demoPassword,
    email_confirm: true, // 確認不要
    user_metadata: {
      is_demo: true,
      company_name: requestData.company_name,
      expires_at: addDays(new Date(), 7),
      original_email: requestData.email,
      original_request_id: requestData.id
    }
  });

  // 3. デモ用会社データ作成
  const { data: company } = await supabase.from('companies').insert({
    id: generateUUID(),
    name: `${requestData.company_name}（デモ）`,
    subdomain: `demo_${timestamp}`,
    is_demo: true,
    plan: 'demo',
    created_by: user.id,
    expires_at: addDays(new Date(), 7)
  }).select().single();

  // 4. サンプルデータ投入
  await insertSampleData(user.id, company.id);

  // 5. demo_requests テーブル更新
  await supabase.from('demo_requests').update({
    demo_email: demoEmail,
    demo_password_hash: await hashPassword(demoPassword),
    demo_user_id: user.id,
    demo_company_id: company.id,
    demo_expires_at: addDays(new Date(), 7),
    status: 'approved'
  }).eq('id', requestData.id);

  return { demoEmail, demoPassword, expiresAt: addDays(new Date(), 7) };
}

// パスワード生成関数
function generateSecurePassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
```

**実装ファイル:**
- `app/api/demo/create/route.ts` - アカウント生成API
- `lib/demo/account-generator.ts` - アカウント生成ロジック
- `lib/demo/sample-data.ts` - サンプルデータ投入

---

### 4.2 機能制限実装

```typescript
// lib/demo/restrictions.ts
export const demoRestrictions = {
  // データ量制限
  limits: {
    maxTools: 20,          // 工具20個まで
    maxStaff: 5,          // スタッフ5名まで
    maxLocations: 3,      // 拠点3箇所まで
    maxReports: 10,       // 報告書10件まで
    maxPhotos: 5,         // 写真5枚まで/報告書
  },

  // 機能制限
  disabledFeatures: [
    'csv_export',         // CSVエクスポート
    'pdf_export',         // PDF出力
    'api_access',         // API連携
    'custom_fields',      // カスタムフィールド
    'advanced_analytics', // 高度な分析
    'bulk_operations',    // 一括操作
    'integrations',       // 外部連携
    'staff_import',       // スタッフ一括登録
    'custom_qr',          // QRコードカスタマイズ
  ],

  // UI表示
  ui: {
    watermark: 'デモ環境',
    bannerText: '本環境はデモ用です。7日後に自動削除されます。',
    bannerColor: 'bg-orange-100 text-orange-800',
    disabledButtonText: '製品版でご利用可能',
    upgradePrompt: '全機能を使うには製品版にアップグレード'
  }
}

// hooks/useDemo.ts
export function useDemo() {
  const { user } = useAuth();
  const isDemo = user?.user_metadata?.is_demo || false;
  const expiresAt = user?.user_metadata?.expires_at;

  const checkLimit = (feature: keyof typeof demoRestrictions.limits, currentCount: number) => {
    if (!isDemo) return true;
    return currentCount < demoRestrictions.limits[feature];
  };

  const isFeatureDisabled = (feature: string) => {
    if (!isDemo) return false;
    return demoRestrictions.disabledFeatures.includes(feature);
  };

  const getDaysRemaining = () => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return {
    isDemo,
    expiresAt,
    checkLimit,
    isFeatureDisabled,
    getDaysRemaining,
    restrictions: demoRestrictions
  };
}
```

**実装ファイル:**
- `lib/demo/restrictions.ts` - 制限定義
- `hooks/useDemo.ts` - デモ判定Hook
- `components/DemoRestriction.tsx` - 制限UIコンポーネント
- `components/DemoBanner.tsx` - デモ環境バナー
- `middleware.ts` - 機能制限ミドルウェア追加

**使用例:**
```typescript
// components/DemoRestriction.tsx
export function DemoRestriction({
  feature,
  children
}: {
  feature: string;
  children: React.ReactNode
}) {
  const { isDemo, isFeatureDisabled } = useDemo();

  if (isDemo && isFeatureDisabled(feature)) {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
            製品版でご利用可能
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 使用箇所
<DemoRestriction feature="csv_export">
  <Button onClick={handleExport}>CSVエクスポート</Button>
</DemoRestriction>
```

---

### 4.3 サンプルデータ

```typescript
// lib/demo/sample-data.ts
export async function insertSampleData(userId: string, companyId: string) {
  const supabase = createClient();

  // 1. 拠点データ
  const locations = [
    { name: "本社倉庫", address: "東京都千代田区", company_id: companyId },
    { name: "現場A", address: "神奈川県横浜市", company_id: companyId },
    { name: "現場B", address: "埼玉県さいたま市", company_id: companyId },
  ];
  const { data: insertedLocations } = await supabase
    .from('locations')
    .insert(locations)
    .select();

  // 2. カテゴリデータ
  const categories = [
    { name: "電動工具", company_id: companyId },
    { name: "手動工具", company_id: companyId },
    { name: "測定機器", company_id: companyId },
    { name: "安全用品", company_id: companyId },
  ];
  const { data: insertedCategories } = await supabase
    .from('categories')
    .insert(categories)
    .select();

  // 3. 工具データ（20個）
  const tools = [
    {
      name: "インパクトドライバー",
      qr_code: "DEMO-001",
      status: "available",
      category_id: insertedCategories[0].id,
      location_id: insertedLocations[0].id,
      company_id: companyId
    },
    {
      name: "丸ノコ",
      qr_code: "DEMO-002",
      status: "in_use",
      category_id: insertedCategories[0].id,
      location_id: insertedLocations[1].id,
      company_id: companyId
    },
    {
      name: "発電機",
      qr_code: "DEMO-003",
      status: "maintenance",
      category_id: insertedCategories[0].id,
      location_id: insertedLocations[0].id,
      company_id: companyId
    },
    // ... 残り17個
  ];
  await supabase.from('items').insert(tools);

  // 4. スタッフデータ（デモ用アカウント含む）
  const staff = [
    {
      name: "山田太郎（あなた）",
      email: userId,
      role: "admin",
      company_id: companyId
    },
    {
      name: "鈴木一郎",
      email: "suzuki@demo.local",
      role: "leader",
      company_id: companyId
    },
    {
      name: "田中花子",
      email: "tanaka@demo.local",
      role: "staff",
      company_id: companyId
    },
  ];
  await supabase.from('staff').insert(staff);

  // 5. 利用履歴（過去30日分・200件）
  const histories = generateRandomHistories(200, companyId);
  await supabase.from('history').insert(histories);

  // 6. 作業報告書（10件）
  const reports = generateSampleReports(10, companyId);
  await supabase.from('work_reports').insert(reports);
}

function generateRandomHistories(count: number, companyId: string) {
  // 過去30日間のランダムな貸出/返却履歴を生成
  const histories = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    histories.push({
      item_id: `DEMO-${String(Math.floor(Math.random() * 20) + 1).padStart(3, '0')}`,
      staff_id: ['suzuki@demo.local', 'tanaka@demo.local'][Math.floor(Math.random() * 2)],
      action: ['checkout', 'return'][Math.floor(Math.random() * 2)],
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      company_id: companyId
    });
  }
  return histories;
}

function generateSampleReports(count: number, companyId: string) {
  // サンプル報告書を生成
  const reports = [];
  for (let i = 0; i < count; i++) {
    reports.push({
      title: `作業報告書 ${i + 1}`,
      content: 'サンプルの作業内容です。',
      status: ['draft', 'submitted', 'approved'][Math.floor(Math.random() * 3)],
      created_by: 'suzuki@demo.local',
      company_id: companyId,
      created_at: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000)
    });
  }
  return reports;
}
```

**実装ファイル:**
- `lib/demo/sample-data.ts` - サンプルデータ生成

---

### 4.4 自動削除システム

```typescript
// app/api/cron/cleanup-demos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Vercel Cron Jobからのみ実行可能
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // 1. 期限切れのデモアカウントを取得
  const { data: expiredDemos } = await supabase
    .from('demo_requests')
    .select('*')
    .eq('status', 'approved')
    .lt('demo_expires_at', new Date().toISOString());

  if (!expiredDemos || expiredDemos.length === 0) {
    return NextResponse.json({ message: 'No expired demos found' });
  }

  // 2. 各デモアカウントを削除
  for (const demo of expiredDemos) {
    try {
      // ユーザー削除
      if (demo.demo_user_id) {
        await supabase.auth.admin.deleteUser(demo.demo_user_id);
      }

      // 会社データ削除（CASCADE設定により関連データも削除）
      if (demo.demo_company_id) {
        await supabase
          .from('companies')
          .delete()
          .eq('id', demo.demo_company_id);
      }

      // ステータス更新
      await supabase
        .from('demo_requests')
        .update({ status: 'expired' })
        .eq('id', demo.id);

      console.log(`Deleted demo account: ${demo.demo_email}`);
    } catch (error) {
      console.error(`Failed to delete demo ${demo.id}:`, error);
    }
  }

  return NextResponse.json({
    message: `Deleted ${expiredDemos.length} demo accounts`
  });
}
```

**Vercel Cron設定:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/cleanup-demos",
    "schedule": "0 3 * * *"
  }]
}
```

**実装ファイル:**
- `app/api/cron/cleanup-demos/route.ts` - 自動削除Cron
- `vercel.json` - Cron設定
- `.env.local` に `CRON_SECRET` 追加

---

## 📊 5. KPI計測システム

### 5.1 計測項目

```typescript
// lib/analytics/kpi-definitions.ts
export const kpiTracking = {
  // ファネル分析
  funnel: {
    topPage: "トップページ訪問数",
    buttonClick: "資料請求ボタンクリック数",
    formStart: "フォーム入力開始数",
    formComplete: "フォーム完了数",
    emailOpen: "メール開封率",
    demoLogin: "デモログイン率",
    demoActive: "デモアクティブ率（3回以上ログイン）",
    inquiry: "問い合わせ率",
    trial: "本番トライアル申込率",
    conversion: "有料契約率"
  },

  // 行動分析
  behavior: {
    featureUsage: {
      qr_scan: "QRスキャン使用率",
      tool_register: "工具登録機能使用率",
      report_create: "報告書作成機能使用率",
      team_invite: "チーム招待機能使用率",
      inventory_check: "在庫確認機能使用率"
    },
    sessionDuration: "平均セッション時間",
    pageViews: "平均ページビュー数",
    returnRate: "再訪率（2日目以降）"
  },

  // 属性分析
  attributes: {
    companySize: "企業規模別コンバージョン率",
    timeline: "導入時期別コンバージョン率",
    source: "流入元別コンバージョン率"
  }
}
```

---

### 5.2 実装方法

```typescript
// lib/analytics/tracker.ts
export class DemoAnalytics {
  // デモログイン記録
  static async trackLogin(demoRequestId: string) {
    const supabase = createClient();

    // ログイン回数をインクリメント
    await supabase.rpc('increment_demo_login', {
      request_id: demoRequestId
    });

    // アクティビティログに記録
    await supabase.from('demo_activity_logs').insert({
      demo_request_id: demoRequestId,
      action: 'login',
      created_at: new Date().toISOString()
    });

    // Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'demo_login', {
        demo_id: demoRequestId
      });
    }
  }

  // 機能使用記録
  static async trackFeatureUse(demoRequestId: string, featureName: string, details?: any) {
    const supabase = createClient();

    await supabase.from('demo_activity_logs').insert({
      demo_request_id: demoRequestId,
      action: 'feature_use',
      feature_name: featureName,
      details: details || {},
      created_at: new Date().toISOString()
    });

    // Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'demo_feature_use', {
        feature_name: featureName,
        demo_id: demoRequestId
      });
    }
  }

  // エクスポート試行記録（ブロック対象）
  static async trackExportAttempt(demoRequestId: string, exportType: string) {
    const supabase = createClient();

    await supabase.from('demo_activity_logs').insert({
      demo_request_id: demoRequestId,
      action: 'export_attempt',
      feature_name: exportType,
      details: { blocked: true },
      created_at: new Date().toISOString()
    });

    // アラート送信（営業フォローのチャンス）
    await fetch('/api/alerts/export-attempt', {
      method: 'POST',
      body: JSON.stringify({ demoRequestId, exportType })
    });
  }
}

// Supabase Function
-- supabase/migrations/create_increment_demo_login.sql
CREATE OR REPLACE FUNCTION increment_demo_login(request_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE demo_requests
  SET
    demo_login_count = demo_login_count + 1,
    last_demo_login_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;
```

**実装ファイル:**
- `lib/analytics/kpi-definitions.ts` - KPI定義
- `lib/analytics/tracker.ts` - トラッキング関数
- `app/api/analytics/track/route.ts` - トラッキングAPI
- `supabase/migrations/create_increment_demo_login.sql` - SQL関数

---

### 5.3 ダッシュボード

```typescript
// app/(admin)/admin/demo-analytics/page.tsx
export default async function DemoAnalyticsPage() {
  const supabase = createClient();

  // KPI取得
  const { data: requests } = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const totalRequests = requests?.length || 0;
  const loginRate = requests?.filter(r => r.demo_login_count > 0).length / totalRequests;
  const activeRate = requests?.filter(r => r.demo_login_count >= 3).length / totalRequests;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">デモ環境KPI</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KPICard title="資料請求数" value={totalRequests} />
        <KPICard title="ログイン率" value={`${(loginRate * 100).toFixed(1)}%`} />
        <KPICard title="アクティブ率" value={`${(activeRate * 100).toFixed(1)}%`} />
        <KPICard title="コンバージョン" value="0%" />
      </div>

      {/* 詳細テーブル */}
      <DemoRequestsTable requests={requests} />
    </div>
  );
}
```

**実装ファイル:**
- `app/(admin)/admin/demo-analytics/page.tsx` - 管理画面
- `components/admin/KPICard.tsx` - KPIカードコンポーネント
- `components/admin/DemoRequestsTable.tsx` - リクエスト一覧テーブル

---

## 🚀 6. 見込み客獲得施策

### 6.1 SEO対策

```typescript
// app/(public)/request-demo/page.tsx のメタデータ
export const metadata: Metadata = {
  title: '資料請求・無料デモ体験 | ザイロク - 建設業向け工具管理システム',
  description: '建設業・工事現場の工具・資材管理をDX化。QRコードで簡単チェックイン/アウト。7日間の無料デモ体験で実際の操作感をお試しいただけます。',
  keywords: '建設業 工具管理, QRコード 在庫管理, 現場 資材管理 アプリ, 工具 貸出管理',
  openGraph: {
    title: '資料請求・無料デモ体験 | ザイロク',
    description: '建設業・工事現場の工具・資材管理をDX化。7日間無料デモ体験実施中。',
    images: ['/og-demo.png'],
  }
};
```

**ターゲットキーワード:**
- 建設業 工具管理 システム
- QRコード 在庫管理 建設
- 現場 資材管理 アプリ
- 工具 貸出管理 クラウド
- 建設DX ツール

**実装ファイル:**
- `app/(public)/request-demo/page.tsx` - メタデータ追加
- `public/og-demo.png` - OG画像作成

---

### 6.2 リード獲得施策

```typescript
const leadGeneration = {
  // Web施策
  webStrategy: {
    exitIntent: {
      component: 'ExitIntentPopup',
      trigger: 'マウスが画面外に出る時',
      message: '今なら7日間無料でデモ体験可能！',
      cta: '資料請求する'
    },

    chatBot: {
      service: 'Intercom または Crisp',
      autoMessage: '何かお困りですか？デモ環境のご案内も可能です',
      availability: '平日9:00-18:00'
    },

    retargeting: {
      platform: ['Google Ads', 'Meta Ads'],
      audience: 'トップページ訪問後、資料請求未完了',
      duration: '30日間',
      message: 'まだ間に合います！7日間無料デモ体験'
    }
  },

  // コンテンツマーケティング
  contentMarketing: {
    blog: [
      '工具の紛失を90%削減した3つの方法',
      '建設DXで生産性を2倍にする秘訣',
      '中小建設業のための資材管理入門'
    ],
    ebook: '建設業DX完全ガイド2024（PDF）',
    template: '工具管理Excelテンプレート（無料）'
  }
}
```

**実装ファイル:**
- `components/ExitIntentPopup.tsx` - 離脱防止ポップアップ
- `lib/tracking/exit-intent.ts` - 離脱検知ロジック

---

### 6.3 ナーチャリング施策

```typescript
// メールシーケンス（Resend Workflows使用）
const emailSequence = [
  {
    day: 0,
    subject: '【ザイロク】資料とデモ環境のご案内',
    template: 'demo-welcome',
    content: 'デモアカウント情報・使い方ガイド'
  },
  {
    day: 2,
    subject: '活用事例：A社様の導入効果をご紹介',
    template: 'case-study',
    content: '実際の導入企業の成功事例'
  },
  {
    day: 4,
    subject: 'よくあるご質問とその回答',
    template: 'faq',
    content: '料金・セキュリティ・サポート等のFAQ'
  },
  {
    day: 6,
    subject: '【残り1日】デモ環境の有効期限が近づいています',
    template: 'expiry-reminder',
    content: '期限前リマインド・延長または本契約の案内'
  },
  {
    day: 7,
    subject: '【特別オファー】初月50%OFF + 無料セットアップ',
    template: 'special-offer',
    content: '期限日の特別オファー'
  },
  {
    day: 14,
    subject: '個別導入相談会のご案内',
    template: 'consultation-invite',
    content: 'オンライン相談会への招待'
  }
];

// リードスコアリング
const leadScoring = {
  high: {
    criteria: [
      'ログイン回数 >= 3',
      'QRスキャン機能使用',
      '報告書作成機能使用',
      '従業員数 >= 50',
      'エクスポート試行'
    ],
    action: '営業が24時間以内に電話',
    priority: '最優先'
  },
  medium: {
    criteria: [
      'ログイン回数 1-2',
      'PDF資料ダウンロード',
      '従業員数 10-49'
    ],
    action: 'メールフォロー + 7日後に電話',
    priority: '通常'
  },
  low: {
    criteria: [
      'ログインなし',
      'メール未開封'
    ],
    action: 'メールナーチャリングのみ',
    priority: '低'
  }
};
```

**実装ファイル:**
- `lib/email/sequences/demo-nurturing.ts` - メールシーケンス定義
- `app/api/cron/send-nurturing-emails/route.ts` - 自動メール送信Cron
- `lib/scoring/lead-scorer.ts` - リードスコアリングロジック

---

## 📅 7. 実装スケジュール

### Week 1（基盤構築）
- **Day 1-2**:
  - [ ] トップページ修正
  - [ ] 資料請求フォームページ作成
  - [ ] フォームバリデーション実装

- **Day 3-4**:
  - [ ] DB設計・マイグレーション実行
  - [ ] 資料請求API実装
  - [ ] 重複申請チェック実装

- **Day 5**:
  - [ ] PDF資料作成（カタログ・導入事例）
  - [ ] メール送信機能実装（Resend設定）
  - [ ] PDFダウンロードAPI実装

### Week 2（デモ環境構築）
- **Day 6-7**:
  - [ ] 自動アカウント生成システム実装
  - [ ] デモ用サブドメイン設定（demo.zairoku.com）
  - [ ] パスワード生成・メール通知

- **Day 8-9**:
  - [ ] 機能制限ミドルウェア実装
  - [ ] デモ判定Hook作成
  - [ ] DemoRestrictionコンポーネント作成
  - [ ] サンプルデータ投入機能実装

- **Day 10**:
  - [ ] 自動削除Cron実装
  - [ ] Vercel Cron設定
  - [ ] 期限管理・通知機能

### Week 3（計測・最適化）
- **Day 11-12**:
  - [ ] KPI計測システム実装
  - [ ] Google Analytics設定
  - [ ] 管理画面（KPIダッシュボード）作成

- **Day 13**:
  - [ ] 離脱防止ポップアップ実装
  - [ ] メールシーケンス設定
  - [ ] リードスコアリング実装

- **Day 14-15**:
  - [ ] 全機能の統合テスト
  - [ ] 本番環境デプロイ
  - [ ] 動作確認・最終調整

---

## 🔧 8. 環境変数

```bash
# .env.local に追加
# Resend (メール送信)
RESEND_API_KEY=re_xxxxx

# Cron Secret
CRON_SECRET=your-secret-key

# デモ環境設定
DEMO_SUBDOMAIN=demo.zairoku.com
DEMO_EXPIRY_DAYS=7

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 📝 9. チェックリスト

### 実装完了チェック
- [ ] トップページのボタンが正しくリンクしている
- [ ] 資料請求フォームが正常に動作する
- [ ] メールが正しく送信される
- [ ] PDFがダウンロードできる
- [ ] デモアカウントが自動生成される
- [ ] デモ環境にログインできる
- [ ] サンプルデータが正しく表示される
- [ ] 機能制限が正しく動作する
- [ ] 7日後に自動削除される
- [ ] KPIが正しく記録される
- [ ] 管理画面でKPIが確認できる

### セキュリティチェック
- [ ] 重複申請がブロックされる
- [ ] スパム対策が機能している
- [ ] デモデータが本番データと分離されている
- [ ] 期限切れアカウントでログインできない
- [ ] 機能制限がバイパスできない

### パフォーマンスチェック
- [ ] フォーム送信が5秒以内に完了
- [ ] メール送信が30秒以内に完了
- [ ] デモアカウント生成が10秒以内に完了
- [ ] 本番環境に影響がない

---

## 🎯 10. 成功指標

### 短期目標（1ヶ月）
- 資料請求数: 20件/月
- デモログイン率: 60%以上
- デモアクティブ率（3回以上ログイン）: 30%以上

### 中期目標（3ヶ月）
- 資料請求数: 50件/月
- 問い合わせ率: 20%以上
- トライアル申込率: 10%以上

### 長期目標（6ヶ月）
- 資料請求数: 100件/月
- 有料契約率: 5%以上
- 月間契約数: 5社以上

---

## 📚 11. 参考資料

- [Resend Documentation](https://resend.com/docs)
- [React Email](https://react.email/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Google Analytics 4](https://developers.google.com/analytics/devguides/collection/ga4)
- [Supabase Auth Admin](https://supabase.com/docs/reference/javascript/auth-admin-api)
