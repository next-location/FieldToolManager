# 本番環境ビルドエラー修正記録

## 概要
Next.js 15.1.6の本番環境ビルド時に発生したTypeScriptエラーの修正記録です。
開発環境では問題なく動作していましたが、本番ビルド（`npm run build`）では厳密な型チェックが行われるため、多数のエラーが発生しました。

**修正日**: 2025-12-21
**対象**: Vercel本番環境デプロイ
**関連コミット**:
- `f9c320e` - Fix all TypeScript build errors for production deployment
- `13ace7e` - Fix remaining Supabase array type errors
- `9bf7c28` - Fix final build errors: display_order and supplier_code
- `c5e50b2` - Add production build fixes documentation
- `a879376` - Fix final build errors: project_name and Supplier type

---

## 主な問題と修正内容

### 1. Supabase JOINクエリの配列型問題

**問題**:
Supabaseの`.select()`でJOIN（外部キー参照）を使用すると、関連データが**配列**として返されるが、型定義ではオブジェクトとして定義していた。

**例**:
```typescript
// クエリ
.select('*, tools(id, name, model_number)')

// 実際の返り値
{ tools: [{ id: '...', name: '...', model_number: '...' }] }  // 配列！

// 型定義（間違い）
interface ToolItem {
  tools: { id: string; name: string; model_number: string }  // オブジェクト
}
```

**修正方法**:
型定義を配列に変更し、使用箇所で`[0]`アクセスまたは`Array.isArray()`チェックを追加。

```typescript
// 修正後の型定義
interface ToolItem {
  tools: { id: string; name: string; model_number: string }[]  // 配列
}

// 使用箇所
tool.tools[0]?.name  // 配列アクセス
// または
Array.isArray(item.tools) ? item.tools[0]?.name : item.tools?.name
```

**影響を受けたファイル**:
- `app/(authenticated)/movements/bulk/BulkMovementForm.tsx`
- `app/(authenticated)/movements/new/MovementForm.tsx`
- `app/(authenticated)/movements/MovementTabs.tsx`
- `app/(authenticated)/consumables/bulk-qr/page.tsx`
- `app/(authenticated)/equipment/bulk-qr/page.tsx`
- `app/(authenticated)/analytics/financial/CashflowAnalytics.tsx`
- `app/(authenticated)/analytics/financial/SalesAnalytics.tsx`
- `app/(authenticated)/projects/[id]/ledger/page.tsx`
- `app/(authenticated)/projects/profit-loss/page.tsx`

---

### 2. Optional ChainingとNull Check

**問題**:
`find()`や`filter()`で取得したオブジェクトが`undefined`になる可能性があるが、型チェックが不十分だった。

**例**:
```typescript
const selectedItem = toolItems.find((item) => item.id === toolItemId)
// selectedItemは undefined の可能性がある

// エラー: 'selectedItem' is possibly 'undefined'
{selectedItem.current_location !== 'warehouse' && (...)}
```

**修正方法**:
Optional Chainingまたは明示的なNull Checkを追加。

```typescript
// 修正1: Optional Chaining
{selectedItem?.current_location !== 'warehouse' && (...)}

// 修正2: 明示的チェック
{selectedItem && selectedItem.current_location !== 'warehouse' && (...)}
```

**影響を受けたファイル**:
- `app/(authenticated)/movements/new/MovementForm.tsx`
- `app/(authenticated)/equipment/movement/page.tsx`
- `app/(authenticated)/equipment/new/page.tsx`
- `app/(authenticated)/equipment/[id]/edit/page.tsx`

---

### 3. Interface プロパティの欠落

**問題**:
データベーススキーマに存在するカラムが、TypeScript型定義に含まれていなかった。

**例**:
```typescript
// データベースにはcustom_type, custom_unitカラムが存在
// しかし型定義には含まれていなかった

interface InvoiceItem {
  id: string
  item_name: string
  quantity: number
  // custom_type がない！
  // custom_unit がない！
}
```

**修正方法**:
型定義にオプショナルプロパティとして追加。

```typescript
interface InvoiceItem {
  id: string
  item_name: string
  quantity: number
  custom_type?: string   // 追加
  custom_unit?: string   // 追加
}
```

**影響を受けたファイル**:
- `app/(authenticated)/invoices/new/page.tsx`
- `app/(authenticated)/invoices/[id]/edit/page.tsx`
- `app/(authenticated)/master/equipment-categories/EquipmentCategoriesClient.tsx`

