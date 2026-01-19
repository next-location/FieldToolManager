# 消耗品発注管理のパッケージ制御実装計画

## 概要

消耗品発注管理機能をフル機能統合パック限定とし、帳票管理（発注書PDF生成）と連携させる実装計画。

**実装日**: 2026-01-19
**ステータス**: 計画中

---

## 📊 現状分析

### 1. 既存の消耗品発注機能

**現在のページ構成:**
- `/app/(authenticated)/consumables/orders/new/page.tsx` - 新規発注作成
- `/app/(authenticated)/consumables/orders/page.tsx` - 発注一覧（推測）
- データベース: `consumable_orders` テーブル

**現在の動作:**
- 発注フォームで消耗品を選択または新規登録
- 数量、単価、合計金額を入力
- 発注日、納期を設定
- 保存すると `status: '下書き中'` でデータベースに保存
- 一覧ページにリダイレクト
- **PDF出力機能なし**（帳票管理との連携が未実装）

### 2. パッケージコントロールシステムの現状

**実装済み（Phase 1-4 完了）:**
- `contracts` テーブルでプラン管理
- `feature_flags` テーブルで機能制御
- `useFeatures()` フックで機能チェック
- `<PackageGate>` コンポーネントでUI制御
- Sidebar.tsx でのメニュー表示制御

**パッケージ構成:**
```
現場資産パック (¥18,000/月):
- asset.tool_management (道具管理)
- asset.consumables (消耗品管理)
- asset.heavy_machinery (重機管理)

現場DX業務効率化パック (¥22,000/月):
- dx.invoices (請求書)
- dx.estimates (見積書)
- dx.orders (発注書)
- dx.contracts (契約書)
- dx.work_reports (作業日報)

フル機能統合パック (¥32,000/月):
- 上記すべて
```

### 3. 帳票管理システムの現状

**関連ファイル:**
- `/docs/INVOICE_MANAGEMENT_SPEC.md` - 帳票仕様書
- `/app/(authenticated)/documents/` - 帳票管理ページ（推測）
- `dx.invoices`, `dx.estimates`, `dx.orders` 機能キーで制御

**帳票の種類:**
- 見積書 (Estimates)
- 請求書 (Invoices)
- 発注書 (Orders) ← **これが消耗品発注と連携すべき**
- 契約書 (Contracts)

---

## 🎯 実装計画

### Phase 1: 機能キーの追加

**新規機能キー定義:**
```
asset.consumable_orders (消耗品発注管理)
```

**パッケージマッピング変更:**
- **現場資産パック**: `asset.consumable_orders` を**除外**
- **現場DXパック**: `asset.consumable_orders` を**除外**
- **フル機能パック**: `asset.consumable_orders` を**含む**

**理由:**
- 消耗品発注はPDF出力が必須
- PDF出力には `dx.orders`（発注書テンプレート）が必要
- `dx.orders` はDXパック以上に含まれるが、消耗品データは資産パックにある
- よって、**両方を持つフル機能パックのみ**で有効化

**実装ファイル:**
- `/docs/PACKAGE_CONTROL_IMPLEMENTATION.md` - 機能キー追加
- データベース `feature_flags` テーブル - 新規レコード追加

### Phase 2: データベーススキーマ確認・修正

**確認事項:**
```sql
-- consumable_orders テーブルに document_id カラムがあるか確認
-- なければ追加が必要
ALTER TABLE consumable_orders
ADD COLUMN document_id UUID REFERENCES documents(id);

-- インデックス追加
CREATE INDEX idx_consumable_orders_document_id
ON consumable_orders(document_id);
```

**目的:**
- 発注書PDF生成時に `documents` テーブルのレコードと紐付ける
- 発注一覧から直接PDF再出力できるようにする

**更新ファイル:**
- `/docs/DATABASE_SCHEMA.md` - スキーマ定義更新
- `/docs/MIGRATIONS.md` - マイグレーションSQL記録

### Phase 3: UI/ルーティング制御

#### 3-1. Sidebar.tsx の修正

**変更箇所:** `/app/(authenticated)/components/Sidebar.tsx`

**追加するメニュー項目:**
```typescript
// 消耗品セクション内に追加
{
  name: '発注管理',
  href: '/consumables/orders',
  icon: ShoppingCart, // または適切なアイコン
  requiresFeature: 'asset.consumable_orders' // フル機能パックのみ表示
}
```

**実装内容:**
- 消耗品管理セクションに「発注管理」メニュー追加
- `requiresFeature: 'asset.consumable_orders'` で機能チェック
- フル機能パック以外のユーザーにはメニュー非表示

#### 3-2. ページレベルでのアクセス制御

**変更箇所:**
- `/app/(authenticated)/consumables/orders/page.tsx` - 発注一覧
- `/app/(authenticated)/consumables/orders/new/page.tsx` - 新規作成
- `/app/(authenticated)/consumables/orders/[id]/page.tsx` - 詳細（新規作成）

