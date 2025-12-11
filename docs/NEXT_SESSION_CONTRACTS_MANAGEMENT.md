# 契約管理ページ実装記録

## 📅 実装日
2025-12-09

## 🎯 実装内容

契約管理ページ (`/admin/contracts`) に以下の機能を実装しました：

### 1. テーブル構造の改善
- **「プラン」列を「基本プラン」に名称変更**
- **「機能パック」列を新規追加**
  - 資産管理パック（青色バッジ）
  - DX効率化パック（紫色バッジ）
  - 機能パックなしの場合は「なし」と表示

### 2. 絞り込みフィルター機能

#### 2.1 ワード検索
- リアルタイム検索機能
- 組織名、サブドメインで検索可能
- 入力するたびに即座にフィルタリング

#### 2.2 ステータス別フィルター
- すべて
- 有効（active）
- 保留中（pending）
- 停止中（suspended）
- キャンセル（cancelled）

#### 2.3 基本プラン別フィルター
- すべて
- ベーシック（basic）
- プレミアム（premium）
- エンタープライズ（enterprise）

#### 2.4 資産管理パック別フィルター
- すべて
- あり（has_asset_package = true）
- なし（has_asset_package = false）

#### 2.5 DX効率化パック別フィルター
- すべて
- あり（has_dx_efficiency_package = true）
- なし（has_dx_efficiency_package = false）

#### 2.6 複合検索
- すべてのフィルターを組み合わせて検索可能
- 例：「有効 × ベーシックプラン × 資産管理パックあり」など

### 3. ソート機能
- **新しい順**（デフォルト）：契約日の降順
- **古い順**：契約日の昇順
- **金額の高い順**：月額料金の降順
- **金額の安い順**：月額料金の昇順

### 4. UI/UX改善
- フィルター結果の件数表示：「全X件中Y件を表示」
- 条件に一致する契約がない場合の適切なメッセージ
- レスポンシブデザイン対応（グリッドレイアウト）

---

## 📁 実装ファイル

### 新規作成ファイル

#### 1. `components/admin/ContractsFilter.tsx`
- フィルターUIコンポーネント（Client Component）
- 6つのフィルター要素を提供
- 状態管理と親コンポーネントへのコールバック

**主な機能：**
```typescript
export interface FilterState {
  searchWord: string;        // キーワード検索
  status: string;            // ステータスフィルター
  plan: string;              // 基本プランフィルター
  assetPackage: string;      // 資産管理パックフィルター
  dxPackage: string;         // DX効率化パックフィルター
  sortBy: string;            // ソート条件
}
```

#### 2. `components/admin/ContractsTable.tsx`
- 契約一覧テーブルコンポーネント（Client Component）
- フィルタリングロジックを`useMemo`で最適化
- ソート処理の実装

**主な機能：**
- リアルタイムフィルタリング
- 複合条件での絞り込み
- ソート機能
- 機能パックのバッジ表示

### 更新ファイル

#### 3. `app/admin/contracts/page.tsx`
- Server Componentとして契約データを取得
- `ContractsTable`コンポーネントに初期データを渡す
- 機能パック情報（`has_asset_package`, `has_dx_efficiency_package`）を含むクエリに更新

---

## 🗄️ データベース情報

### 使用テーブル: `contracts`

契約管理で使用する主なカラム：

```sql
-- 既存カラム
id                        UUID PRIMARY KEY
organization_id           UUID (FK → organizations)
plan                      TEXT (basic | premium | enterprise)
status                    TEXT (active | pending | suspended | cancelled)
start_date                DATE
monthly_fee               NUMERIC(10, 2)
has_asset_package         BOOLEAN DEFAULT false
has_dx_efficiency_package BOOLEAN DEFAULT false

-- リレーション
organizations (
  id UUID,
  name TEXT,
  subdomain TEXT
)
```

---

## 🧪 テスト方法

### 1. ページアクセス
```
http://localhost:3000/admin/contracts
```

