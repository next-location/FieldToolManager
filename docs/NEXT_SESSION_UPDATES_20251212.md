# 開発履歴: 2025年12月11日 19時以降の更新

## 実装完了機能

### 1. パッケージ管理システム (2025-12-12)

#### データベース
- **新規テーブル**:
  - `packages`: パッケージマスタ
  - `package_features`: パッケージ機能リスト
  - `contract_packages`: 契約とパッケージの紐付け
- **マイグレーション**: `20251212000010_create_packages_system.sql`

#### 機能
- **パッケージ設定ページ** (`/admin/packages`)
  - パッケージの一覧表示
  - 新規パッケージ作成（モーダル）
  - パッケージ編集（モーダル）
  - パッケージ削除
  - パッケージキーの自動生成 (`package_001`, `package_002`, ...)
  - 機能リストの管理（ヘッダー/通常項目）

- **初期データ**:
  - 現場資産パック: ¥18,000/月
  - 現場DX業務効率化パック: ¥22,000/月
  - フル機能統合パック: ¥32,000/月

#### API
- `GET /api/admin/packages`: パッケージ一覧取得
- `POST /api/admin/packages`: パッケージ作成
- `GET /api/admin/packages/[id]`: パッケージ詳細取得
- `PUT /api/admin/packages/[id]`: パッケージ更新
- `DELETE /api/admin/packages/[id]`: パッケージ削除

#### 契約作成との連携
- 契約作成ページ (`/admin/contracts/new`) でパッケージ動的選択
- 複数パッケージ選択可能（チェックボックス）
- 選択したパッケージは `contract_packages` テーブルに保存

---

### 2. Super Admin 権限管理システム (2025-12-12)

#### データベース
- **カラム追加**: `super_admins.role`
  - `owner`: オーナー（全権限）
  - `sales`: 営業（制限あり）
- **マイグレーション**: `20251212000011_add_super_admin_roles.sql`

#### 権限定義

##### Owner（オーナー）
- 全ての機能にアクセス可能
- パッケージ設定の作成・編集・削除
- 契約の作成・編集・削除・完了
- 管理者アカウントの追加・編集・削除
- 全ての操作が可能

##### Sales（営業）
- **制限事項**:
  - パッケージ設定: 閲覧のみ（作成・編集・削除不可）
  - 契約管理: 閲覧のみ（作成・編集・削除・完了不可）
  - 管理者アカウント管理: アクセス不可（メニュー非表示）
- **アクセス可能**:
  - ダッシュボード: 閲覧可
  - 組織管理: 閲覧・編集可
  - 営業管理: 閲覧・編集可
  - マスタ管理: 閲覧・編集可
  - 操作ログ: 閲覧可
  - 売上分析: 閲覧可

#### 実装内容

##### API権限チェック
- **パッケージAPI**: Owner のみ作成・編集・削除可能
  - `POST /api/admin/packages` → owner 権限必須
  - `PUT /api/admin/packages/[id]` → owner 権限必須
  - `DELETE /api/admin/packages/[id]` → owner 権限必須

- **契約API**: Owner のみ作成・編集・完了可能
  - `POST /api/admin/contracts` → owner 権限必須
  - `POST /api/admin/contracts/[id]/complete` → owner 権限必須

##### UI制御
- **サイドバーメニュー**:
  - 「パッケージ設定」: owner のみ表示
  - 「管理者アカウント」: owner のみ表示

- **パッケージ設定ページ**:
  - 「新規パッケージ作成」ボタン: sales では無効化
  - 各パッケージカード: sales では編集・削除ボタン非表示、「閲覧のみ」メッセージ表示

- **契約管理ページ**:
  - 「新規契約」ボタン: sales では無効化、「閲覧のみ」表示
  - sales ロールには黄色の警告バナーを表示

#### 新規API
- `GET /api/admin/me`: 現在のSuper Adminの情報（ID、名前、メール、role）取得

---

### 3. 管理者アカウント管理機能 (2025-12-12)

#### 機能
- **管理者アカウント管理ページ** (`/admin/admins`)
  - Owner のみアクセス可能
  - Super Admin アカウント一覧表示
  - 新規アカウント追加（モーダル）
  - 権限レベル（owner / sales）選択
  - パスワードは bcrypt でハッシュ化

#### 表示情報
- 名前
- メールアドレス
- 権限レベル（バッジ表示）
  - オーナー: 紫色バッジ
  - 営業: 青色バッジ
- 作成日時

#### API
- `POST /api/admin/super-admins`: 新規Super Admin作成（owner のみ）

---

### 4. 操作ログページ (2025-12-12)

#### 機能
- **操作ログページ** (`/admin/logs`)
  - Super Admin の操作履歴を一覧表示
  - フィルタリング機能:
    - アクション種別
    - 対象タイプ
    - 日付範囲（開始日・終了日）
  - ページネーション（50件/ページ）
  - ログ詳細表示（モーダル）

#### 表示項目
- 日時
- 実行者
- アクション
- 対象
- IPアドレス
- 詳細（JSON形式）

#### API
- `GET /api/admin/logs`: ログ一覧取得（フィルタリング、ページネーション対応）

---

### 5. 売上分析ページ (2025-12-12)