**追加するコード（各ページの先頭）:**
```typescript
import { PackageGate } from '@/components/PackageGate'

export default async function ConsumableOrdersPage() {
  return (
    <PackageGate
      requiredFeature="asset.consumable_orders"
      fallbackMessage="消耗品発注管理はフル機能統合パックでご利用いただけます。"
      redirectTo="/consumables"
    >
      {/* 既存のページコンテンツ */}
    </PackageGate>
  )
}
```

**動作:**
- フル機能パック以外のユーザーがアクセス試行
- `PackageGate` がブロック
- メッセージ表示後 `/consumables` にリダイレクト

### Phase 4: 帳票管理との連携実装

#### 4-1. 発注詳細ページの作成

**新規ファイル:** `/app/(authenticated)/consumables/orders/[id]/page.tsx`

**実装内容:**
```typescript
// 発注詳細情報の表示
- 発注ID
- 消耗品名
- 数量、単価、合計金額
- 発注日、納期
- ステータス（下書き中 / 発注済み / 納品済み）

// アクションボタン
- 編集ボタン
- 削除ボタン
- 「発注書を生成」ボタン（document_id が null の場合のみ表示）
- 「発注書を表示」ボタン（document_id がある場合のみ表示）
```

#### 4-2. 発注書生成機能の実装

**新規ファイル:** `/app/(authenticated)/consumables/orders/[id]/actions.ts`

**実装内容:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function generateOrderDocument(orderId: string) {
  const supabase = await createClient()

  // 1. 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未認証')

  // 2. 発注データ取得
  const { data: order } = await supabase
    .from('consumable_orders')
    .select('*, tools(name, model_number, manufacturer, unit)')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('発注が見つかりません')

  // 3. 既にdocument_idがある場合はエラー
  if (order.document_id) {
    throw new Error('この発注の発注書は既に生成されています')
  }

  // 4. documents テーブルにレコード作成
  const { data: document } = await supabase
    .from('documents')
    .insert({
      organization_id: order.organization_id,
      type: 'order', // 発注書
      title: `消耗品発注書 - ${order.tools.name}`,
      status: 'draft',
      metadata: {
        consumable_order_id: orderId,
        consumable_name: order.tools.name,
        quantity: order.quantity,
        unit_price: order.unit_price,
        total_price: order.total_price,
        order_date: order.order_date,
        delivery_date: order.delivery_date,
      }
    })
    .select()
    .single()

  if (!document) throw new Error('発注書の作成に失敗しました')

  // 5. consumable_orders.document_id 更新
  await supabase
    .from('consumable_orders')
    .update({ document_id: document.id })
    .eq('id', orderId)

  // 6. PDF生成処理（既存の帳票システムを使用）
  // TODO: 帳票管理システムのPDF生成機能を呼び出し

  return { success: true, documentId: document.id }
}
```

#### 4-3. 発注書表示機能

**実装内容:**
- 発注詳細ページから「発注書を表示」ボタンクリック
- `/documents/[document_id]` にリダイレクト
- 既存の帳票管理システムでPDF表示

---

## 🚀 実装完了後のユーザーフロー

### フル機能パックユーザーの場合

1. **サイドバーに「発注管理」メニューが表示される**
   - 消耗品 > 発注管理

2. **新規発注作成**
   - `/consumables/orders/new` にアクセス
   - 消耗品を選択（または新規登録）
   - 数量、単価、納期などを入力
   - 「保存」で発注データ作成（status: '下書き中'）

3. **発注一覧で確認**
   - `/consumables/orders` で発注一覧表示
   - ステータス: 下書き中 / 発注済み / 納品済み など

4. **発注書PDF生成**
   - 発注詳細ページ（`/consumables/orders/[id]`）にアクセス
   - 「発注書を生成」ボタンをクリック
   - 帳票管理システムの発注書テンプレートにデータが流し込まれる
   - PDFプレビュー表示
   - ダウンロード・印刷可能

5. **発注書の再利用**
   - 一度生成した発注書は `documents` テーブルに保存
   - 発注一覧から「発注書を表示」で再表示可能
   - 帳票管理ページからも確認可能

### 資産パック / DXパックユーザーの場合

1. **サイドバーに「発注管理」メニューが表示されない**

2. **直接URLアクセスした場合**
   - `/consumables/orders` にアクセス試行
   - `PackageGate` がブロック
   - メッセージ表示: 「消耗品発注管理はフル機能統合パックでご利用いただけます。」
   - `/consumables` にリダイレクト

3. **代替手段**
   - 消耗品の在庫管理のみ利用可能
   - 発注管理が必要な場合はプランアップグレードが必要

---

## 📝 実装に必要な修正ファイル一覧

### 新規作成ファイル
1. ✅ `/docs/CONSUMABLE_ORDER_PACKAGE_CONTROL.md`（このファイル）
2. `/app/(authenticated)/consumables/orders/[id]/page.tsx`（詳細ページ）
3. `/app/(authenticated)/consumables/orders/[id]/actions.ts`（PDF生成）

### 修正ファイル
1. `/app/(authenticated)/components/Sidebar.tsx`
   - 発注管理メニュー追加
   - `requiresFeature: 'asset.consumable_orders'` 設定

2. `/app/(authenticated)/consumables/orders/page.tsx`
   - `<PackageGate>` でラップ

3. `/app/(authenticated)/consumables/orders/new/page.tsx`
   - `<PackageGate>` でラップ

4. `/docs/DATABASE_SCHEMA.md`
   - `consumable_orders.document_id` カラム追加（必要な場合）

5. `/docs/MIGRATIONS.md`
   - ALTER TABLE SQL追加（必要な場合）

6. `/docs/PACKAGE_CONTROL_IMPLEMENTATION.md`
   - `asset.consumable_orders` 機能キー追加

### データベースマイグレーション（必要に応じて）
```sql
-- consumable_orders に document_id を追加
ALTER TABLE consumable_orders
ADD COLUMN document_id UUID REFERENCES documents(id);