### 2. テストシナリオ

#### ワード検索のテスト
1. 検索ボックスに組織名を入力
2. リアルタイムでフィルタリングされることを確認
3. サブドメインでも検索できることを確認

#### フィルターのテスト
1. ステータスを「有効」に変更
2. 該当する契約のみ表示されることを確認
3. 基本プランを「ベーシック」に変更
4. 複合条件で絞り込まれることを確認

#### ソートのテスト
1. 「金額の高い順」を選択
2. 月額料金が降順に並ぶことを確認
3. 「古い順」を選択
4. 契約日が昇順に並ぶことを確認

#### 複合検索のテスト
1. ワード検索 + ステータス + プラン + 機能パックを組み合わせる
2. すべての条件を満たす契約のみ表示されることを確認
3. 件数表示が正しく更新されることを確認

---

## 🎨 デザイン仕様

### カラースキーム
- **ブランドカラー**: `#1E6FFF` (ザイロクブルー)
- **ホバー色**: `#0D4FCC`
- **資産管理パックバッジ**: `bg-blue-100 text-blue-800`
- **DX効率化パックバッジ**: `bg-purple-100 text-purple-800`

### ステータスバッジ
- **有効**: `bg-green-100 text-green-800`
- **保留中**: `bg-yellow-100 text-yellow-800`
- **停止中**: `bg-red-100 text-red-800`
- **キャンセル**: `bg-gray-100 text-gray-800`

---

## 🔧 技術スタック

- **Next.js 15**: App Router, Server Components
- **React**: useState, useMemo (最適化)
- **TypeScript**: 型安全なフィルター状態管理
- **Tailwind CSS**: レスポンシブデザイン
- **Supabase**: PostgreSQLクエリ

---

## 📊 パフォーマンス最適化

### 1. useMemoの使用
```typescript
const filteredAndSortedContracts = useMemo(() => {
  // フィルタリングとソート処理
}, [initialContracts, filters]);
```
- フィルター状態が変更されたときのみ再計算
- 不要な再レンダリングを防止

### 2. Server Componentでのデータ取得
- 初期データをサーバー側で取得
- クライアント側での追加のネットワークリクエスト不要

---

## 🚀 今後の拡張案

### 1. エクスポート機能
- CSV/Excelエクスポート
- フィルター結果をエクスポート

### 2. ページネーション
- 契約数が増えた場合のページ分割
- 無限スクロール

### 3. 詳細検索
- 契約日範囲指定
- 金額範囲指定
- 複数組織の一括選択

### 4. バルク操作
- 複数契約の一括ステータス変更
- 一括請求書発行

---

## 📝 メモ

### なぜClient Componentを使用したか
- リアルタイムフィルタリングのため、状態管理が必要
- ユーザーインタラクションに即座に応答する必要がある
- フィルター状態はURLに保存せず、セッション内でのみ保持

### データ構造の分離
- Server Component（page.tsx）: データ取得
- Client Component（ContractsTable.tsx）: フィルタリング・ソート
- この分離により、初期データはサーバーでレンダリングされ、SEOにも対応

---

## ✅ 完了チェックリスト

- [x] 「プラン」列を「基本プラン」に名称変更
- [x] 「機能パック」列を追加
- [x] ワード検索機能（リアルタイム）
- [x] ステータス別フィルター
- [x] 基本プラン別フィルター
- [x] 資産管理パック別フィルター
- [x] DX効率化パック別フィルター
- [x] 複合検索対応
- [x] ソート機能（4種類）
- [x] 件数表示
- [x] レスポンシブデザイン
- [x] 条件なし時のメッセージ表示

---

## 🔗 関連ドキュメント

- [スーパーアドミンログイン実装](./NEXT_SESSION_SUPER_ADMIN_LOGIN.md)
- [データベーススキーマ](./DATABASE_SCHEMA.md)
- [パッケージ制御システム](../docs/PACKAGE_CONTROL_SYSTEM.md)