---

### 4. Server Action の戻り値型

**問題**:
`redirect()`を呼ぶServer Actionは`void`を返すが、呼び出し側で戻り値をチェックしていた。

**例**:
```typescript
// actions.ts
export async function createMovement(formData: FormData) {
  // ... 処理 ...
  redirect('/movements')  // void を返す
}

// MovementForm.tsx
const result = await createMovement(formData)
if (result && result.error) {  // エラー: void型は真偽値評価できない
  setError(result.error)
}
```

**修正方法**:
戻り値チェックを削除。エラーは`throw`されるので`catch`で捕捉。

```typescript
// 修正後
await createMovement(formData)
// 成功時は自動的にリダイレクト
// エラー時はthrowされてcatchで捕捉される
```

**影響を受けたファイル**:
- `app/(authenticated)/movements/new/MovementForm.tsx`

---

### 5. 型名の変更（supplier → client）

**問題**:
データベーススキーマとTypeScript型定義で名称が統一されていなかった。

**変更内容**:
- `supplier` → `client` (Purchase Orders関連)
- `supplier_code` → `client_code`
- `display_order` → `sort_order`
- `name` → `project_name` (Projects関連)
- `Supplier`型のimportエラー（型定義ファイルから削除されていた）

**影響を受けたファイル**:
- `app/(authenticated)/purchase-orders/[id]/PurchaseOrderDetailClient.tsx`
- `app/(authenticated)/purchase-orders/PurchaseOrderListClient.tsx`
- `app/(authenticated)/suppliers/SupplierFormModal.tsx`

---

## 修正の全体像

### 修正したファイル一覧

1. **Movements関連** (7ファイル)
   - `app/(authenticated)/movements/bulk/BulkMovementForm.tsx`
   - `app/(authenticated)/movements/bulk/page.tsx`
   - `app/(authenticated)/movements/new/MovementForm.tsx`
   - `app/(authenticated)/movements/new/page.tsx`
   - `app/(authenticated)/movements/MovementTabs.tsx`
   - `app/(authenticated)/movements/page.tsx`

2. **Analytics関連** (5ファイル)
   - `app/(authenticated)/analytics/financial/CashflowAnalytics.tsx`
   - `app/(authenticated)/analytics/financial/SalesAnalytics.tsx`
   - `lib/analytics/cost-analysis.ts`
   - `lib/analytics/usage-analysis.ts`

3. **Invoices関連** (2ファイル)
   - `app/(authenticated)/invoices/new/page.tsx`
   - `app/(authenticated)/invoices/[id]/edit/page.tsx`

4. **Purchase Orders関連** (3ファイル)
   - `app/(authenticated)/purchase-orders/[id]/PurchaseOrderDetailClient.tsx`
   - `app/(authenticated)/purchase-orders/PurchaseOrderListClient.tsx`

5. **Projects関連** (2ファイル)
   - `app/(authenticated)/projects/[id]/ledger/page.tsx`
   - `app/(authenticated)/projects/profit-loss/page.tsx`

6. **Equipment関連** (4ファイル)
   - `app/(authenticated)/equipment/bulk-qr/page.tsx`
   - `app/(authenticated)/equipment/movement/page.tsx`
   - `app/(authenticated)/equipment/new/page.tsx`
   - `app/(authenticated)/equipment/[id]/edit/page.tsx`

7. **Consumables関連** (1ファイル)
   - `app/(authenticated)/consumables/bulk-qr/page.tsx`

8. **Settings/Master関連** (1ファイル)
   - `app/(authenticated)/master/equipment-categories/EquipmentCategoriesClient.tsx`

9. **Dashboard関連** (1ファイル)
   - `app/(authenticated)/dashboard/page.tsx`

10. **Clients関連** (1ファイル)
    - `app/(authenticated)/clients/[id]/page.tsx`
    - `app/(authenticated)/clients/ClientTabs.tsx`

11. **Layout** (1ファイル)
    - `app/(authenticated)/layout.tsx`

