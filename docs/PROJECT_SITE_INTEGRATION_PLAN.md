# 工事管理と現場マスタの統合計画書

> **作成日**: 2026-01-19
> **ステータス**: 検証完了・実装待ち
> **目的**: 工事（projects）と現場（sites）のデータ連携を強化し、業務効率を向上させる

---

## 📋 目次

1. [現状分析](#1-現状分析)
2. [問題点と改善方針](#2-問題点と改善方針)
3. [徹底検証結果](#3-徹底検証結果)
4. [実装計画](#4-実装計画)
5. [マイグレーション手順](#5-マイグレーション手順)
6. [テストシナリオ](#6-テストシナリオ)

---

## 1. 現状分析

### 1.1 既存のデータモデル

#### テーブル構造

```sql
-- 取引先マスタ
clients (取引先)
├── id
├── name "株式会社ABC建設"
├── client_type "customer" | "supplier" | "partner" | "both"
└── address

-- 現場マスタ
sites (現場)
├── id
├── name "〇〇ビル建設工事"
├── client_id → clients.id (発注者)
├── address (現場住所)
├── type "customer_site" | "own_warehouse" | "branch" | ...
├── manager_id → users.id
└── qr_code (現場打刻用)

-- 工事管理
projects (工事)
├── id
├── project_code "PRJ-2025-0001"
├── project_name "〇〇ビル新築工事"
├── client_id → clients.id (発注者)
├── contract_amount (契約金額)
├── budget_amount (予算)
├── start_date (着工日)
├── end_date (完工予定日)
├── status "planning" | "in_progress" | "completed" | "cancelled"
└── project_manager_id → users.id
```

#### エンティティ間の関係（現状）

```
clients (取引先)
├─→ sites (現場) ← client_id で紐付け
└─→ projects (工事) ← client_id で紐付け

※ sites と projects は直接紐付いていない
```

### 1.2 データの流れ

1. **取引先登録** → clients テーブル
2. **現場登録** → sites テーブル（client_id で紐付け）
3. **工事登録** → projects テーブル（client_id で紐付け）
4. **見積書作成** → estimates テーブル（project_id, client_id）
5. **請求書発行** → billing_invoices テーブル（project_id, client_id）
6. **発注書発行** → purchase_orders テーブル（project_id, client_id）
7. **道具移動** → tool_movements テーブル（to_site_id, from_site_id）

### 1.3 現在のメニュー配置

```
マスタ管理（リーダー以上）
├── 取引先マスタ（管理者のみ）
├── 現場マスタ（全員）
├── 倉庫位置管理（管理者のみ）
├── 重機カテゴリ管理（管理者のみ）
└── 道具マスタ（マネージャー以上）

帳票管理（リーダー以上 & DXパック）
├── 工事管理 ← projectsテーブル
├── 見積書一覧
├── 請求書一覧
├── 発注書一覧
└── 入出金管理（マネージャー以上）
```

---

## 2. 問題点と改善方針

### 2.1 現状の問題点

#### 問題1: データの重複入力
- 「〇〇ビル建設工事」を現場と工事の両方に登録する必要がある
- 取引先を2回紐付ける（`sites.client_id` と `projects.client_id`）
- 担当者も2回登録（`sites.manager_id` と `projects.project_manager_id`）

#### 問題2: ユーザーの混乱
- 「現場」と「工事」の違いが分かりにくい
- どちらに何を登録すべきか迷う
- 新人の教育コストが高い

#### 問題3: メニュー配置の不統一
- 現場マスタ → マスタ管理
- 工事管理 → 帳票管理
- 実際は関連性が高いのにバラバラに配置

#### 問題4: データ連携の困難
- 工事から現場住所を取得できない
- 現場の道具移動履歴と工事原価を紐付けられない
- 発注書で納品先住所を自動設定できない

### 2.2 統合すべきか？分離すべきか？

#### 検討結果：**分離を維持**

#### 理由

1. **異なるライフサイクル**
   - 現場: 物理的な場所として長期存続（完了後も履歴として残る）
   - 工事: 契約単位で開始・完了がはっきりしている

2. **異なる用途**
   - 現場: 道具管理・出退勤管理（現場DX業務効率化パック）
   - 工事: 会計・原価管理（帳票管理機能）

3. **1現場に複数の工事が存在する可能性**
   - 大型建設現場で複数の工事契約が並行する場合
   - 例: 「新宿〇〇ビル建設現場」に「基礎工事」「躯体工事」「内装工事」

4. **自社拠点（倉庫・支店）は工事ではない**
   - sites は顧客現場以外に自社拠点も含む
   - projects は常に顧客との契約ベース

### 2.3 改善方針

**結論：分離を維持しつつ、関連付けを強化**

- ✅ `projects`テーブルに`site_id`カラムを追加
- ✅ メニュー構造を見直し（工事管理をマスタ管理配下へ）
- ✅ 現場登録時に工事も作成できるオプション追加
- ✅ データ整合性チェックの実装

---

## 3. 徹底検証結果

### 3.1 データモデルの整合性検証

#### ✅ 外部キー制約の安全性

**追加する制約:**
```sql
ALTER TABLE projects
ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
```

**安全性確認:**
- **`ON DELETE SET NULL`** を使用 → 現場が削除されても工事は残る
- **NULL許可** → 既存データへの影響なし
- **既存の外部キー制約と同じパターン** → 他のテーブルでも使用済み

**類似例（既存コード）:**
```sql
-- purchase_orders テーブル（発注書）
project_id UUID REFERENCES projects(id) ON DELETE SET NULL

-- tool_movements テーブル（道具移動）
from_site_id UUID REFERENCES sites(id) ON DELETE SET NULL
to_site_id UUID REFERENCES sites(id) ON DELETE SET NULL
```

#### ✅ 削除時の挙動検証

**ケース1: 現場を削除**
```sql
DELETE FROM sites WHERE id = 'xxx';
-- 結果: projects.site_id → NULL になる（工事は残る）
```

**ケース2: 工事を削除**
```sql
DELETE FROM projects WHERE id = 'xxx';
-- 影響を受けるテーブル:
-- - estimates (見積書): project_id → NULL
-- - billing_invoices (請求書): project_id → NULL
-- - purchase_orders (発注書): project_id → NULL
```

**ケース3: 取引先を削除**
```sql
DELETE FROM clients WHERE id = 'xxx';
-- 影響:
-- - sites.client_id → NULL
-- - projects.client_id → NULL
```

#### ⚠️ 注意点
- 取引先削除時に関連する現場・工事の確認UIを表示する必要あり

---

### 3.2 パッケージ制御との整合性検証

#### パッケージ構成

| パッケージ | 月額 | 含まれる機能 |
|-----------|------|------------|
| 現場資産パック | ¥18,000 | 道具管理、消耗品管理、**現場マスタ** |
| DX業務効率化パック | ¥22,000 | 見積書、請求書、発注書、**工事管理** |
| フル機能統合パック | ¥32,000 | すべての機能 |

#### ケース別の影響分析

##### ケース1: 現場資産パックのみ契約

**利用可能:**
- ✅ 現場マスタの登録・編集・削除
- ✅ 道具移動時に現場を選択
- ✅ 出退勤管理で現場を選択

**利用不可:**
- ❌ 工事管理へのアクセス

**✅ site_id追加の影響：なし**
- projectsテーブル自体にアクセスできないため影響ゼロ

---

##### ケース2: DX業務効率化パックのみ契約

**利用可能:**
- ✅ 工事管理の登録・編集・削除
- ✅ 見積書・請求書・発注書で工事を選択

**利用不可:**
- ❌ 現場マスタへのアクセス

**⚠️ site_id追加の影響：UI設計が必要**

**問題点:**
工事登録画面で「現場」を選択するフィールドが表示されるが、現場マスタにアクセスできない

**解決策:**
```typescript
// 工事登録画面で現場選択フィールドの表示制御
const { hasAssetPackage } = await getOrganizationFeatures()

{hasAssetPackage && (
  <div>
    <label>現場</label>
    <select name="site_id">
      <option value="">選択してください</option>
      {sites.map(site => (
        <option key={site.id} value={site.id}>{site.name}</option>
      ))}
    </select>
  </div>
)}
```

**対応方針:**
- DXパックのみの場合、現場選択フィールドを非表示
- `site_id`はNULLのまま登録可能（必須項目にしない）

---

##### ケース3: フル機能統合パック

**利用可能:**
- ✅ すべての機能

**✅ site_id追加のメリット：最大限活用できる**
- 現場と工事を紐付けて管理できる
- 道具移動と工事原価を連携できる
- 見積書・請求書に現場住所を自動挿入できる

---

### 3.3 権限制御の影響検証

#### Role別のアクセス権限

| Role | 現場マスタ | 工事管理 |
|------|----------|----------|
| staff | ❌ 閲覧のみ | ❌ アクセス不可 |
| leader | ✅ 閲覧のみ | ❌ アクセス不可 |
| manager | ✅ 編集可能 | ✅ 編集可能 |
| admin | ✅ フル権限 | ✅ フル権限 |

#### 工事登録画面の権限制御

**現状の権限:**
```typescript
// 工事管理はリーダー以上 & DXパック必要
if (userRole === 'staff' || !hasDXPackage) {
  redirect('/')
}
```

**site_id追加後:**
```typescript
// 工事登録画面
const { hasAssetPackage, hasDXPackage } = await getOrganizationFeatures()

// 現場リストの取得（現場資産パックがある場合のみ）
const sites = hasAssetPackage
  ? await supabase.from('sites').select('*')
  : []
```

**✅ 問題点：なし**
- 既存の権限制御で対応可能

---

### 3.4 既存機能への影響検証

#### 見積書機能

**現状:**
```typescript
estimates テーブル
├── project_id (FK → projects.id)
└── client_id (FK → clients.id)
```

**site_id追加後の動作:**
```typescript
// 見積書作成時に工事を選択
// → projects.site_id 経由で現場情報にアクセス可能

const { data: estimate } = await supabase
  .from('estimates')
  .select(`
    *,
    projects (
      project_name,
      sites (name, address)  ← 現場情報を取得可能
    )
  `)
```

**✅ メリット:**
- 見積書PDFに現場住所を自動挿入できる
- 工事→現場のリレーションで情報取得が簡単

**⚠️ 注意点:**
```typescript
// projects.site_idがNULLの場合のハンドリング
const siteAddress = estimate.projects?.sites?.address || '住所未設定'
```

#### 請求書機能

**影響：見積書と同じ**

✅ 請求書PDFに現場情報を表示できる

#### 発注書機能

**現状:**
```typescript
purchase_orders テーブル
├── project_id (FK → projects.id)
└── client_id (FK → clients.id)  // 仕入先
```

**site_id追加後:**
```typescript
// 発注書から現場住所を取得
const { data: order } = await supabase
  .from('purchase_orders')
  .select(`
    *,
    projects (
      project_name,
      sites (name, address)  ← 納品先として使用可能
    )
  `)
```

**✅ メリット:**
- 納品先住所を自動設定できる
- 現場への直送に対応しやすい

#### 道具移動機能

**現状:**
```typescript
tool_movements テーブル
├── to_site_id (FK → sites.id)
└── from_site_id (FK → sites.id)
```

**site_id追加後の活用例:**
```typescript
// 工事に紐付く道具移動履歴を取得
const { data: movements } = await supabase
  .from('tool_movements')
  .select(`
    *,
    to_site:sites!to_site_id (
      *,
      projects (project_name, contract_amount)  ← 工事情報を取得
    )
  `)
  .eq('to_site.projects.id', projectId)
```

**✅ メリット:**
- 工事単位で使用道具の原価計算が可能
- 「この工事でどの道具を使ったか」を集計できる

---

### 3.5 エッジケースの検証

#### エッジケース1: 現場削除時

**シナリオ:**
1. 現場「〇〇ビル建設現場」を登録
2. 工事「〇〇ビル新築工事」を登録し、現場に紐付け
3. 工事完了後、現場を削除

**動作:**
```sql
DELETE FROM sites WHERE id = 'xxx';
-- projects.site_id → NULL になる
```

**✅ 対応策:**
- 現場削除時に確認ダイアログを表示
  「この現場には2件の工事が紐付いています。削除しますか？」

---

#### エッジケース2: 取引先が不一致

**シナリオ:**
1. 現場の取引先: 「株式会社A建設」
2. 工事の取引先: 「株式会社B建設」（誤入力）
3. 工事に現場を紐付けようとする

**問題:**
```
sites.client_id = 'A社'
projects.client_id = 'B社'
projects.site_id = sites.id  ← 不整合！
```

**✅ 対応策：バリデーション実装**
```typescript
// 工事登録時のバリデーション
async function validateProjectSiteConsistency(formData) {
  if (!formData.site_id) return true // NULL許可

  const { data: site } = await supabase
    .from('sites')
    .select('client_id')
    .eq('id', formData.site_id)
    .single()

  if (site.client_id !== formData.client_id) {
    throw new Error(
      '選択した現場の発注者と工事の発注者が一致しません。' +
      '現場の発注者を確認してください。'
    )
  }
}
```

---

#### エッジケース3: 1現場に複数工事

**シナリオ:**
- 大型再開発プロジェクト
- 同じ現場で複数の工事契約が並行

**データ構造:**
```
sites (現場)
└── id: 'site-001', name: '新宿〇〇ビル建設現場'

projects (工事)
├── id: 'proj-001', name: '基礎工事', site_id: 'site-001'
├── id: 'proj-002', name: '躯体工事', site_id: 'site-001'
└── id: 'proj-003', name: '内装工事', site_id: 'site-001'
```

**✅ 対応可能**：1現場に複数工事を紐付けられる

---

#### エッジケース4: マイグレーション時の既存データ

**既存データの状態:**
```
projects テーブル: 10件
sites テーブル: 15件

全てのprojects.site_id = NULL（新カラム追加直後）
```

**✅ 自動紐付けSQL:**
```sql
-- 同じclient_idの現場を自動紐付け
UPDATE projects p
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.client_id = p.client_id
  AND s.type = 'customer_site'
  AND s.is_active = true
  ORDER BY s.created_at DESC
  LIMIT 1
)
WHERE p.site_id IS NULL
AND p.client_id IS NOT NULL;
```

**⚠️ 注意点:**
- 複数の現場が存在する場合、最新の現場が選ばれる
- 誤った紐付けの可能性があるため、管理画面で確認必須

---

## 4. 実装計画

### 4.1 実装フェーズ

#### Phase 1: データベース基盤強化（最優先）

**実装内容:**
1. `projects`テーブルに`site_id`カラム追加
2. 既存データの自動紐付け
3. バリデーション関数の実装

**マイグレーションSQL:**
```sql
-- 1. site_idカラム追加
ALTER TABLE projects
ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- 2. インデックス作成
CREATE INDEX idx_projects_site_id ON projects(site_id);

-- 3. コメント追加
COMMENT ON COLUMN projects.site_id IS '紐付く現場（sites.id）';

-- 4. 既存データの自動紐付け
UPDATE projects p
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.client_id = p.client_id
  AND s.type = 'customer_site'
  AND s.is_active = true
  ORDER BY s.created_at DESC
  LIMIT 1
)
WHERE p.site_id IS NULL
AND p.client_id IS NOT NULL;
```

**バリデーション実装:**
```typescript
// lib/validators/project-site-validator.ts
export async function validateProjectSiteConsistency({
  projectId,
  siteId,
  clientId,
}: {
  projectId?: string
  siteId?: string | null
  clientId: string
}) {
  if (!siteId) return { valid: true } // NULLは許可

  const { data: site } = await supabase
    .from('sites')
    .select('client_id, name')
    .eq('id', siteId)
    .single()

  if (!site) {
    return {
      valid: false,
      error: '指定された現場が見つかりません',
    }
  }

  if (site.client_id !== clientId) {
    return {
      valid: false,
      error: `選択した現場「${site.name}」の発注者と工事の発注者が一致しません`,
    }
  }

  return { valid: true }
}
```

---

#### Phase 2: UI/UX改善（中期）

**実装内容:**
1. 工事登録画面に現場選択フィールド追加
2. 現場登録時に工事も作成できるオプション追加
3. メニュー構造の変更
4. 現場削除時の確認ダイアログ

**工事登録画面の修正:**
```typescript
// app/(authenticated)/projects/new/page.tsx

export default async function NewProjectPage() {
  const { organizationId, userRole, supabase } = await requireAuth()
  const { hasAssetPackage, hasDXPackage } = await getOrganizationFeatures(organizationId)

  // 権限チェック
  if (userRole === 'staff' || !hasDXPackage) {
    redirect('/')
  }

  // 現場リストの取得（現場資産パックがある場合のみ）
  const sites = hasAssetPackage
    ? await supabase
        .from('sites')
        .select('id, name, address, client_id')
        .eq('organization_id', organizationId)
        .eq('type', 'customer_site')
        .eq('is_active', true)
        .order('name')
    : []

  return (
    <ProjectForm
      sites={sites || []}
      hasAssetPackage={hasAssetPackage}
    />
  )
}
```

**現場登録画面の修正:**
```typescript
// app/(authenticated)/sites/new/page.tsx

{hasDXPackage && (
  <div className="mt-6 border-t pt-6">
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={createProject}
        onChange={(e) => setCreateProject(e.target.checked)}
      />
      <span className="ml-2">この現場に工事を紐付ける</span>
    </label>

    {createProject && (
      <div className="mt-4 space-y-4 bg-blue-50 p-4 rounded">
        <h3 className="font-semibold">工事情報</h3>
        <input name="project_code" placeholder="工事番号" />
        <input name="project_name" placeholder="工事名" />
        <input name="contract_amount" type="number" placeholder="契約金額" />
        <input name="start_date" type="date" placeholder="着工日" />
      </div>
    )}
  </div>
)}
```

**メニュー構造の変更:**
```typescript
// components/Sidebar.tsx

// Before
帳票管理
├── 工事管理

// After
マスタ管理
├── 取引先マスタ
├── 現場マスタ
└── 工事マスタ ← ここに移動
```

---

#### Phase 3: 高度な連携機能（長期）

**実装内容:**
1. 見積書・請求書PDFに現場住所を自動表示
2. 発注書で納品先住所を自動設定
3. 工事単位の道具原価集計機能
4. 現場詳細ページに紐付いた工事一覧を表示
5. 工事詳細ページに現場情報を表示

**見積書PDF修正:**
```typescript
// lib/pdf/estimate-generator.ts

// 工事情報から現場住所を取得
const { data: estimate } = await supabase
  .from('estimates')
  .select(`
    *,
    projects (
      project_name,
      sites (name, address)
    )
  `)
  .eq('id', estimateId)
  .single()

// PDFに現場情報を追加
pdf.text(`現場名: ${estimate.projects?.sites?.name || '未設定'}`)
pdf.text(`現場住所: ${estimate.projects?.sites?.address || '未設定'}`)
```

**工事原価集計機能:**
```typescript
// app/api/projects/[id]/cost-analysis/route.ts

// 工事に紐付く道具移動履歴を集計
const { data: movements } = await supabase
  .from('tool_movements')
  .select(`
    *,
    tool_items (
      tools (name, purchase_price)
    )
  `)
  .eq('to_site.projects.id', projectId)

// 原価計算
const totalCost = movements.reduce((sum, m) => {
  return sum + (m.tool_items?.tools?.purchase_price || 0)
}, 0)
```

---

### 4.2 実装優先度まとめ

| フェーズ | 実装項目 | 優先度 | 工数 |
|---------|---------|--------|------|
| Phase 1 | データベースにsite_id追加 | 🔴 最高 | 1h |
| Phase 1 | 既存データの自動紐付け | 🔴 最高 | 1h |
| Phase 1 | バリデーション実装 | 🔴 最高 | 2h |
| Phase 2 | 工事登録画面に現場選択追加 | 🟡 中 | 3h |
| Phase 2 | 現場登録時に工事作成オプション | 🟡 中 | 4h |
| Phase 2 | メニュー構造変更 | 🟡 中 | 1h |
| Phase 2 | 現場削除確認ダイアログ | 🟡 中 | 2h |
| Phase 3 | PDF自動入力機能 | 🟢 低 | 6h |
| Phase 3 | 工事原価集計機能 | 🟢 低 | 8h |
| Phase 3 | 現場・工事詳細ページ相互リンク | 🟢 低 | 4h |

**合計工数: 約32時間（4日間）**

---

## 5. マイグレーション手順

### 5.1 事前準備

#### 1. バックアップ取得
```sql
-- 本番環境のprojectsテーブルをバックアップ
CREATE TABLE projects_backup_20260119 AS
SELECT * FROM projects;

-- sitesテーブルもバックアップ
CREATE TABLE sites_backup_20260119 AS
SELECT * FROM sites;
```

#### 2. 影響範囲の確認
```sql
-- 現在のプロジェクト数
SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL;

-- 現在の現場数
SELECT COUNT(*) FROM sites WHERE deleted_at IS NULL;

-- 取引先ごとの現場数（複数ある場合、自動紐付けの精度が下がる）
SELECT
  c.name,
  COUNT(s.id) as site_count
FROM clients c
LEFT JOIN sites s ON s.client_id = c.id AND s.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name
HAVING COUNT(s.id) > 1
ORDER BY site_count DESC;
```

### 5.2 マイグレーション実行

#### Supabase Dashboardで実行するSQL

```sql
-- ===========================
-- Phase 1: カラム追加
-- ===========================

-- 1. site_idカラム追加
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- 2. インデックス作成
CREATE INDEX IF NOT EXISTS idx_projects_site_id ON projects(site_id);

-- 3. コメント追加
COMMENT ON COLUMN projects.site_id IS '紐付く現場（sites.id）';

-- ===========================
-- Phase 2: 既存データの自動紐付け
-- ===========================

-- 同じclient_idの現場を自動紐付け（最新の現場を選択）
UPDATE projects p
SET site_id = (
  SELECT s.id
  FROM sites s
  WHERE s.client_id = p.client_id
    AND s.type = 'customer_site'
    AND s.is_active = true
    AND s.deleted_at IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1
)
WHERE p.site_id IS NULL
  AND p.client_id IS NOT NULL
  AND p.deleted_at IS NULL;

-- ===========================
-- Phase 3: 紐付け結果の確認
-- ===========================

-- 紐付けられた工事の数
SELECT
  '紐付け成功' as status,
  COUNT(*) as count
FROM projects
WHERE site_id IS NOT NULL AND deleted_at IS NULL

UNION ALL

SELECT
  '紐付けなし（client_idがNULL）' as status,
  COUNT(*) as count
FROM projects
WHERE site_id IS NULL AND client_id IS NULL AND deleted_at IS NULL

UNION ALL

SELECT
  '紐付け失敗（現場が見つからない）' as status,
  COUNT(*) as count
FROM projects
WHERE site_id IS NULL AND client_id IS NOT NULL AND deleted_at IS NULL;

-- ===========================
-- Phase 4: 紐付けの詳細確認
-- ===========================

-- 紐付けられた工事と現場の一覧
SELECT
  p.project_name,
  p.project_code,
  s.name as site_name,
  c.name as client_name
FROM projects p
LEFT JOIN sites s ON s.id = p.site_id
LEFT JOIN clients c ON c.id = p.client_id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 20;
```

### 5.3 マイグレーション後の確認

#### 管理画面での確認項目

1. **工事一覧ページ**
   - [ ] 全工事が表示されるか
   - [ ] 現場情報が正しく表示されるか
   - [ ] 検索・フィルターが動作するか

2. **工事詳細ページ**
   - [ ] 現場情報が表示されるか
   - [ ] 現場へのリンクが動作するか

3. **工事登録・編集ページ**
   - [ ] 現場選択フィールドが表示されるか（フル機能パックの場合）
   - [ ] 現場選択フィールドが非表示になるか（DXパックのみの場合）
   - [ ] バリデーションが動作するか

4. **現場詳細ページ**
   - [ ] 紐付いた工事一覧が表示されるか

5. **見積書・請求書PDF**
   - [ ] 現場住所が表示されるか（Phase 3実装後）

### 5.4 ロールバック手順

問題が発生した場合の切り戻し手順：

```sql
-- 1. site_idカラムを削除
ALTER TABLE projects DROP COLUMN IF EXISTS site_id;

-- 2. インデックス削除（カラム削除で自動削除されるが念のため）
DROP INDEX IF EXISTS idx_projects_site_id;

-- 3. バックアップからデータを復元（必要な場合）
-- ※ マイグレーション後に新規データが登録されている場合は慎重に
DELETE FROM projects WHERE deleted_at IS NULL;
INSERT INTO projects SELECT * FROM projects_backup_20260119;
```

---

## 6. テストシナリオ

### 6.1 機能テスト

#### テスト1: 工事登録（フル機能パック）

**前提条件:**
- フル機能統合パック契約中
- 現場「〇〇ビル建設現場」が登録済み
- 取引先「株式会社ABC建設」が登録済み

**テスト手順:**
1. 工事管理 → 新規登録
2. 取引先に「株式会社ABC建設」を選択
3. 現場に「〇〇ビル建設現場」を選択
4. 工事名、契約金額などを入力
5. 登録ボタンをクリック

**期待結果:**
- ✅ 工事が正常に登録される
- ✅ projects.site_id に現場IDが保存される
- ✅ 工事詳細ページで現場情報が表示される

---

#### テスト2: 工事登録（DXパックのみ）

**前提条件:**
- DX業務効率化パックのみ契約
- 取引先「株式会社ABC建設」が登録済み

**テスト手順:**
1. 工事管理 → 新規登録
2. 取引先に「株式会社ABC建設」を選択
3. 工事名、契約金額などを入力
4. 登録ボタンをクリック

**期待結果:**
- ✅ 現場選択フィールドが非表示
- ✅ 工事が正常に登録される（site_id = NULL）
- ✅ エラーが発生しない

---

#### テスト3: バリデーション（取引先不一致）

**前提条件:**
- フル機能統合パック契約中
- 現場「〇〇ビル建設現場」（取引先: A社）が登録済み
- 取引先「B社」が登録済み

**テスト手順:**
1. 工事管理 → 新規登録
2. 取引先に「B社」を選択
3. 現場に「〇〇ビル建設現場」（取引先: A社）を選択
4. 登録ボタンをクリック

**期待結果:**
- ❌ エラーメッセージが表示される
  「選択した現場の発注者と工事の発注者が一致しません」
- ❌ 登録が完了しない

---

#### テスト4: 現場削除

**前提条件:**
- 現場「〇〇ビル建設現場」が登録済み
- この現場に2件の工事が紐付いている

**テスト手順:**
1. 現場マスタ → 詳細ページ
2. 削除ボタンをクリック

**期待結果:**
- ⚠️ 確認ダイアログが表示される
  「この現場には2件の工事が紐付いています。削除しますか？」
- ✅ 削除を実行すると、現場が削除される
- ✅ 紐付いていた工事のsite_idがNULLになる
- ✅ 工事自体は削除されない

---

#### テスト5: 見積書PDF（Phase 3）

**前提条件:**
- 工事「〇〇ビル新築工事」が登録済み
- 現場「〇〇ビル建設現場」に紐付いている
- この工事の見積書が作成済み

**テスト手順:**
1. 見積書一覧 → 詳細ページ
2. PDF出力ボタンをクリック

**期待結果:**
- ✅ PDFに現場名が表示される
- ✅ PDFに現場住所が表示される
- ✅ 現場がNULLの場合「未設定」と表示される

---

### 6.2 パフォーマンステスト

#### テスト6: 大量データでのクエリ性能

**前提条件:**
- projects: 1,000件
- sites: 500件
- 全工事に現場が紐付いている

**テスト手順:**
```sql
-- 工事一覧取得（現場情報込み）
EXPLAIN ANALYZE
SELECT
  p.*,
  s.name as site_name,
  s.address as site_address,
  c.name as client_name
FROM projects p
LEFT JOIN sites s ON s.id = p.site_id
LEFT JOIN clients c ON c.id = p.client_id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 50;
```

**期待結果:**
- ✅ クエリ実行時間が100ms以下
- ✅ インデックスが使用されている
- ✅ フルテーブルスキャンが発生していない

---

### 6.3 セキュリティテスト

#### テスト7: 他組織のデータアクセス

**前提条件:**
- 組織A: projects_A, sites_A
- 組織B: projects_B, sites_B

**テスト手順:**
1. 組織Aのユーザーでログイン
2. 組織Bのsite_idを指定して工事を登録しようとする

**期待結果:**
- ❌ RLSポリシーでブロックされる
- ❌ エラーメッセージが表示される

---

### 6.4 レグレッションテスト

#### テスト8: 既存機能への影響確認

**テスト対象:**
- [ ] 見積書作成・編集・削除
- [ ] 請求書作成・編集・削除
- [ ] 発注書作成・編集・削除
- [ ] 道具移動
- [ ] 出退勤管理
- [ ] レポート・分析機能

**期待結果:**
- ✅ すべての既存機能が正常に動作する
- ✅ エラーが発生しない
- ✅ データの不整合が発生しない

---

## 7. リスク管理

### 7.1 リスク一覧

| リスク | 発生確率 | 影響度 | 対策 |
|--------|---------|--------|------|
| 既存データの誤紐付け | 中 | 高 | 自動紐付け後の確認画面を提供 |
| パフォーマンス低下 | 低 | 中 | インデックス作成、クエリ最適化 |
| パッケージ制御の不具合 | 低 | 高 | テストケースを網羅的に作成 |
| ユーザーの混乱 | 中 | 中 | チュートリアル、ヘルプドキュメント |
| ロールバックの困難 | 低 | 高 | バックアップ必須、手順書整備 |

### 7.2 対応策

#### 既存データの誤紐付け対策
- ✅ マイグレーション後に管理画面で確認できるUIを提供
- ✅ 誤紐付けを手動で修正できる機能を提供
- ✅ バックアップから復元可能にする

#### パフォーマンス低下対策
- ✅ `idx_projects_site_id`インデックスを作成
- ✅ N+1クエリを防ぐためにJOINを使用
- ✅ 本番環境でEXPLAIN ANALYZEを実行

#### パッケージ制御の不具合対策
- ✅ パッケージごとのテストケースを作成
- ✅ E2Eテストで動作確認
- ✅ Staging環境で事前検証

---

## 8. ユーザーへの通知

### 8.1 リリースノート

```markdown
# 工事管理機能のアップデート

**リリース日**: 2026-01-XX

## 新機能

### 工事と現場の紐付け機能
工事に現場を紐付けることで、以下のメリットがあります：

- ✅ 見積書・請求書PDFに現場住所を自動表示（近日公開）
- ✅ 発注書で納品先住所を自動設定（近日公開）
- ✅ 工事単位での道具原価集計が可能に（近日公開）

### 使い方

1. **工事登録時に現場を選択**
   - 工事管理 → 新規登録
   - 「現場」フィールドで現場を選択
   - ※ フル機能統合パック契約の場合のみ表示されます

2. **現場登録時に工事も作成**（近日公開）
   - 現場マスタ → 新規登録
   - 「この現場に工事を紐付ける」にチェック
   - 工事情報を入力して一括登録

## 既存データへの影響

既存の工事データは、自動的に同じ取引先の現場に紐付けられています。
紐付けが正しいか、工事管理画面でご確認ください。

誤った紐付けがある場合は、工事編集画面で修正できます。

## お問い合わせ

ご不明な点がございましたら、サポートまでお問い合わせください。
```

### 8.2 チュートリアル

管理画面に初回ログイン時のチュートリアルを表示：

```
ステップ1: 工事と現場が紐付けられました
既存の工事データは自動的に現場に紐付けられています。

ステップ2: 紐付けを確認してください
工事管理画面で、紐付けが正しいか確認してください。

ステップ3: 今後の工事登録
新しい工事を登録する際は、現場を選択できます。
```

---

## 9. まとめ

### 9.1 実装の妥当性

✅ **実装すべき理由:**
1. データの重複入力を削減
2. ユーザーの混乱を軽減
3. 既存機能へのメリット大（住所自動設定、原価計算連携）
4. パッケージ制御・権限制御との整合性あり
5. エッジケースもすべて対応可能

### 9.2 リスク評価

🟢 **低リスク:**
- データモデルは安全（ON DELETE SET NULL、NULL許可）
- バリデーションで不整合を防止
- ロールバック手順も整備済み

### 9.3 推奨アクション

✅ **Phase 1から実装開始を推奨**

1. データベースに`site_id`追加
2. 既存データの自動紐付け
3. バリデーション実装
4. 本番環境で動作確認

---

## 10. 参考資料

- [データベーススキーマ設計書](./DATABASE_SCHEMA.md)
- [パッケージ制御実装計画書](./PACKAGE_CONTROL_IMPLEMENTATION.md)
- [役割別アクセス制御仕様書](./ROLE_BASED_ACCESS_CONTROL.md)
- [マイグレーション履歴](./MIGRATIONS.md)

---

**最終更新日**: 2026-01-19
**ステータス**: ✅ 検証完了・実装待ち
