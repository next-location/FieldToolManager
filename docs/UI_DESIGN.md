# UIデザイン仕様書

> ⚠️ **重要**: 役割別のアクセス制御について
>
> 本ドキュメントはUIデザインの技術的な実装に焦点を当てています。
> ユーザーの役割（staff, leader, admin, super_admin）に基づく
> 詳細なアクセス権限と画面制御については、以下のドキュメントを参照してください：
>
> 📋 **[役割別アクセス制御（RBAC）仕様書](./ROLE_BASED_ACCESS_CONTROL.md)**
> - 全75機能の権限マトリクス
> - 役割別の画面構成
> - APIエンドポイントの権限設定
> - セキュリティ実装ガイドライン

## 目次

1. [概要](#1-概要)
2. [デザイン原則](#2-デザイン原則)
3. [機能フラグ対応UIアーキテクチャ](#3-機能フラグ対応uiアーキテクチャ)
4. [レイアウト構造](#4-レイアウト構造)
5. [コンポーネント設計](#5-コンポーネント設計)
6. [画面設計](#6-画面設計)
7. [管理画面メニューシステム](#7-管理画面メニューシステム)
8. [レスポンシブ対応](#8-レスポンシブ対応)
9. [アクセシビリティ](#9-アクセシビリティ)
10. [パフォーマンス最適化](#10-パフォーマンス最適化)
11. [実装ガイドライン](#11-実装ガイドライン)

---

## 1. 概要

### 1.1 目的

本ドキュメントは、Field Tool Manager のUI設計方針と実装ガイドラインを定義します。特に、顧客ごとに異なる機能提供を実現する動的UIアーキテクチャに重点を置いています。

### 1.2 対象読者

- フロントエンド開発者
- UIデザイナー
- プロダクトマネージャー
- システムアーキテクト

### 1.3 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UIライブラリ**: shadcn/ui
- **アイコン**: Lucide React
- **状態管理**: Zustand / Context API
- **フォーム**: React Hook Form + Zod

---

## 2. デザイン原則

### 2.1 現場作業環境への最適化

#### 屋外・現場での使用を前提

```typescript
// デザイントークン例
const fieldOptimizedDesign = {
  // 高コントラスト（日光下での視認性）
  contrast: {
    primary: '#000000',
    background: '#FFFFFF',
    border: '#333333',
  },

  // 大きめのタッチターゲット（手袋着用時）
  touchTarget: {
    minimum: '44px',
    recommended: '48px',
    large: '56px',
  },

  // 読みやすいフォントサイズ
  fontSize: {
    minimum: '14px',
    body: '16px',
    heading: '20px',
  },
};
```

### 2.2 シンプルさと効率性

- **3タップルール**: 主要機能には3タップ以内でアクセス
- **明確な視覚的階層**: 重要な情報を目立たせる
- **直感的なナビゲーション**: 学習コスト最小化

### 2.3 エラー防止とリカバリー

- **確認ダイアログ**: 破壊的操作には必須
- **自動保存**: 入力データの損失防止
- **明確なフィードバック**: 操作結果の即座表示

---

## 3. 機能フラグ対応UIアーキテクチャ

### 3.1 動的機能表示システム

#### 基本構造

```typescript
// types/features.ts
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface OrganizationFeatures {
  organizationId: string;
  features: FeatureFlag[];
  plan: 'basic' | 'standard' | 'premium' | 'enterprise';
}
```

#### 機能フラグプロバイダー

```typescript
// contexts/FeatureFlagContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

interface FeatureFlagContextType {
  features: Map<string, boolean>;
  checkFeature: (key: string) => boolean;
  loadFeatures: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

export const FeatureFlagProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<Map<string, boolean>>(new Map());

  const loadFeatures = async () => {
    const response = await fetch('/api/organization/features');
    const data = await response.json();
    const featureMap = new Map(
      data.features.map((f: FeatureFlag) => [f.key, f.enabled])
    );
    setFeatures(featureMap);
  };

  const checkFeature = (key: string): boolean => {
    return features.get(key) ?? false;
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ features, checkFeature, loadFeatures }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlag = (key: string): boolean => {
  const context = useContext(FeatureFlagContext);
  if (!context) throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
  return context.checkFeature(key);
};
```

### 3.2 条件付きレンダリングコンポーネント

#### FeatureGate コンポーネント

```typescript
// components/FeatureGate.tsx
interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showTeaser?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showTeaser = false,
}) => {
  const hasFeature = useFeatureFlag(feature);

  if (hasFeature) {
    return <>{children}</>;
  }

  if (showTeaser) {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none select-none blur-sm">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center p-6 max-w-sm">
            <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-semibold mb-2">プレミアム機能</h3>
            <p className="text-sm text-gray-600 mb-4">
              この機能を利用するにはアップグレードが必要です
            </p>
            <Button variant="primary" size="sm">
              アップグレードする
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return fallback || null;
};
```

### 3.3 動的ナビゲーションシステム

```typescript
// components/Navigation/DynamicNavigation.tsx
interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  feature?: string;
  badge?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  // 基本機能（常に表示）
  { key: 'dashboard', label: 'ダッシュボード', href: '/', icon: Home },
  { key: 'tools', label: '道具管理', href: '/tools', icon: Wrench },
  { key: 'locations', label: '在庫・所在', href: '/locations', icon: MapPin },

  // オプション機能（機能フラグ依存）
  {
    key: 'reports',
    label: 'レポート',
    href: '/reports',
    icon: FileText,
    feature: 'advanced_reports',
    children: [
      { key: 'inventory', label: '在庫レポート', href: '/reports/inventory', icon: Package },
      { key: 'movement', label: '移動履歴', href: '/reports/movement', icon: TrendingUp },
      { key: 'custom', label: 'カスタムレポート', href: '/reports/custom', icon: FileEdit, feature: 'custom_reports' },
    ]
  },
  { key: 'import', label: '一括インポート', href: '/import', icon: Upload, feature: 'bulk_import' },
  { key: 'api', label: 'API連携', href: '/api', icon: Code, feature: 'api_access' },
];

export const DynamicNavigation: React.FC = () => {
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.reduce<NavItem[]>((acc, item) => {
      // 機能フラグチェック
      if (item.feature && !useFeatureFlag(item.feature)) {
        return acc;
      }

      // 子要素の再帰的フィルタリング
      if (item.children) {
        const filteredChildren = filterNavItems(item.children);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      } else {
        acc.push(item);
      }

      return acc;
    }, []);
  };

  const visibleItems = filterNavItems(navigationItems);

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => (
        <NavItem key={item.key} item={item} />
      ))}
    </nav>
  );
};
```

---

## 4. レイアウト構造

### 4.1 基本レイアウト

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.className} antialiased`}>
        <FeatureFlagProvider>
          <OrganizationProvider>
            <AuthProvider>
              <div className="flex h-screen bg-gray-50">
                {/* サイドバー */}
                <Sidebar className="w-64 bg-white border-r" />

                {/* メインコンテンツエリア */}
                <div className="flex-1 flex flex-col">
                  {/* ヘッダー */}
                  <Header className="h-16 bg-white border-b" />

                  {/* 機能制限通知バー（条件付き表示） */}
                  <FeatureLimitNotification />

                  {/* メインコンテンツ */}
                  <main className="flex-1 overflow-auto p-6">
                    {children}
                  </main>
                </div>
              </div>
            </AuthProvider>
          </OrganizationProvider>
        </FeatureFlagProvider>
      </body>
    </html>
  );
}
```

### 4.2 レスポンシブレイアウト

```typescript
// components/Layout/ResponsiveLayout.tsx
export const ResponsiveLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="flex h-screen">
      {/* モバイル用オーバーレイ */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        !isMobile && "translate-x-0"
      )}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} showMenu={isMobile} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
```

---

## 5. コンポーネント設計

### 5.1 コンポーネント階層

```
components/
├── common/               # 汎用コンポーネント
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   └── Modal/
├── feature-gates/       # 機能制御コンポーネント
│   ├── FeatureGate/
│   ├── PlanUpgrade/
│   └── FeatureTeaser/
├── layout/              # レイアウトコンポーネント
│   ├── Header/
│   ├── Sidebar/
│   ├── Footer/
│   └── Navigation/
├── domain/              # ドメイン固有コンポーネント
│   ├── tools/
│   ├── locations/
│   └── reports/
└── composite/           # 複合コンポーネント
    ├── DataTable/
    ├── SearchFilter/
    └── Dashboard/
```

### 5.2 コンポーネント実装例

#### データテーブルコンポーネント（機能フラグ対応）

```typescript
// components/composite/DataTable/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  features?: {
    export?: boolean;
    bulkEdit?: boolean;
    advancedFilter?: boolean;
  };
}

export function DataTable<T>({ data, columns, features = {} }: DataTableProps<T>) {
  const canExport = useFeatureFlag('data_export') && features.export;
  const canBulkEdit = useFeatureFlag('bulk_operations') && features.bulkEdit;
  const canAdvancedFilter = useFeatureFlag('advanced_filters') && features.advancedFilter;

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canAdvancedFilter && <AdvancedFilterButton />}
          {canBulkEdit && <BulkEditButton />}
        </div>

        <div className="flex items-center gap-2">
          {canExport && <ExportButton data={data} />}
          <ColumnToggle columns={columns} />
        </div>
      </div>

      {/* テーブル本体 */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {canBulkEdit && (
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.id}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {canBulkEdit && (
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

## 6. 画面設計

### 6.1 ダッシュボード画面

#### 動的ウィジェット配置

```typescript
// app/(dashboard)/page.tsx
interface WidgetConfig {
  id: string;
  component: React.ComponentType;
  feature?: string;
  size: 'small' | 'medium' | 'large';
  priority: number;
}

const widgetConfigs: WidgetConfig[] = [
  { id: 'inventory-summary', component: InventorySummary, size: 'large', priority: 1 },
  { id: 'location-overview', component: LocationOverview, size: 'medium', priority: 2 },
  { id: 'recent-activities', component: RecentActivities, size: 'medium', priority: 3 },
  { id: 'low-stock-alert', component: LowStockAlert, size: 'small', priority: 4 },

  // オプションウィジェット
  { id: 'cost-analysis', component: CostAnalysis, feature: 'cost_tracking', size: 'medium', priority: 5 },
  { id: 'maintenance-schedule', component: MaintenanceSchedule, feature: 'maintenance', size: 'small', priority: 6 },
  { id: 'rental-status', component: RentalStatus, feature: 'rental_management', size: 'small', priority: 7 },
];

export default function DashboardPage() {
  // 利用可能なウィジェットをフィルタリング
  const availableWidgets = widgetConfigs.filter(widget => {
    if (!widget.feature) return true;
    return useFeatureFlag(widget.feature);
  }).sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <FeatureGate feature="dashboard_customization">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            カスタマイズ
          </Button>
        </FeatureGate>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableWidgets.map(widget => {
          const Widget = widget.component;
          return (
            <div
              key={widget.id}
              className={cn(
                "bg-white rounded-lg shadow-sm border",
                widget.size === 'large' && 'lg:col-span-2',
                widget.size === 'medium' && 'lg:col-span-1'
              )}
            >
              <Widget />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 6.2 道具管理画面

```typescript
// app/tools/page.tsx
export default function ToolsPage() {
  const canBulkImport = useFeatureFlag('bulk_import');
  const canCustomFields = useFeatureFlag('custom_fields');
  const canAdvancedSearch = useFeatureFlag('advanced_search');

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">道具管理</h1>
        <div className="flex items-center gap-2">
          <FeatureGate feature="bulk_import" showTeaser>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              一括インポート
            </Button>
          </FeatureGate>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            新規登録
          </Button>
        </div>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="p-4">
          {canAdvancedSearch ? (
            <AdvancedSearchForm />
          ) : (
            <SimpleSearchForm />
          )}
        </CardContent>
      </Card>

      {/* データテーブル */}
      <DataTable
        data={tools}
        columns={getToolColumns(canCustomFields)}
        features={{
          export: true,
          bulkEdit: true,
          advancedFilter: canAdvancedSearch,
        }}
      />
    </div>
  );
}
```

---

## 7. 管理画面メニューシステム

> 📋 **詳細な権限制御については [ROLE_BASED_ACCESS_CONTROL.md](./ROLE_BASED_ACCESS_CONTROL.md) を参照**
>
> 本セクションではUIの技術的実装を説明します。各役割の具体的な権限と
> アクセス可能な機能については、RBAC仕様書をご確認ください。

### 7.1 アプリケーション分離アーキテクチャ

#### 2つの独立したアプリケーション

Field Tool Managerは、セキュリティと運用効率のために2つの完全に独立したアプリケーションとして構築されます：

1. **顧客向けアプリケーション（app.fieldtool.com）**
   - 対象役割：staff, leader, admin
   - 目的：日常の道具管理業務
   - UI最適化：現場作業、モバイルファースト

2. **SaaS管理画面（admin.fieldtool.com）**
   - 対象役割：super_admin のみ
   - 目的：顧客管理、請求管理、システム監視
   - UI最適化：管理作業、デスクトップファースト

### 7.2 顧客向けアプリケーション（app.fieldtool.com）

#### 役割×デバイス×機能フラグの三層構造

管理画面のメニューは、以下の3つの要素を考慮した動的システムとして設計します：

1. **ユーザーの役割**（staff, leader, admin）
2. **使用デバイス**（スマートフォン、タブレット、PC）
3. **契約機能**（機能フラグによる制御）

#### メニュー配置マトリクス

| デバイス | 現場作業者（staff） | 管理職（leader） | システム管理者（admin） |
|---------|------------------|----------------|---------------------|
| **スマートフォン** | ボトムナビ＋FAB | ボトムナビ＋ドロワー | フルドロワー |
| **タブレット** | 簡易サイドバー | 折りたたみサイドバー | 階層サイドバー |
| **PC** | 固定サイドバー | カスタマイズ可能サイドバー | フル機能サイドバー |

### 7.3 スマートフォン向けメニュー（顧客向けアプリ）

#### 現場作業者用（ボトムナビゲーション＋FAB）

```typescript
// components/Navigation/Mobile/FieldWorkerNav.tsx
export const FieldWorkerMobileNav: React.FC = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const canUseAdvancedFeatures = useFeatureFlag('advanced_tools');

  return (
    <>
      {/* メインのボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-full px-2">
          <NavButton icon={Home} label="ホーム" href="/" compact />
          <NavButton icon={Package} label="道具" href="/tools" compact />

          {/* 中央のQRスキャンボタン（FAB） */}
          <div className="relative">
            <button
              className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
              onClick={() => navigateToQRScanner()}
            >
              <QrCode className="w-7 h-7 text-white" />
            </button>
          </div>

          <NavButton icon={MapPin} label="所在" href="/locations" compact />
          <NavButton
            icon={Menu}
            label="その他"
            onClick={() => setDrawerOpen(true)}
            compact
          />
        </div>
      </nav>

      {/* スワイプ可能なドロワー（追加機能用） */}
      <SwipeableDrawer
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        anchor="bottom"
      >
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <h3 className="font-semibold mb-4">その他の機能</h3>

          {/* 基本機能 */}
          <MenuSection title="基本">
            <DrawerMenuItem icon={FileText} label="移動履歴" href="/history" />
            <DrawerMenuItem icon={User} label="マイページ" href="/profile" />
          </MenuSection>

          {/* 条件付き機能 */}
          {canUseAdvancedFeatures && (
            <MenuSection title="拡張機能">
              <DrawerMenuItem icon={BarChart} label="レポート" href="/reports" />
              <DrawerMenuItem icon={Settings} label="設定" href="/settings" />
            </MenuSection>
          )}
        </div>
      </SwipeableDrawer>
    </>
  );
};

// 管理職用（拡張ボトムナビ）
export const ManagerMobileNav: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <>
      {/* 上部の機能タブ（スワイプ可能） */}
      <div className="sticky top-0 bg-white border-b z-40">
        <ScrollableTabBar>
          <Tab active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
            ダッシュボード
          </Tab>
          <Tab active={activeTab === 'tools'} onClick={() => setActiveTab('tools')}>
            道具管理
          </Tab>
          <FeatureGate feature="reports">
            <Tab active={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>
              レポート
            </Tab>
          </FeatureGate>
          <FeatureGate feature="team_management">
            <Tab active={activeTab === 'team'} onClick={() => setActiveTab('team')}>
              チーム
            </Tab>
          </FeatureGate>
        </ScrollableTabBar>
      </div>

      {/* コンテンツエリア */}
      <main className="flex-1 pb-16">
        {renderTabContent(activeTab)}
      </main>

      {/* ボトムナビ（主要機能へのクイックアクセス） */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 z-50">
        <div className="flex justify-around items-center h-full">
          <NavButton icon={Home} label="ホーム" active={activeTab === 'dashboard'} />
          <NavButton icon={QrCode} label="スキャン" onClick={openQRScanner} />
          <NavButton icon={Bell} label="通知" badge="3" />
          <NavButton icon={Menu} label="メニュー" onClick={openFullMenu} />
        </div>
      </nav>
    </>
  );
};
```

### 7.3 タブレット向けメニュー

#### 折りたたみ式サイドバー（管理職向け）

```typescript
// components/Navigation/Tablet/ManagerSidebar.tsx
export const ManagerTabletSidebar: React.FC = () => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<string[]>(['dashboard', 'tools']);

  return (
    <aside className={cn(
      "transition-all duration-300 bg-white border-r flex flex-col h-full",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* ヘッダー部分（組織名・折りたたみボタン） */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-gray-600" />
            <span className="font-semibold truncate">組織名</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {/* クイックアクセスエリア（ピン留め項目） */}
      <div className="p-3 bg-blue-50 border-b">
        {isCollapsed ? (
          <div className="space-y-2">
            {pinnedItems.map(id => (
              <QuickAccessIcon key={id} itemId={id} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <QuickAccessCard icon={FileText} label="日報" count={5} />
            <QuickAccessCard icon={AlertTriangle} label="警告" count={2} color="red" />
            <QuickAccessCard icon={TrendingUp} label="分析" />
          </div>
        )}
      </div>

      {/* メインメニューエリア */}
      <nav className="flex-1 overflow-y-auto p-3">
        {/* 常に表示される基本メニュー */}
        <MenuGroup title={!isCollapsed ? "基本機能" : ""}>
          <MenuItem
            icon={Home}
            label="ダッシュボード"
            href="/"
            collapsed={isCollapsed}
          />
          <MenuItem
            icon={Package}
            label="道具管理"
            href="/tools"
            collapsed={isCollapsed}
            subItems={[
              { label: "一覧", href: "/tools" },
              { label: "カテゴリ", href: "/tools/categories" },
              { label: "QRスキャン", href: "/tools/scan" },
            ]}
          />
          <MenuItem
            icon={MapPin}
            label="在庫・所在"
            href="/locations"
            collapsed={isCollapsed}
          />
        </MenuGroup>

        {/* 機能フラグで制御される拡張メニュー */}
        <FeatureGate feature="advanced_reports">
          <MenuGroup title={!isCollapsed ? "レポート・分析" : ""}>
            <MenuItem icon={BarChart} label="統計" href="/reports/stats" collapsed={isCollapsed} />
            <MenuItem icon={FileText} label="カスタムレポート" href="/reports/custom" collapsed={isCollapsed} />
          </MenuGroup>
        </FeatureGate>

        <FeatureGate feature="team_management">
          <MenuGroup title={!isCollapsed ? "チーム管理" : ""}>
            <MenuItem icon={Users} label="メンバー" href="/team/members" collapsed={isCollapsed} />
            <MenuItem icon={Calendar} label="シフト" href="/team/schedule" collapsed={isCollapsed} />
          </MenuGroup>
        </FeatureGate>
      </nav>

      {/* フッターエリア（設定・ヘルプ） */}
      <div className="p-3 border-t">
        <MenuItem icon={Settings} label="設定" href="/settings" collapsed={isCollapsed} />
        <MenuItem icon={HelpCircle} label="ヘルプ" href="/help" collapsed={isCollapsed} />
      </div>
    </aside>
  );
};
```

### 7.4 デスクトップ向けメニュー

#### フル機能階層サイドバー（システム管理者向け）

```typescript
// components/Navigation/Desktop/AdminSidebar.tsx
export const AdminDesktopSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customizedOrder, setCustomizedOrder] = useState<string[]>([]);
  const enabledFeatures = useEnabledFeatures();

  return (
    <aside className="w-72 bg-gray-50 border-r flex flex-col h-full">
      {/* 検索バー */}
      <div className="p-4 bg-white border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="メニューを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* カスタマイズ可能なピン留めエリア */}
      <DraggableSection title="ピン留め" className="p-4 bg-white border-b">
        <SortableList
          items={customizedOrder}
          onReorder={setCustomizedOrder}
          renderItem={(id) => <PinnedMenuItem id={id} />}
        />
        <button className="text-sm text-blue-600 hover:underline mt-2">
          + ピン留めを追加
        </button>
      </DraggableSection>

      {/* 階層メニュー */}
      <div className="flex-1 overflow-y-auto">
        <TreeMenu searchQuery={searchQuery}>
          {/* 基本機能（常に表示） */}
          <TreeSection title="基本機能" defaultOpen>
            <TreeNode icon={Home} label="ダッシュボード" href="/">
              <TreeLeaf label="概要" href="/dashboard" />
              <TreeLeaf label="カスタマイズ" href="/dashboard/customize" />
            </TreeNode>

            <TreeNode icon={Package} label="道具管理" href="/tools">
              <TreeLeaf label="道具一覧" href="/tools" />
              <TreeLeaf label="カテゴリ管理" href="/tools/categories" />
              <TreeLeaf label="インポート/エクスポート" href="/tools/import-export" />

              <FeatureGate feature="custom_fields">
                <TreeLeaf label="カスタムフィールド" href="/tools/custom-fields" />
              </FeatureGate>
            </TreeNode>
          </TreeSection>

          {/* システム管理機能 */}
          <FeatureGate feature="system_admin">
            <TreeSection title="システム管理" icon={Shield}>
              <TreeNode icon={Building} label="組織管理">
                <TreeLeaf label="組織一覧" href="/admin/organizations" />
                <TreeLeaf label="新規登録" href="/admin/organizations/new" />
                <TreeLeaf label="契約管理" href="/admin/contracts" />
              </TreeNode>

              <TreeNode icon={ToggleLeft} label="機能フラグ">
                <TreeLeaf label="フラグ一覧" href="/admin/features" />
                <TreeLeaf label="組織別設定" href="/admin/features/by-org" />
                <TreeLeaf label="A/Bテスト" href="/admin/features/ab-test" />
              </TreeNode>

              <TreeNode icon={DollarSign} label="請求管理">
                <TreeLeaf label="請求一覧" href="/admin/billing" />
                <TreeLeaf label="支払い履歴" href="/admin/payments" />
                <TreeLeaf label="請求書テンプレート" href="/admin/invoice-templates" />
              </TreeNode>
            </TreeSection>
          </FeatureGate>

          {/* 分析・レポート */}
          <FeatureGate feature="analytics">
            <TreeSection title="分析・レポート" icon={BarChart}>
              <TreeNode icon={TrendingUp} label="利用分析">
                <TreeLeaf label="ダッシュボード" href="/analytics/dashboard" />
                <TreeLeaf label="カスタムレポート" href="/analytics/custom" />
                <TreeLeaf label="エクスポート" href="/analytics/export" />
              </TreeNode>
            </TreeSection>
          </FeatureGate>
        </TreeMenu>
      </div>

      {/* メニューカスタマイズパネル */}
      <div className="p-4 border-t bg-white">
        <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
          <Settings className="w-4 h-4" />
          メニューをカスタマイズ
        </button>
      </div>
    </aside>
  );
};
```

### 7.4 SaaS管理画面（admin.fieldtool.com）

#### 完全分離された管理インターフェース

```typescript
// SaaS管理画面専用のレイアウト
// apps/admin/components/Layout/AdminLayout.tsx

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isVerified2FA } = useSuperAdminAuth();

  // 2FA未確認の場合は2FA画面へ
  if (!isVerified2FA) {
    return <TwoFactorVerification />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* セキュリティ警告バー */}
      <div className="bg-red-600 text-white px-4 py-2 text-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            SaaS管理モード - 全顧客データへのアクセス権限
          </span>
          <span>IP: {user.currentIp} | セッション残り: {sessionTimeLeft}</span>
        </div>
      </div>

      {/* 管理ナビゲーション */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold">FTM Admin</h1>

              <div className="flex items-center gap-6">
                <NavLink href="/organizations" icon={Building}>
                  顧客管理
                </NavLink>
                <NavLink href="/contracts" icon={FileText}>
                  契約管理
                </NavLink>
                <NavLink href="/invoices" icon={DollarSign}>
                  請求管理
                </NavLink>
                <NavLink href="/system" icon={Server}>
                  システム
                </NavLink>
                <NavLink href="/analytics" icon={BarChart}>
                  分析
                </NavLink>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

// 顧客組織管理画面
export const OrganizationsPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">顧客組織管理</h2>
          <Button onClick={handleNewOrganization}>
            <Plus className="w-4 h-4 mr-2" />
            新規顧客追加
          </Button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="総顧客数"
            value={stats.totalOrganizations}
            trend="+12%"
            icon={Building}
          />
          <StatCard
            title="アクティブ顧客"
            value={stats.activeOrganizations}
            trend="+5%"
            icon={CheckCircle}
          />
          <StatCard
            title="月間収益"
            value={`¥${stats.monthlyRevenue.toLocaleString()}`}
            trend="+8%"
            icon={TrendingUp}
          />
          <StatCard
            title="平均ユーザー数"
            value={stats.avgUsersPerOrg}
            trend="+3%"
            icon={Users}
          />
        </div>

        {/* 顧客一覧テーブル */}
        <DataTable
          columns={[
            { key: 'name', header: '組織名', sortable: true },
            { key: 'plan', header: 'プラン', badge: true },
            { key: 'userCount', header: 'ユーザー数', numeric: true },
            { key: 'toolCount', header: '道具数', numeric: true },
            { key: 'contractStatus', header: '契約状態', status: true },
            { key: 'lastActivity', header: '最終アクティビティ', date: true },
            { key: 'mrr', header: 'MRR', currency: true },
            {
              key: 'actions',
              header: '操作',
              render: (org) => (
                <DropdownMenu>
                  <DropdownMenuItem onClick={() => viewDetails(org.id)}>
                    詳細表示
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editOrganization(org.id)}>
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => viewUsageStats(org.id)}>
                    利用統計
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => suspendOrganization(org.id)}
                    className="text-red-600"
                  >
                    サービス停止
                  </DropdownMenuItem>
                </DropdownMenu>
              )
            },
          ]}
          data={organizations}
          searchable
          filterable
          exportable
        />
      </div>
    </AdminLayout>
  );
};
```

#### SaaS管理画面のセキュリティ要件

```typescript
// セキュリティ設定
export const adminSecurityConfig = {
  // 2FA必須
  requireTwoFactor: true,

  // IP制限
  allowedIPs: process.env.ADMIN_ALLOWED_IPS?.split(',') || [],

  // セッション設定
  session: {
    maxDuration: 2 * 60 * 60 * 1000, // 2時間
    idleTimeout: 10 * 60 * 1000,     // 10分
    requireReauth: true,              // 重要操作時に再認証
  },

  // 監査ログ
  auditLog: {
    enabled: true,
    detailLevel: 'full',
    retention: 365, // 日
  },

  // レート制限
  rateLimit: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15分
  },
};
```

### 7.5 アダプティブメニューコントローラー

```typescript
// components/Navigation/AdaptiveMenuController.tsx
import { useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganizationFeatures } from '@/hooks/useOrganizationFeatures';

export const AdaptiveMenuController: React.FC = () => {
  const { role } = useUserRole();
  const features = useOrganizationFeatures();

  // デバイスタイプの検出
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // タッチデバイスの検出
  const isTouchDevice = 'ontouchstart' in window;

  // 最適なメニューコンポーネントを選択
  const getOptimalMenu = () => {
    // モバイル
    if (isMobile) {
      switch (role) {
        case 'staff':
          return <StaffMobileNav />;
        case 'leader':
          return <LeaderMobileNav />;
        case 'admin':
          return <AdminMobileNav />;
        default:
          return <DefaultMobileNav />;
      }
    }

    // タブレット
    if (isTablet) {
      switch (role) {
        case 'staff':
          return <StaffTabletNav />;
        case 'leader':
          return <LeaderTabletSidebar />;
        case 'admin':
          return <AdminTabletSidebar />;
        default:
          return <DefaultTabletNav />;
      }
    }

    // デスクトップ
    if (isDesktop) {
      switch (role) {
        case 'staff':
          return <StaffDesktopNav />;
        case 'leader':
          return <LeaderDesktopSidebar />;
        case 'admin':
          return <AdminDesktopSidebar />;
        default:
          return <DefaultDesktopNav />;
      }
    }

    return <DefaultNav />;
  };

  return (
    <MenuProvider features={features} role={role} device={{ isMobile, isTablet, isDesktop, isTouchDevice }}>
      {getOptimalMenu()}
    </MenuProvider>
  );
};
```

### 7.6 メニュー設計のベストプラクティス

#### 役割別の優先順位

```typescript
// config/menuPriorities.ts - 顧客向けアプリケーション
export const menuPriorities = {
  staff: {
    primary: ['qr_scan', 'tools', 'locations'],
    secondary: ['history', 'profile'],
    optional: ['reports', 'settings'],
  },
  leader: {
    primary: ['dashboard', 'tools', 'reports'],
    secondary: ['team', 'locations', 'inventory'],
    optional: ['settings', 'help'],
  },
  admin: {
    primary: ['dashboard', 'users', 'organization'],
    secondary: ['tools', 'reports', 'audit'],
    optional: ['settings', 'help'],
  },
};

// config/adminMenuPriorities.ts - SaaS管理画面（完全分離）
export const adminMenuPriorities = {
  super_admin: {
    primary: ['organizations', 'contracts', 'invoices'],
    secondary: ['system', 'analytics', 'monitoring'],
    optional: ['documentation', 'support'],
  },
};
```

#### パフォーマンス最適化

```typescript
// メニューの遅延ローディング
const LazyMenuItem = lazy(() => import('./MenuItem'));

// メニューのメモ化
const MemoizedMenu = memo(Menu, (prev, next) => {
  return prev.features === next.features && prev.role === next.role;
});

// 仮想スクロール（長いメニューリスト用）
const VirtualizedMenuList = ({ items }) => {
  return (
    <VirtualList
      height={600}
      itemCount={items.length}
      itemSize={48}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MenuItem {...items[index]} />
        </div>
      )}
    </VirtualList>
  );
};
```

---

## 8. レスポンシブ対応

### 8.1 ブレークポイント

```css
/* Tailwind CSS デフォルトブレークポイント */
- sm: 640px   /* タブレット縦向き */
- md: 768px   /* タブレット横向き */
- lg: 1024px  /* ノートPC */
- xl: 1280px  /* デスクトップ */
- 2xl: 1536px /* 大型ディスプレイ */
```

### 8.2 モバイルファースト設計

```typescript
// components/ToolCard.tsx
export const ToolCard: React.FC<{ tool: Tool }> = ({ tool }) => {
  return (
    <div className="
      p-4 bg-white rounded-lg border
      /* モバイル（デフォルト） */
      space-y-3

      /* タブレット以上 */
      sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:space-x-4

      /* デスクトップ */
      lg:p-6
    ">
      {/* QRコード・画像 */}
      <div className="flex-shrink-0">
        <QRCode value={tool.id} size={80} className="sm:size-100 lg:size-120" />
      </div>

      {/* 道具情報 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold truncate">{tool.name}</h3>
        <p className="text-sm text-gray-600">ID: {tool.code}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge>{tool.category}</Badge>
          <Badge variant={tool.status === 'normal' ? 'success' : 'warning'}>
            {tool.status}
          </Badge>
        </div>
      </div>

      {/* アクション */}
      <div className="flex gap-2 sm:flex-col lg:flex-row">
        <Button size="sm" variant="outline" className="flex-1 sm:flex-initial">
          編集
        </Button>
        <Button size="sm" variant="outline" className="flex-1 sm:flex-initial">
          QR印刷
        </Button>
      </div>
    </div>
  );
};
```

### 8.3 タッチ操作最適化

```typescript
// components/TouchOptimized.tsx
export const TouchOptimizedButton: React.FC<ButtonProps> = (props) => {
  return (
    <Button
      {...props}
      className={cn(
        // 最小タッチターゲットサイズ確保（44px）
        "min-h-[44px] min-w-[44px]",
        // タッチフィードバック
        "active:scale-95 transition-transform",
        // 十分な余白
        "px-4 py-3",
        props.className
      )}
    />
  );
};

export const SwipeableListItem: React.FC<{ onDelete: () => void }> = ({ children, onDelete }) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      // 左スワイプで削除オプション表示
      setShowActions(true);
    },
    onSwipedRight: () => {
      // 右スワイプでアクション非表示
      setShowActions(false);
    },
  });

  return (
    <div {...handlers} className="relative overflow-hidden">
      {children}
      {/* スワイプアクション */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 bg-red-500 flex items-center px-4 transition-transform",
        showActions ? "translate-x-0" : "translate-x-full"
      )}>
        <Button onClick={onDelete} variant="ghost" className="text-white">
          削除
        </Button>
      </div>
    </div>
  );
};
```

---

## 9. アクセシビリティ

### 9.1 WCAG 2.1 準拠

```typescript
// components/AccessibleForm.tsx
export const AccessibleForm: React.FC = () => {
  return (
    <form aria-labelledby="form-title">
      <h2 id="form-title" className="text-xl font-bold mb-4">
        道具登録フォーム
      </h2>

      <div className="space-y-4">
        {/* ラベルとインプットの関連付け */}
        <div>
          <label htmlFor="tool-name" className="block text-sm font-medium mb-1">
            道具名 <span aria-label="必須" className="text-red-500">*</span>
          </label>
          <input
            id="tool-name"
            type="text"
            required
            aria-required="true"
            aria-describedby="tool-name-error"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span id="tool-name-error" className="text-red-500 text-sm" role="alert">
            {/* エラーメッセージ */}
          </span>
        </div>

        {/* キーボードナビゲーション対応 */}
        <fieldset>
          <legend className="text-sm font-medium mb-2">管理タイプ</legend>
          <div className="space-y-2" role="radiogroup">
            <label className="flex items-center">
              <input type="radio" name="management-type" value="individual" className="mr-2" />
              <span>個品管理</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="management-type" value="quantity" className="mr-2" />
              <span>数量管理</span>
            </label>
          </div>
        </fieldset>

        {/* スキップリンク */}
        <a href="#submit-button" className="sr-only focus:not-sr-only">
          送信ボタンへスキップ
        </a>

        <button
          id="submit-button"
          type="submit"
          className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          登録する
        </button>
      </div>
    </form>
  );
};
```

### 9.2 カラーコントラスト

```typescript
// styles/colors.ts
export const accessibleColors = {
  // WCAG AA 準拠（4.5:1 以上のコントラスト比）
  text: {
    primary: '#1a1a1a',    // 背景白に対して 19.5:1
    secondary: '#4a4a4a',  // 背景白に対して 9.7:1
    disabled: '#9a9a9a',   // 背景白に対して 2.8:1
  },

  // ステータスカラー（色覚異常対応）
  status: {
    success: '#16a34a',  // 緑
    warning: '#d97706',  // オレンジ
    error: '#dc2626',    // 赤
    info: '#2563eb',     // 青
  },

  // パターン併用（色だけに依存しない）
  patterns: {
    success: 'solid',
    warning: 'dashed',
    error: 'dotted',
  },
};
```

---

## 10. パフォーマンス最適化

### 10.1 コード分割と遅延ローディング

```typescript
// app/tools/[id]/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// 重いコンポーネントの遅延ローディング
const QRCodeGenerator = dynamic(() => import('@/components/QRCodeGenerator'), {
  loading: () => <Skeleton className="w-64 h-64" />,
  ssr: false,
});

const ChartComponent = dynamic(() => import('@/components/ChartComponent'), {
  loading: () => <Skeleton className="w-full h-96" />,
});

export default function ToolDetailPage() {
  return (
    <div className="space-y-6">
      {/* 即座に表示される部分 */}
      <ToolBasicInfo />

      {/* 遅延ローディング部分 */}
      <Suspense fallback={<Skeleton />}>
        <QRCodeGenerator />
      </Suspense>

      <FeatureGate feature="analytics">
        <Suspense fallback={<Skeleton />}>
          <ChartComponent />
        </Suspense>
      </FeatureGate>
    </div>
  );
}
```

### 10.2 画像最適化

```typescript
// components/ToolImage.tsx
import Image from 'next/image';

export const ToolImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  return (
    <div className="relative w-full h-48 sm:h-64 lg:h-80">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover rounded-lg"
        placeholder="blur"
        blurDataURL={generateBlurDataURL()}
        priority={false}
      />
    </div>
  );
};
```

### 10.3 仮想スクロール

```typescript
// components/VirtualizedToolList.tsx
import { VariableSizeList } from 'react-window';

export const VirtualizedToolList: React.FC<{ tools: Tool[] }> = ({ tools }) => {
  const getItemSize = (index: number) => {
    // モバイルでは高さを大きく
    return window.innerWidth < 768 ? 120 : 80;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ToolCard tool={tools[index]} />
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={tools.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
};
```

---

## 11. 実装ガイドライン

### 11.1 フォルダ構造

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   └── loading.tsx
├── tools/
│   ├── page.tsx
│   ├── [id]/
│   │   ├── page.tsx
│   │   └── edit/
│   └── new/
├── locations/
├── reports/
└── settings/
    ├── page.tsx
    ├── profile/
    ├── organization/
    └── features/     # 機能フラグ管理
```

### 11.2 命名規則

```typescript
// コンポーネント: PascalCase
export const ToolCard: React.FC = () => {};

// カスタムフック: camelCase、useで始まる
export const useFeatureFlag = () => {};

// 定数: UPPER_SNAKE_CASE
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// 型定義: PascalCase、接頭辞I不要
export interface Tool {
  id: string;
  name: string;
}

// enum: PascalCase
export enum ToolStatus {
  Normal = 'normal',
  Repair = 'repair',
}
```

### 11.3 ベストプラクティス

#### 機能フラグの使用

```typescript
// ✅ Good: 機能フラグを早期にチェック
export default function PageComponent() {
  const hasFeature = useFeatureFlag('advanced_feature');

  if (!hasFeature) {
    return <BasicVersion />;
  }

  return <AdvancedVersion />;
}

// ❌ Bad: 深いネストでのチェック
export default function PageComponent() {
  return (
    <div>
      <div>
        <div>
          {useFeatureFlag('feature') && <Feature />}
        </div>
      </div>
    </div>
  );
}
```

#### エラーハンドリング

```typescript
// ✅ Good: 適切なエラー境界とフォールバック
export default function ToolsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<LoadingSpinner />}>
        <ToolsList />
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### パフォーマンス

```typescript
// ✅ Good: メモ化と最適化
const MemoizedToolCard = memo(ToolCard, (prevProps, nextProps) => {
  return prevProps.tool.id === nextProps.tool.id &&
         prevProps.tool.updatedAt === nextProps.tool.updatedAt;
});

// ✅ Good: useCallbackの適切な使用
const handleClick = useCallback((id: string) => {
  // 処理
}, [dependency]);
```

### 11.4 テスト戦略

```typescript
// __tests__/components/FeatureGate.test.tsx
import { render, screen } from '@testing-library/react';
import { FeatureGate } from '@/components/FeatureGate';

describe('FeatureGate', () => {
  it('機能が有効な場合、子要素を表示する', () => {
    // Mock useFeatureFlag
    jest.mock('@/hooks/useFeatureFlag', () => ({
      useFeatureFlag: () => true,
    }));

    render(
      <FeatureGate feature="test_feature">
        <div>Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('機能が無効な場合、fallbackを表示する', () => {
    jest.mock('@/hooks/useFeatureFlag', () => ({
      useFeatureFlag: () => false,
    }));

    render(
      <FeatureGate feature="test_feature" fallback={<div>Fallback</div>}>
        <div>Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });
});
```

---

## まとめ

本UIデザイン仕様書は、Field Tool Managerの動的でスケーラブルなUI実装の指針となります。特に重要なのは：

1. **機能フラグシステムの初期実装**: 顧客ごとの機能カスタマイズを可能に
2. **現場最適化**: タッチ操作、視認性、エラー耐性を重視
3. **段階的機能開放**: アップグレードへの自然な導線
4. **パフォーマンス**: 遅延ローディング、仮想化による最適化
5. **アクセシビリティ**: WCAG準拠による幅広いユーザー対応

このアーキテクチャにより、初期リリースから将来の機能拡張まで、一貫性のあるユーザー体験を提供できます。
---

## 実装済み機能：初回セットアップウィザード

### 実装日時
2025-01-02

---

## 初回セットアップウィザード（4ステップ）

### 概要

新規組織の管理者が初回ログイン時に表示される、組織情報・運用設定を行うウィザード形式のUI。

**ルート:** `/onboarding`

**アクセス制御:**
- 管理者（admin）のみアクセス可能
- `setup_completed_at` がNULLの組織のみ表示
- セットアップ完了後は自動的にダッシュボード（`/`）にリダイレクト

---

### プログレスバー

**表示位置:** 画面上部

**デザイン:**
```
┌────────────────────────────────────┐
│  1 ━━━ 2 ━━━ 3 ━━━ 4             │
│  組織情報  運用設定  カテゴリー  ユーザー招待
└────────────────────────────────────┘
```

**状態表示:**
- 現在のステップ: 青色（`bg-blue-600`）
- 完了したステップ: 緑色（`bg-green-600`）+ チェックマーク
- 未完了のステップ: グレー（`bg-gray-300`）

**実装:**
```typescript
{[1, 2, 3, 4].map((step) => (
  <div
    className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
      step === currentStep
        ? 'bg-blue-600 text-white'
        : step < currentStep
          ? 'bg-green-600 text-white'
          : 'bg-gray-300 text-gray-600'
    }`}
  >
    {step < currentStep ? '✓' : step}
  </div>
))}
```

---

### ステップ 1: 組織情報

#### 1-1. 基本情報入力

**必須項目:**
- 組織名（`organizationName`）
- 代表者名（`representativeName`）
- 電話番号（`phone`）

**任意項目:**
- 郵便番号（`postalCode`）
- 住所（`address`）

**フィールドデザイン:**
```
┌──────────────────────────────────┐
│ 組織名 *                         │
│ [A建設株式会社_______________]   │
└──────────────────────────────────┘
```

#### 1-2. 郵便番号から住所検索機能 ⭐ NEW

**UI構成:**
```
┌──────────────────────────────────┐
│ 郵便番号                         │
│ [100-0001__________] [住所検索]  │
└──────────────────────────────────┘
```

**動作:**
1. 郵便番号を入力（7桁、ハイフンあり・なし両対応）
2. 「住所検索」ボタンをクリック
3. zipcloud APIにリクエスト
4. 取得した住所を自動入力

**実装詳細:**
```typescript
// 郵便番号の入力制御（数字とハイフンのみ）
onChange={(e) => {
  const value = e.target.value.replace(/[^\d-]/g, '')
  updateFormData({ postalCode: value })
}}

// 住所検索API
const searchAddress = async () => {
  const postalCode = formData.postalCode.replace(/-/g, '')
  const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
  const data = await res.json()
  if (data.results) {
    const address = `${result.address1}${result.address2}${result.address3}`
    updateFormData({ address })
  }
}
```

**エラー処理:**
- 7桁未満の場合: 「7桁の郵便番号を入力してください」
- 住所が見つからない場合: 「住所が見つかりませんでした」
- API接続失敗: 「住所検索に失敗しました」

**ローディング状態:**
- 検索中は「検索中...」と表示
- ボタンを無効化（`disabled={isSearching}`）

#### 1-3. 業種選択（複数選択対応） ⭐ NEW

**UI構成:**
```
┌──────────────────────────────────┐
│ 業種 * （複数選択可）            │
│                                  │
│ 大分類: [土木・基礎 ▼]          │
│                                  │
│ 詳細業種を選択                   │
│ ┌──────────────────────────┐    │
│ │ ☑ 土工事                  │    │
│ │ ☑ 基礎工事                │    │
│ │ ☐ 杭工事                  │    │
│ │ ☑ 鉄筋工事                │    │
│ │ ☐ コンクリート工事        │    │
│ └──────────────────────────┘    │
│                                  │
│ 選択中: 3件                      │
└──────────────────────────────────┘
```

**動作フロー:**
1. 大分類をドロップダウンから選択
2. 中分類がチェックボックスで表示される
3. 複数の業種をチェック可能
4. 選択数がリアルタイムで表示される
5. 大分類を変更すると、中分類の選択はリセットされる

**実装:**
```typescript
// 業種トグル処理
const toggleIndustryCategory = (categoryId: string) => {
  const currentIds = formData.industryCategoryIds || []
  if (currentIds.includes(categoryId)) {
    updateFormData({
      industryCategoryIds: currentIds.filter((id) => id !== categoryId),
    })
  } else {
    updateFormData({
      industryCategoryIds: [...currentIds, categoryId],
    })
  }
}

// チェックボックスUI
<label className="flex cursor-pointer items-center rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50">
  <input
    type="checkbox"
    checked={formData.industryCategoryIds.includes(category.id)}
    onChange={() => toggleIndustryCategory(category.id)}
  />
  <span>{category.name}</span>
</label>
```

**バリデーション:**
- 最低1つの業種選択が必須
- 未選択の場合: 「業種は最低1つ選択してください」

---

### ステップ 2: 運用設定

#### 2-1. 在庫管理設定

**UI構成:**
```
┌──────────────────────────────────┐
│ 在庫管理設定                     │
│                                  │
│ ☑ 低在庫アラートを有効にする     │
│   在庫が最小レベルを下回った場合に通知します
│                                  │
│   デフォルト最小在庫レベル       │
│   [10___] [L (リットル) ▼]      │
│   消耗品の在庫単位を選択してください。
└──────────────────────────────────┘
```

#### 2-2. 在庫単位の選択 ⭐ NEW

**選択可能な単位（13種類）:**

| 表示名 | 値 | 用途 |
|--------|---|------|
| 個 | `個` | 一般的な道具 |
| 本 | `本` | 棒状の物 |
| 枚 | `枚` | 板状の物 |
| セット | `セット` | 組み合わせ |
| 箱 | `箱` | 箱単位 |
| 袋 | `袋` | 袋単位 |
| 缶 | `缶` | 塗料など |
| L（リットル） | `L` | 液体 |
| ml（ミリリットル） | `ml` | 液体（少量） |
| kg（キログラム） | `kg` | 重量 |
| g（グラム） | `g` | 重量（少量） |
| m（メートル） | `m` | 長さ |
| cm（センチメートル） | `cm` | 長さ（短い） |

**実装:**
```typescript
<div className="flex gap-2">
  <input
    type="number"
    min="1"
    value={formData.defaultMinimumStockLevel}
    className="w-32 rounded-md border..."
  />
  <select
    value={formData.defaultStockUnit}
    onChange={(e) => updateFormData({ defaultStockUnit: e.target.value })}
    className="rounded-md border..."
  >
    <option value="個">個</option>
    <option value="本">本</option>
    <option value="L">L（リットル）</option>
    {/* ... */}
  </select>
</div>
```

**注記テキスト:**
> 消耗品の在庫単位を選択してください。道具ごとに個別設定も可能です。

#### 2-3. 承認フロー設定

**UI構成:**
```
┌──────────────────────────────────┐
│ 承認フロー設定                   │
│                                  │
│ ☐ 道具の貸出時に承認を必要とする │
│   リーダーまたは管理者の承認が必要になります
│                                  │
│ ☐ 道具の返却時に承認を必要とする │
│   返却時の状態確認を強制できます │
└──────────────────────────────────┘
```

**情報パネル:**
```
┌──────────────────────────────────┐
│ 💡 これらの設定は後から変更可能です。
│    まずは基本的な設定で開始し、
│    運用しながら最適化することをお勧めします。
└──────────────────────────────────┘
```

---

### ステップ 3: カテゴリー設定

**デフォルトカテゴリー:**
- 電動工具 ⚡
- 測定機器 📏
- 安全装備 🦺
- 塗装用具 🎨
- 手工具 🔧
- 消耗品 📦

**カスタムカテゴリー追加:**
```
┌──────────────────────────────────┐
│ カスタムカテゴリー追加           │
│ [足場用品_______] [追加]         │
└──────────────────────────────────┘
```

---

### ステップ 4: ユーザー招待

**UI構成:**
```
┌──────────────────────────────────┐
│ メンバーを追加                   │
│ [tanaka@example.com] [リーダー▼] [追加]
│                                  │
│ 招待するメンバー (2名)           │
│ ┌──────────────────────────┐    │
│ │ tanaka@example.com        │    │
│ │ 権限: リーダー    [削除]  │    │
│ │                          │    │
│ │ sato@example.com          │    │
│ │ 権限: スタッフ    [削除]  │    │
│ └──────────────────────────┘    │
└──────────────────────────────────┘
```

**権限説明:**
- **スタッフ:** 道具の貸出・返却、在庫確認
- **リーダー:** スタッフ権限 + 承認、レポート閲覧
- **管理者:** 全権限（設定変更、ユーザー管理など）

---

### ボタンレイアウト

**共通パターン:**
```
┌──────────────────────────────────┐
│                                  │
│          [戻る]    [次へ →]      │
└──────────────────────────────────┘
```

**最終ステップ（ステップ4）:**
```
┌──────────────────────────────────┐
│                                  │
│    [戻る]  [セットアップ完了]    │
└──────────────────────────────────┘
```

**ローディング状態:**
- セットアップ中: 「セットアップ中...」
- ボタン無効化（`disabled={isLoading}`）

---

### レスポンシブデザイン

#### モバイル表示（< 768px）

**プログレスバー:**
- ステップ間の線を短く（`w-16`）
- ラベルを小さく（`text-xs`）

**フォーム:**
- 1カラムレイアウト
- 業種チェックボックス: `grid-cols-1`

#### タブレット・PC表示（≥ 768px）

**フォーム:**
- 2カラムレイアウト（業種選択など）
- `grid-cols-2`

---

### エラー表示

**クライアント側バリデーション:**
```javascript
if (!formData.organizationName) {
  alert('必須項目を入力してください')
  return
}
```

**サーバー側エラー:**
```javascript
try {
  const response = await fetch('/api/onboarding/complete', {...})
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.details || 'Setup failed')
  }
} catch (error) {
  alert('セットアップ中にエラーが発生しました')
}
```

**エラーログ:**
- ブラウザコンソールに詳細を出力
- サーバーログに認証エラー、DB エラーを出力

---

### アクセシビリティ

**キーボード操作:**
- Tabキーでフォーカス移動
- Enterキーで送信（フォーム内）

**スクリーンリーダー対応:**
- 必須項目に `*` マークと `required` 属性
- エラーメッセージは `alert` で通知

**色覚異常対応:**
- 青・緑・グレーで状態を区別
- アイコン（✓）も併用

---

### データフロー

```
1. ユーザーが各ステップで情報入力
   ↓
2. formDataにローカル保存（useState）
   ↓
3. Step 4で「セットアップ完了」クリック
   ↓
4. POST /api/onboarding/complete
   ↓
5. organizationsテーブル更新
   - name, representative_name, phone, etc.
   - industry_category_id（最初の業種）
   - setup_completed_at = NOW()
   ↓
6. organization_settingsテーブル作成
   - enable_low_stock_alert, default_minimum_stock_level
   - custom_settings: { default_stock_unit, selected_industries }
   ↓
7. categoriesテーブルに選択カテゴリー挿入
   ↓
8. リダイレクト: router.push('/')
   ↓
9. ダッシュボード表示
```

---

### 関連ファイル

**UIコンポーネント:**
- `app/onboarding/page.tsx` - ページエントリー
- `components/onboarding/OnboardingWizard.tsx` - ウィザード本体
- `components/onboarding/Step1OrganizationInfo.tsx` - ステップ1
- `components/onboarding/Step2OperationSettings.tsx` - ステップ2
- `components/onboarding/Step3CategorySetup.tsx` - ステップ3
- `components/onboarding/Step4UserInvitation.tsx` - ステップ4

**API:**
- `app/api/onboarding/complete/route.ts` - セットアップ完了API
- `app/api/industries/route.ts` - 業種マスタ取得API

**型定義:**
- `types/organization.ts` - OnboardingFormData, IndustryCategory