12. **その他** (9ファイル)
    - `app/(authenticated)/alerts/page.tsx`
    - `app/(authenticated)/analytics/cashflow/page.tsx`
    - `app/(authenticated)/analytics/reports/page.tsx`
    - `app/(authenticated)/analytics/sales/page.tsx`
    - `app/(authenticated)/invoices/receipt-schedule/page.tsx`
    - `app/(authenticated)/payables/page.tsx`
    - `app/(authenticated)/purchase-orders/payment-schedule/page.tsx`
    - `app/(authenticated)/receivables/page.tsx`
    - `app/(authenticated)/recurring-invoices/page.tsx`

13. **Suppliers関連** (1ファイル)
    - `app/(authenticated)/suppliers/SupplierFormModal.tsx`

**合計: 約42ファイル**

---

## 修正パターンの分類

### パターン1: Supabase配列型への対応

```typescript
// Before
tools: { name: string }

// After
tools: { name: string }[]

// Usage
tool.tools[0]?.name
```

### パターン2: Array.isArray()チェック

```typescript
// 配列かオブジェクトか不明な場合
Array.isArray(item.supplier)
  ? (item.supplier[0] as any)?.name
  : (item.supplier as any)?.name
```

### パターン3: Optional Chaining

```typescript
// Before
{selectedItem.current_location}

// After
{selectedItem?.current_location}
```

### パターン4: Null Check

```typescript
// Before
if (userData.organization_id) { ... }

// After
if (userData?.organization_id) { ... }
```

### パターン5: Type Assertion

```typescript
// 型推論が複雑な場合
const client = Array.isArray(invoice.client)
  ? (invoice.client[0] as any)?.name
  : (invoice.client as any)?.name
```

### パターン6: インターフェースの定義（廃止された型への対応）

```typescript
// Before: 外部からimport（エラー）
import { Supplier } from '@/types/purchase-orders'  // 廃止されている

// After: ローカルで定義
interface Supplier {
  id: string
  name: string
  // ... 必要なプロパティ
}
```

### パターン7: プロパティ名の統一

```typescript
// Before: データベースとの不一致
projects: { id: string; name: string }[]  // nameプロパティが存在しない

// After: データベースのカラム名に合わせる
projects: { id: string; project_name: string }[]  // project_nameを使用
```

---

## 今後の対策

### 1. 型定義の厳格化

Supabaseのクエリ結果に対して、正確な型定義を作成する。

```typescript
// 推奨: Supabaseの返り値型を明示的に定義
type ToolItemWithRelations = {
  id: string
  serial_number: string
  tools: { id: string; name: string; model_number: string }[]  // 配列！
  current_site: { id: string; name: string }[] | null
}
```

### 2. ビルドチェックの自動化

CI/CDパイプラインで本番ビルドを実行し、型エラーを早期発見する。

```yaml
# .github/workflows/build-check.yml
name: Build Check
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run build  # 本番ビルド実行
```

### 3. 型安全性の向上

- `any`型の使用を最小限にする
- 必要に応じて`unknown`や`Type Guards`を使用
- Supabaseクエリに対してGenerated Typesを活用

### 4. ドキュメント化

- 型定義の変更時は必ず`docs/DATABASE_SCHEMA.md`を更新
- APIレスポンスの型定義を別ファイルに分離

---

## 参考情報

### Next.js Build vs Dev の違い

- **開発環境 (`npm run dev`)**:
  - 型チェックが緩い
  - エラーがあっても実行可能

- **本番ビルド (`npm run build`)**:
  - 厳格な型チェック
  - 全ページの静的解析
  - エラーがあるとビルド失敗

### Supabaseの型安全性

```typescript
// Supabase Generated Types を使用（推奨）
import { Database } from '@/types/supabase'

type ToolItem = Database['public']['Tables']['tool_items']['Row']
```

### TypeScript設定

現在の`tsconfig.json`設定:
- `strict: true` - 厳格モード有効
- `noImplicitAny: true` - 暗黙のany禁止
- `strictNullChecks: true` - Null/Undefinedチェック

---

## まとめ

本番環境へのデプロイ時には、開発環境では検出されない型エラーが多数発生しました。主な原因は以下の通りです:

1. **Supabaseの返り値型の誤解**: JOINは配列を返す
2. **Null/Undefined チェックの不足**: Optional Chainingの未使用
3. **型定義とデータベーススキーマの不一致**: カラムの追加・変更時の型更新漏れ

今後は、CI/CDでの本番ビルドチェックと、Supabase Generated Typesの活用により、このような問題を早期に発見できる体制を整えることが重要です。