#### 機能
- **売上分析ページ** (`/admin/analytics`)
  - MRR（月次経常収益）表示
  - ARR（年次経常収益）表示
  - YoY成長率（前年同月比）
  - 月次売上推移グラフ（12ヶ月）
  - パッケージ別売上内訳
  - プラン別契約数内訳

#### 表示内容
- 現在年のデータのみ表示
- データがない場合は「まだ契約データがありません」メッセージ

#### API
- `GET /api/admin/analytics/revenue`: 売上データ集計

---

### 6. 営業管理機能強化 (2025-12-11)

#### データベース変更
- `organizations` テーブルに営業管理カラム追加:
  - `sales_status`: 営業ステータス
  - `sales_assigned_to`: 担当営業（FK to super_admins）
  - `sales_priority`: 優先度
  - `sales_next_contact_date`: 次回コンタクト予定日
  - `sales_notes`: 営業メモ
- `sales_activities` テーブル変更:
  - `organization_id` に変更（従来の `sales_lead_id` から）
  - `created_by_name` カラム追加
- `sales_leads` テーブル削除

#### マイグレーション
- `20251211000001_add_sales_columns_to_organizations.sql`
- `20251211000002_modify_sales_activities_for_organizations.sql`
- `20251211000003_drop_sales_leads_table.sql`
- `20251211000004_add_created_by_name_to_sales_activities.sql`
- `20251211000005_add_activity_types_contract_and_after_support.sql`

---

### 7. 組織監査ログ機能 (2025-12-11)

#### データベース
- `organization_history` テーブル追加
- トリガー自動記録（INSERT/UPDATE/DELETE）
- 変更内容を JSONB で保存

#### マイグレーション
- `20251211000006_add_organization_audit_logging.sql`
- `20251211000007_create_set_config_wrapper.sql`

---

### 8. 道具マスタ管理機能 (2025-12-12)

#### データベース
- `system_common_tools`: システム共通道具マスタ
- `system_common_categories`: システム共通カテゴリマスタ
- `tool_manufacturers`: 道具メーカーマスタ

#### マイグレーション
- `20251212000001_add_system_common_tools.sql`
- `20251212000002_add_system_common_categories.sql`
- `20251212000003_create_tool_manufacturers.sql`
- `20251212000004_fix_tool_manufacturers_data.sql`

#### 機能
- **共通道具マスタページ** (`/admin/tools/common`)
- **メーカーマスタページ** (`/admin/manufacturers`)
- **未登録メーカー管理** (`/admin/manufacturers/unregistered`)

---

## ファイル構成

### 新規作成ファイル

#### ページ
- `app/admin/packages/page.tsx`
- `app/admin/admins/page.tsx`
- `app/admin/logs/page.tsx`
- `app/admin/analytics/page.tsx`

#### API
- `app/api/admin/packages/route.ts`
- `app/api/admin/packages/[id]/route.ts`
- `app/api/admin/super-admins/route.ts`
- `app/api/admin/me/route.ts`
- `app/api/admin/logs/route.ts`
- `app/api/admin/analytics/revenue/route.ts`

#### コンポーネント
- `components/admin/PackageCard.tsx`
- `components/admin/PackageModal.tsx`
- `components/admin/SuperAdminList.tsx`
- `components/admin/LogsTable.tsx`
- `components/admin/RevenueAnalytics.tsx`

#### ドキュメント
- `docs/FEATURE_KEY_NAMING.md`

### 修正ファイル

#### ページ
- `app/admin/contracts/page.tsx` (権限制御追加)
- `app/admin/contracts/new/page.tsx` (パッケージ動的選択)

#### コンポーネント
- `components/admin/AdminSidebar.tsx` (権限別メニュー表示)
- `components/admin/NewContractForm.tsx` (パッケージ複数選択)

#### API
- `app/api/admin/contracts/route.ts` (権限チェック、パッケージ保存)
- `app/api/admin/contracts/[id]/complete/route.ts` (権限チェック)

---

## データベーススキーマ更新

### 新規テーブル

#### packages
```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_fee INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  package_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### package_features
```sql
CREATE TABLE package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  feature_key TEXT,
  is_header BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### contract_packages
```sql
CREATE TABLE contract_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, package_id)
);
```

### カラム追加

#### super_admins
- `role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('owner', 'sales'))`

#### organizations（営業管理用）
- `sales_status TEXT`
- `sales_assigned_to UUID REFERENCES super_admins(id)`
- `sales_priority TEXT`
- `sales_next_contact_date DATE`
- `sales_notes TEXT`
- `last_contact_date TIMESTAMPTZ`

---

## 次のセッション用メモ

### 完了した実装
✅ パッケージ管理システム
✅ Super Admin 権限管理（owner/sales）
✅ 管理者アカウント管理
✅ 操作ログページ
✅ 売上分析ページ
✅ 営業管理機能強化
✅ 道具マスタ管理

### 今後の実装課題
- [ ] 契約の編集・削除機能
- [ ] パッケージの並び順変更（ドラッグ&ドロップ）
- [ ] Super Admin のパスワード変更機能
- [ ] Super Admin の2FA（二要素認証）
- [ ] 売上分析の年度比較機能（データ蓄積後）
- [ ] 操作ログの詳細フィルタリング（ユーザー別など）