-- インデックス追加
CREATE INDEX idx_consumable_orders_document_id
ON consumable_orders(document_id);
```

---

## ⚠️ 注意事項

1. **帳票テンプレートの確認**
   - 発注書テンプレートが `documents` システムに存在するか確認
   - 消耗品データ構造に対応しているか確認
   - 必要に応じてテンプレート作成

2. **既存の発注データ**
   - 既に `consumable_orders` にデータがある場合の扱い
   - 移行スクリプトが必要か確認

3. **権限チェックの多層化**
   - UIレベル: `PackageGate`
   - APIレベル: Server Action内でも機能チェック
   - データベースレベル: RLS Policyで制御

4. **API保護**
   - Server Actionの先頭で機能チェック実装
   ```typescript
   const { hasFeature } = await checkFeatureAccess(user.id, 'asset.consumable_orders')
   if (!hasFeature) throw new Error('この機能はフル機能パックでのみ利用可能です')
   ```

---

## 実装順序

1. **Phase 1**: データベーススキーマ確認・修正
2. **Phase 2**: 機能キー追加（ドキュメント更新）
3. **Phase 3**: Sidebar.tsx メニュー追加
4. **Phase 4**: ページレベルアクセス制御（PackageGate追加）
5. **Phase 5**: 発注詳細ページ作成
6. **Phase 6**: 発注書生成機能実装
7. **Phase 7**: テスト・検証

---

## 実装ステータス

- [x] Phase 1: データベーススキーマ確認・修正（完了 2026-01-19）
- [x] Phase 2: 機能キー追加（完了 2026-01-19）
- [x] Phase 3: Sidebar.tsx メニュー追加（完了 2026-01-19）
- [x] Phase 4: ページレベルアクセス制御（完了 2026-01-19）
- [x] Phase 5: 発注詳細ページ作成（完了 2026-01-19）
- [ ] Phase 6: 発注書生成機能実装（保留 - 帳票管理システムの実装が必要）
- [ ] Phase 7: テスト・検証（次回実施）

### 実装済み機能

1. **データベーススキーマ修正**
   - `consumable_orders` テーブルに `document_id` カラム追加
   - マイグレーションファイル作成: `20250119000001_add_document_id_to_consumable_orders.sql`
   - MIGRATIONS.md 更新完了

2. **機能キー追加**
   - PACKAGE_CONTROL_IMPLEMENTATION.md に `asset.consumable_orders` 追加
   - フル機能統合パック限定として定義

3. **UI実装**
   - Sidebar.tsx: フル機能パックユーザーのみに「消耗品発注管理」メニュー表示
   - PagePackageGate コンポーネント作成
   - 発注一覧ページ、新規作成ページ、詳細ページにアクセス制御追加

4. **ページレベルアクセス制御**
   - `/consumables/orders` - 発注一覧
   - `/consumables/orders/new` - 新規作成
   - `/consumables/orders/[id]` - 詳細
   - 全ページに PagePackageGate ラッパー実装
   - 未契約ユーザーは `/consumables` にリダイレクト

### Phase 6 保留の理由

発注書生成機能（Phase 6）は以下の理由で保留します：

1. **帳票管理システムの実装が必要**
   - `documents` テーブルとの連携
   - 発注書PDFテンプレートの作成
   - 帳票生成エンジンの実装

2. **現時点での優先度**
   - パッケージ制御の基盤（Phase 1-5）が完了
   - フル機能パック限定のアクセス制御が機能中
   - Phase 6 は帳票管理システム全体の設計が必要

### 次のステップ

Phase 6を実装する際は、以下の手順で進めます：

1. 帳票管理システムの設計・実装
2. 発注書テンプレートの作成
3. `/app/(authenticated)/consumables/orders/[id]/actions.ts` に発注書生成機能追加
4. 発注詳細ページに「発注書を生成」ボタン追加
5. 生成済み発注書の表示機能
