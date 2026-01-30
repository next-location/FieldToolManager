# HTMLエスケープ・不審パターン検出 実装計画書

## 📋 ドキュメント情報

- **作成日**: 2026-01-30
- **対象範囲**: `app/(authenticated)` 内の全フォーム
- **目的**: XSS攻撃対策としてHTMLエスケープと不審なパターン検出を全フォームに実装
- **セキュリティライブラリ**: `lib/security/html-escape.ts`

---

## 🚨 エグゼクティブサマリー

### 実装完了状況（2026-01-30更新）

- **監査対象フォーム数**: 94件
- **実装完了**: **52件**（CRITICAL・HIGH・MEDIUM完全対応 + LOW一部）
- **実装済み内訳**:
  - 🔴 CRITICAL: 3/3 (100%) ✅
  - 🟠 HIGH: 18/18 (100%) ✅
  - 🟡 MEDIUM: 17/20+ (85%) ✅
  - 🟢 LOW: 14/50+ (28%)
- **残り**: 簡易フォーム（notesフィールドのみ等）約42件（LOW優先度）

### セキュリティリスク

1. **XSS (Cross-Site Scripting)**: ユーザー入力にHTMLタグやJavaScriptが含まれる可能性
2. **HTMLインジェクション**: メール・PDF生成時に不正なHTMLが挿入される可能性
3. **データ整合性**: 不正な文字列が業務データとして保存される可能性

### 実装完了内容（2026-01-30）

#### ✅ セキュリティ強化実施項目:

1. **HTMLエスケープ**: 全テキストフィールドに`escapeHtml()`関数を適用し、`<`, `>`, `&`, `"`, `'`, `/`を安全な文字に変換
2. **不審パターン検出**: `hasSuspiciousPattern()`で`<script>`, `javascript:`, イベントハンドラ等を検出
3. **Server Action化**: クライアント側の危険なDB直接挿入を5件リファクタリング
   - 消耗品登録（ConsumableRegistrationForm）
   - 入金登録（NewPaymentClient）
   - メンテナンス記録（MaintenanceRecordForm）
   - 個人設定更新（SettingsForm）
   - 重機カテゴリ管理（EquipmentCategoriesClient）

#### ✅ 実装完了フォーム（29件）:

**CRITICAL（3件）:**
- スタッフ一括CSVインポート（大量個人情報）
- 道具マスタCSVインポート（マスタデータ）
- 消耗品登録（Server Action化）

**HIGH（18件）:**
- スタッフ追加・編集
- 取引先登録・編集（26フィールド）
- 仕入先登録・編集（15フィールド）
- 作業報告書作成・編集（動的カスタムフィールド対応）
- 重機登録・編集（11フィールド）
- 見積書・請求書・発注書作成（明細対応）
- 入金登録（Server Action化）
- 道具マスタ・消耗品マスタ・現場マスタ

**MEDIUM（11件）:**
- メンテナンス記録（Server Action化）
- 作業報告書設定（カスタムフィールド配列対応）
- カスタムフィールド管理
- 発注書設定
- 代理打刻
- 勤怠記録編集
- 休暇申請
- 勤務パターン管理
- 組織設定（Server Action化）
- カテゴリマスター管理（道具・消耗品）
- 重機カテゴリ管理（Server Action化）

### 優先度別件数

| 優先度 | 実装済み/総数 | 完了率 | 説明 |
|--------|--------------|--------|------|
| 🔴 CRITICAL | 3/3 | 100% ✅ | 一括インポート、クライアント側直接DB挿入 |
| 🟠 HIGH | 18/18 | 100% ✅ | 個人情報・金融情報を扱うフォーム |
| 🟡 MEDIUM | 17/20+ | 85% ✅ | 設定・管理フォーム |
| 🟢 LOW | 14/50+ | 28% | 備考のみの簡易フォーム |

---

## 📚 既存セキュリティライブラリ

### `lib/security/html-escape.ts`

すでに実装済みのセキュリティ関数:

```typescript
// HTMLエスケープ
export function escapeHtml(text: string | null | undefined): string

// 改行をBRタグに変換（エスケープ後）
export function nl2br(text: string | null | undefined): string

// メールアドレス検証
export function isValidEmail(email: string): boolean

// 電話番号検証
export function isValidPhone(phone: string): boolean

// 不審なパターン検出
export function hasSuspiciousPattern(text: string): boolean
// 検出パターン: <script>, javascript:, onerror=, onclick=, onload=,
//              onmouseover=, <iframe>, <object>, <embed>
```

---

## 🎯 実装パターン

### パターンA: API Route の場合

```typescript
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Step 1: 不審なパターンチェック
  const textFields = [body.name, body.description, body.notes]
  for (const field of textFields) {
    if (field && hasSuspiciousPattern(field)) {
      return NextResponse.json(
        { error: '不正な文字列が検出されました。HTMLタグやスクリプトは使用できません。' },
        { status: 400 }
      )
    }
  }

  // Step 2: HTMLエスケープ
  const sanitizedData = {
    name: escapeHtml(body.name),
    description: escapeHtml(body.description),
    notes: escapeHtml(body.notes),
  }

  // Step 3: データベース挿入
  const { data, error } = await supabase
    .from('table')
    .insert(sanitizedData)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

### パターンB: Server Action の場合

```typescript
'use server'

import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'
import { createClient } from '@/lib/supabase/server'

export async function createItem(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  // Step 1: 不審なパターンチェック
  if (hasSuspiciousPattern(name) || hasSuspiciousPattern(description)) {
    return {
      error: '不正な文字列が検出されました。HTMLタグやスクリプトは使用できません。'
    }
  }

  // Step 2: HTMLエスケープ
  const sanitizedData = {
    name: escapeHtml(name),
    description: escapeHtml(description),
  }

  // Step 3: データベース挿入
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .insert(sanitizedData)

  if (error) {
    return { error: error.message }
  }

  return { data }
}
```

### パターンC: クライアント側バリデーション（オプション）

フロントエンドでも早期検証を行い、ユーザー体験を向上:

```typescript
'use client'

import { hasSuspiciousPattern } from '@/lib/security/html-escape'
import { useState } from 'react'

export function MyForm() {
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string

    // クライアント側チェック
    if (hasSuspiciousPattern(name)) {
      setError('HTMLタグやスクリプトは使用できません')
      return
    }

    // API呼び出し
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ name })
    })

    // ...
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      {/* ... */}
    </form>
  )
}
```

---

## 📊 実装対象フォーム完全リスト

### 🔴 CRITICAL Priority（3件）- 最優先対応

#### 1. スタッフ一括インポート ✅

- **フォーム**: `app/(authenticated)/staff/BulkImportModal.tsx`
- **API**: POST `/api/staff/bulk-import`
- **ファイル**: `app/api/staff/bulk-import/route.ts`
- **入力フィールド**: CSV (name, email, department, employee_id, phone)
- **リスク**: 一度に大量の個人情報が挿入される
- **対応内容**:
  - [x] CSV解析後、各行のすべてのテキストフィールドに `hasSuspiciousPattern()` チェック
  - [x] すべてのテキストフィールドに `escapeHtml()` 適用
  - [x] エラー時は該当行番号を返す

#### 2. 道具マスタCSVインポート ✅

- **フォーム**: `app/(authenticated)/master/tools/import/CSVImportClient.tsx`
- **Server Action**: `importToolsFromCSV`
- **ファイル**: `app/(authenticated)/master/tools/import/actions.ts`
- **入力フィールド**: CSV (name, model_number, manufacturer, description, notes)
- **リスク**: マスタデータへの一括不正データ挿入
- **対応内容**:
  - [x] CSV解析後、各行のすべてのテキストフィールドに `hasSuspiciousPattern()` チェック
  - [x] すべてのテキストフィールドに `escapeHtml()` 適用
  - [x] エラー時は該当行番号を返す

#### 3. 消耗品登録（クライアント側直接DB挿入） ✅

- **フォーム**: `app/(authenticated)/consumables/new/ConsumableRegistrationForm.tsx`
- **現在の実装**: クライアント側で直接Supabase挿入
- **入力フィールド**: name, model_number, manufacturer, description
- **リスク**: クライアント側でセキュリティチェックがバイパスされる可能性
- **対応内容**:
  - [x] **リファクタリング推奨**: Server ActionまたはAPI Routeに変更
  - [x] 暫定対応: クライアント側で `hasSuspiciousPattern()` チェック
  - [x] すべてのテキストフィールドに `escapeHtml()` 適用（クライアント側）
  - [x] 将来: サーバー側でのバリデーション追加

---

### 🟠 HIGH Priority（15件）

#### 4. スタッフ追加 ✅

- **フォーム**: `app/(authenticated)/staff/AddStaffModal.tsx`
- **API**: POST `/api/staff`
- **ファイル**: `app/api/staff/route.ts`
- **入力フィールド**: name, email, password, department, employee_id, phone
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック (name, department)
  - [x] `escapeHtml()` 適用 (name, department, employee_id, phone)
  - [x] email, passwordは既存バリデーションのみ

#### 5. スタッフ編集 ✅

- **フォーム**: `app/(authenticated)/staff/EditStaffModal.tsx`
- **API**: PATCH `/api/staff/[id]`
- **ファイル**: `app/api/staff/[id]/route.ts`
- **入力フィールド**: name, email, department, employee_id, phone
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック (name, department)
  - [x] `escapeHtml()` 適用 (name, department, employee_id, phone)

#### 6. 取引先登録・編集 ✅

- **フォーム**: `app/(authenticated)/clients/ClientForm.tsx`
- **API**: POST `/api/clients`, PATCH `/api/clients/[id]`
- **ファイル**: `app/api/clients/route.ts`
- **入力フィールド（26個）**:
  - name, name_kana, short_name, industry
  - postal_code, address, phone, fax, email, website
  - contact_person, contact_department, contact_phone, contact_email
  - payment_terms, bank_name, bank_branch, bank_account_number, bank_account_holder
  - tax_id, tax_registration_number
  - notes, internal_notes
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック（すべてのテキストフィールド）
  - [x] `escapeHtml()` 適用（すべてのテキストフィールド）
  - [x] email, phone, fax は既存バリデーション維持

#### 7. 仕入先登録・編集 ✅

- **フォーム**: `app/(authenticated)/suppliers/SupplierFormModal.tsx`
- **API**: POST `/api/suppliers`, PATCH `/api/suppliers/[id]`
- **ファイル**: `app/api/suppliers/route.ts`
- **入力フィールド（15個）**:
  - name, name_kana, postal_code, address
  - phone, fax, email, website, contact_person
  - payment_terms, bank_name, branch_name, account_number, account_holder
  - notes
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック（すべてのテキストフィールド）
  - [x] `escapeHtml()` 適用（すべてのテキストフィールド）

#### 8. 作業報告書作成 ✅

- **フォーム**: `app/(authenticated)/work-reports/new/WorkReportForm.tsx`
- **API**: POST `/api/work-reports`
- **ファイル**: `app/api/work-reports/route.ts`
- **入力フィールド**:
  - description (textarea)
  - work_location
  - materials (textarea)
  - tools_text
  - weather
  - notes (textarea)
  - custom_field values（動的、複数のtext/textarea可能）
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック（すべてのテキストフィールド）
  - [x] `escapeHtml()` 適用（すべてのテキストフィールド）
  - [x] カスタムフィールドも動的に処理

#### 9. 作業報告書編集 ✅

- **フォーム**: `app/(authenticated)/work-reports/[id]/edit/WorkReportEditForm.tsx`
- **API**: PATCH `/api/work-reports/[id]`
- **ファイル**: `app/api/work-reports/[id]/route.ts`
- **入力フィールド**: description, work_location, materials, tools_text, notes, custom_fields
- **対応内容**:
  - [x] 作業報告書作成と同様の処理

#### 10. 重機登録 ✅

- **フォーム**: `app/(authenticated)/equipment/new/EquipmentRegistrationForm.tsx`
- **Server Action**: `createEquipment`
- **ファイル**: `app/(authenticated)/equipment/actions.ts`
- **入力フィールド（11個）**:
  - equipment_code, name, manufacturer, model_number, serial_number
  - registration_number, supplier_company, contract_number
  - insurance_company, insurance_policy_number
  - notes
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック（すべてのテキストフィールド）
  - [x] `escapeHtml()` 適用（すべてのテキストフィールド）

#### 11. 重機編集 ✅

- **フォーム**: `app/(authenticated)/equipment/[id]/edit/EquipmentEditForm.tsx`
- **Server Action**: `updateEquipment`
- **ファイル**: `app/(authenticated)/equipment/actions.ts`
- **入力フィールド**: 重機登録と同様
- **対応内容**:
  - [x] 重機登録と同様の処理

#### 12. 見積書作成 ✅

- **フォーム**: `app/(authenticated)/estimates/new/page.tsx`
- **API**: POST `/api/estimates`
- **ファイル**: `app/api/estimates/route.ts`
- **入力フィールド**:
  - title
  - description
  - notes
  - line items (item_name, description for each)
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック（すべてのテキストフィールド）
  - [x] `escapeHtml()` 適用（すべてのテキストフィールド）
  - [x] 明細行の動的フィールドも処理

#### 13. 請求書作成 ✅

- **フォーム**: `app/(authenticated)/invoices/new/page.tsx`
- **API**: POST `/api/invoices/create`
- **ファイル**: `app/api/invoices/create/route.ts`
- **入力フィールド**:
  - title
  - description
  - notes
  - line items (item_name, description for each)
- **対応内容**:
  - [x] 見積書作成と同様の処理

#### 14. 発注書作成 ✅

- **フォーム**: `app/(authenticated)/purchase-orders/new/page.tsx`
- **API**: POST `/api/purchase-orders`
- **ファイル**: `app/api/purchase-orders/route.ts`
- **入力フィールド**:
  - title
  - description
  - notes
  - line items (item_name, description for each)
- **対応内容**:
  - [x] 見積書作成と同様の処理

#### 15. 支払い登録 ✅

- **フォーム**: `app/(authenticated)/payments/new/NewPaymentClient.tsx`
- **Server Action**: `createPayment` (新規作成)
- **ファイル**: `app/(authenticated)/payments/actions.ts`
- **入力フィールド**: reference_number, notes
- **対応内容**:
  - [x] Server Action新規作成（クライアント側DB直接挿入を排除）
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 16. 道具マスタ登録・編集 ✅

- **フォーム**: `app/(authenticated)/master/tools/ToolMasterForm.tsx`
- **Server Action**: `createToolMaster`, `updateToolMaster`
- **ファイル**: `app/(authenticated)/master/tools/actions.ts`
- **入力フィールド**: name, model_number, manufacturer, unit, notes
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 17. 消耗品マスタ登録・編集 ✅

- **フォーム**: `app/(authenticated)/consumables/new/ConsumableRegistrationForm.tsx`
- **Server Action**: `createConsumableMaster` (Task 3で作成)
- **ファイル**: `app/(authenticated)/consumables/new/actions.ts`
- **入力フィールド**: name, model_number, manufacturer, description
- **対応内容**:
  - [x] Server Action化済み（Task 3）
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 18. 現場登録・編集 ✅

- **フォーム**: `app/(authenticated)/sites/new/page.tsx`, `app/(authenticated)/sites/[id]/edit/page.tsx`
- **Server Action**: `createSite`, `updateSite`
- **ファイル**: `app/(authenticated)/sites/actions.ts`
- **入力フィールド**: name, address
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

---

### 🟡 MEDIUM Priority（20件以上）

#### 19. 重機メンテナンス記録 ✅

- **フォーム**: `app/(authenticated)/equipment/[id]/maintenance/MaintenanceRecordForm.tsx`
- **Server Action**: `createMaintenanceRecord` (新規作成)
- **ファイル**: `app/(authenticated)/equipment/maintenance/actions.ts`
- **入力フィールド**: performed_by, notes
- **対応内容**:
  - [x] Server Action新規作成（クライアント側DB直接挿入を排除）
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 20. 作業報告書設定 ✅

- **フォーム**: `app/(authenticated)/work-reports/settings/WorkReportSettingsForm.tsx`
- **API**: PUT `/api/work-reports/settings`
- **ファイル**: `app/api/work-reports/settings/route.ts`
- **入力フィールド**: custom_fields (name, unit, options配列)
- **対応内容**:
  - [x] カスタムフィールド配列の各要素に `hasSuspiciousPattern()` チェック
  - [x] name, unit, options配列に `escapeHtml()` 適用

#### 21. カスタムフィールド管理 ✅

- **フォーム**: `app/(authenticated)/work-reports/settings/CustomFieldsManager.tsx`
- **API**: POST `/api/work-reports/custom-fields`
- **ファイル**: `app/api/work-reports/custom-fields/route.ts`
- **入力フィールド**: field_key, field_label, placeholder, help_text, field_options配列
- **対応内容**:
  - [x] 5つのテキストフィールドに `hasSuspiciousPattern()` チェック
  - [x] field_options配列の各要素もチェック
  - [x] すべてのテキストフィールドに `escapeHtml()` 適用

#### 22. 発注書設定 ✅

- **フォーム**: `app/(authenticated)/purchase-orders/settings/PurchaseOrderSettingsClient.tsx`
- **API**: PUT `/api/purchase-orders/settings`
- **ファイル**: `app/api/purchase-orders/settings/route.ts`
- **入力フィールド**: auto_numbering_prefix
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 23. 代理打刻 ✅

- **フォーム**: `app/(authenticated)/attendance/records/ProxyClockInModal.tsx`
- **API**: POST `/api/attendance/records/proxy`
- **ファイル**: `app/api/attendance/records/proxy/route.ts`
- **入力フィールド**: proxy_reason
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 24. 勤怠記録編集 ✅

- **フォーム**: `app/(authenticated)/attendance/records/EditAttendanceModal.tsx`
- **API**: PATCH `/api/attendance/records/[id]`
- **ファイル**: `app/api/attendance/records/[id]/route.ts`
- **入力フィールド**: edited_reason
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 25. 休暇申請 ✅

- **フォーム**: `app/(authenticated)/attendance/leave/LeaveModal.tsx`
- **API**: POST `/api/leave`
- **ファイル**: `app/api/leave/route.ts`
- **入力フィールド**: reason, notes
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 26. 勤務パターン管理 ✅

- **フォーム**: `app/(authenticated)/attendance/work-patterns/WorkPatternModal.tsx`
- **API**: POST/PATCH `/api/attendance/work-patterns`
- **ファイル**: `app/api/attendance/work-patterns/route.ts`
- **入力フィールド**: name
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 27. 組織設定 ✅

- **フォーム**: `app/(authenticated)/settings/SettingsForm.tsx` → Server Action化
- **API**: PATCH `/api/organization`
- **ファイル**:
  - `app/api/organization/route.ts` (API)
  - `app/(authenticated)/settings/actions.ts` (Server Action - 新規作成)
- **入力フィールド**: postal_code, address, phone, fax, invoice_registration_number, name, department
- **対応内容**:
  - [x] Server Action `updateUserSettings()` 作成
  - [x] API `/api/organization` に `hasSuspiciousPattern()` と `escapeHtml()` 追加
  - [x] 5つのテキストフィールドにセキュリティ対策適用

#### 28. 勤怠設定 ⏭️ SKIPPED

- **フォーム**: `app/(authenticated)/attendance/settings/AttendanceSettingsForm.tsx`
- **API**: PUT `/api/attendance/settings`
- **ファイル**: `app/api/attendance/settings/route.ts`
- **入力フィールド**: boolean, number, time型のみ（テキストフィールドなし）
- **対応内容**: スキップ（XSS対策不要）

#### 29-30. カテゴリマスター管理 ✅

**道具・消耗品カテゴリ (Task 29):**
- **Server Action**: `createOrUpdateCategory`
- **ファイル**: `app/(authenticated)/master/tools-consumables/actions.ts`
- **入力フィールド**: name, description
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

**重機カテゴリ (Task 30):**
- **フォーム**: `app/(authenticated)/master/equipment-categories/EquipmentCategoriesClient.tsx` → Server Action化
- **Server Action**: 新規作成 3関数（create, update, delete）
- **ファイル**: `app/(authenticated)/master/equipment-categories/actions.ts` (新規作成)
- **入力フィールド**: name, code_prefix
- **対応内容**:
  - [x] Server Action `createEquipmentCategory()`, `updateEquipmentCategory()`, `deleteEquipmentCategory()` 作成
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用
  - [x] システムカテゴリ（organization_id = null）の編集・削除を防止

#### 31. データエクスポート ⏭️ SKIPPED

- **フォーム**: `app/(authenticated)/settings/data-export/DataExportClient.tsx`
- **API**: `/api/{type}/export` (各種エクスポートAPI)
- **入力フィールド**: なし（CSVダウンロードボタンのみ）
- **対応内容**: スキップ（テキスト入力フィールドなし）

#### 32-38. その他中優先度フォーム

以下のフォームも同様の処理が必要:

- 道具登録 (ToolRegistrationForm.tsx)
- 消耗品在庫調整 (AdjustmentForm.tsx)
- 消耗品注文 (ConsumableOrderForm.tsx)
- 倉庫ロケーション編集 (EditLocationForm.tsx)
- 組織詳細設定 (OrganizationSettingsForm.tsx)
- 勤怠ターミナル登録 (RegisterTerminalModal.tsx)

---

### 🟢 LOW Priority（残り全て）

以下のフォームは主に`notes`フィールドのみの簡易フォーム:

#### 39-50. 移動記録フォーム群

- **フォーム**:
  - `app/(authenticated)/movements/new/MovementForm.tsx` ✅
  - `app/(authenticated)/movements/bulk/BulkMovementForm.tsx` ⏭️ (システム生成のみ)
  - `app/(authenticated)/equipment/movement/EquipmentMovementForm.tsx` ✅
  - `app/(authenticated)/consumables/qr-movement/ConsumableQRMovementForm.tsx` ✅
  - `app/(authenticated)/consumables/bulk-movement/ConsumableBulkMovementForm.tsx` ✅
- **入力フィールド**: notes (単一フィールド)
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック (4件完了)
  - [x] `escapeHtml()` 適用 (4件完了)

#### 44. 道具セット作成 ✅

- **フォーム**: `app/(authenticated)/tool-sets/new/ToolSetForm.tsx`
- **Server Action**: `app/(authenticated)/tool-sets/actions.ts`
- **入力フィールド**: name, description
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 45. 工事作成・編集 ✅

- **フォーム**: `components/projects/ProjectForm.tsx`
- **API**: POST/PATCH `/api/projects`, PATCH `/api/projects/[id]`
- **ファイル**:
  - `app/api/projects/route.ts` (作成)
  - `app/api/projects/[id]/route.ts` (更新)
- **入力フィールド**: project_name, project_code
- **対応内容**:
  - [x] `hasSuspiciousPattern()` チェック
  - [x] `escapeHtml()` 適用

#### 51+. その他の簡易フォーム

通知設定、QR表示、フィルター設定など、テキスト入力が少ないフォーム（約45件）

---

## 📅 実装スケジュール

### Phase 1: CRITICAL & HIGH（2週間）

**Week 1: CRITICAL (3件)**
- Day 1-2: スタッフ一括インポート
- Day 3-4: 道具マスタCSVインポート
- Day 5: 消耗品登録のリファクタリング

**Week 2: HIGH Part 1 (8件)**
- Day 1: スタッフ追加・編集
- Day 2: 取引先フォーム
- Day 3: 仕入先フォーム
- Day 4-5: 作業報告書（作成・編集）

**Week 3: HIGH Part 2 (7件)**
- Day 1-2: 重機（登録・編集）
- Day 3: 見積書作成
- Day 4: 請求書作成
- Day 5: 発注書作成

### Phase 2: MEDIUM（1週間）

**Week 4: MEDIUM (20件)**
- Day 1: 設定フォーム群
- Day 2: 勤怠管理フォーム群
- Day 3: マスタ管理フォーム群
- Day 4: メンテナンス・カスタムフィールド
- Day 5: バッファ・テスト

### Phase 3: LOW（3日）

**Week 5: LOW (残り全て)**
- Day 1: 移動記録フォーム群
- Day 2: その他簡易フォーム
- Day 3: 最終テスト・ドキュメント更新

---

## ✅ 実装チェックリスト

### CRITICAL Priority

- [x] **1. BulkImportModal.tsx** → `/api/staff/bulk-import` ✅ 完了 (2026-01-30)
- [x] **2. CSVImportClient.tsx** → `master/tools/import/actions.ts` ✅ 完了 (2026-01-30)
- [x] **3. ConsumableRegistrationForm.tsx** → リファクタリング + セキュリティ実装 ✅ 完了 (2026-01-30)

### HIGH Priority

- [x] **4. AddStaffModal.tsx** → `/api/staff` ✅ 完了 (2026-01-30)
- [x] **5. EditStaffModal.tsx** → `/api/staff/[id]` ✅ 完了 (2026-01-30)
- [x] **6. ClientForm.tsx** → `/api/clients` + `/api/clients/[id]` ✅ 完了 (2026-01-30)
- [x] **7. SupplierFormModal.tsx** → `/api/suppliers` ✅ 完了 (2026-01-30)
- [x] **8. WorkReportForm.tsx** → `/api/work-reports` ✅ 完了 (2026-01-30)
- [x] **9. WorkReportEditForm.tsx** → `/api/work-reports/[id]` ✅ 完了 (2026-01-30)
- [x] **10. EquipmentRegistrationForm.tsx** → `equipment/actions.ts` ✅ 完了 (2026-01-30)
- [x] **11. EquipmentEditForm.tsx** → `equipment/actions.ts` ✅ 完了 (2026-01-30)
- [x] **12. EstimateForm** → `/api/estimates` ✅ 完了 (2026-01-30)
- [x] **13. InvoiceForm** → `/api/invoices/create` ✅ 完了 (2026-01-30)
- [x] **14. PurchaseOrderForm** → `/api/purchase-orders` ✅ 完了 (2026-01-30)
- [x] **15. NewPaymentClient.tsx** → `payments/actions.ts` ✅ 完了 (2026-01-30)
- [x] **16. ToolMasterForm.tsx** → `master/tools/actions.ts` ✅ 完了 (2026-01-30)
- [x] **17. ConsumableMasterForm.tsx** → `consumables/new/actions.ts` ✅ 完了 (Task 3で対応済み)
- [x] **18. SiteForm** → `sites/actions.ts` ✅ 完了 (2026-01-30)

### MEDIUM Priority

- [x] **19. MaintenanceRecordForm.tsx** → `equipment/maintenance/actions.ts` ✅ 完了 (2026-01-30)
- [x] **20. WorkReportSettingsForm.tsx** → `/api/work-reports/settings` ✅ 完了 (2026-01-30)
- [x] **21. CustomFieldsManager.tsx** → `/api/work-reports/custom-fields` ✅ 完了 (2026-01-30)
- [x] **22. PurchaseOrderSettingsClient.tsx** → `/api/purchase-orders/settings` ✅ 完了 (2026-01-30)
- [x] **23. ProxyClockInModal.tsx** → `/api/attendance/records/proxy` ✅ 完了 (2026-01-30)
- [x] **24. EditAttendanceModal.tsx** → `/api/attendance/records/[id]` ✅ 完了 (2026-01-30)
- [x] **25. LeaveModal.tsx** → `/api/leave` ✅ 完了 (2026-01-30)
- [x] **26. WorkPatternModal.tsx** → `/api/attendance/work-patterns` ✅ 完了 (2026-01-30)
- [x] **27. SettingsForm.tsx** → `/api/organization` + `settings/actions.ts` ✅ 完了 (2026-01-30)
- [x] **28. AttendanceSettingsForm.tsx** → スキップ（テキストフィールドなし） ⏭️
- [x] **29. CategoryMasterForm.tsx** → `master/tools-consumables/actions.ts` ✅ 完了 (2026-01-30)
- [x] **30. EquipmentCategoriesClient.tsx** → `master/equipment-categories/actions.ts` ✅ 完了 (2026-01-30)
- [x] **31. DataExportClient.tsx** → スキップ（テキストフィールドなし） ⏭️
- [x] **32. ToolRegistrationForm.tsx** → `tools/actions.ts` (createToolWithItems) ✅ 完了 (2026-01-30)
- [x] **33. AdjustmentForm.tsx** → `consumables/[id]/adjust/actions.ts` ✅ 完了 (2026-01-30)
- [x] **34. ConsumableOrderForm.tsx** → `consumables/orders/new/actions.ts` ✅ 完了 (2026-01-30)
- [x] **35. EditLocationForm.tsx** → `warehouse-locations/actions.ts` ✅ 完了 (2026-01-30)
- [x] **36. OrganizationSettingsForm.tsx** → `settings/organization/actions.ts` ✅ 完了 (2026-01-30)
- [x] **37. RegisterTerminalModal.tsx** → `/api/attendance/terminals` ✅ 完了 (2026-01-30)
- [ ] **38. その他MEDIUM** → 各種API/Actions

### LOW Priority

- [x] **39. MovementForm.tsx** → `movements/actions.ts` ✅ 完了 (2026-01-30)
- [x] **40. BulkMovementForm.tsx** → スキップ（システム生成テキストのみ） ⏭️
- [x] **41. EquipmentMovementForm.tsx** → `equipment/movement/actions.ts` ✅ 完了 (2026-01-30)
- [x] **42. ConsumableQRMovementForm.tsx** → `consumables/qr-movement/ConsumableQRMovementForm.tsx` ✅ 完了 (2026-01-30)
- [x] **43. ConsumableBulkMovementForm.tsx** → `consumables/bulk-movement/ConsumableBulkMovementForm.tsx` ✅ 完了 (2026-01-30)
- [x] **44. ToolSetForm.tsx** → `tool-sets/actions.ts` ✅ 完了 (2026-01-30)
- [x] **45. ProjectForm.tsx** → `/api/projects` + `/api/projects/[id]` ✅ 完了 (2026-01-30)
- [x] **46. AddToolItemButton.tsx** → クライアント側DB挿入 (notes) ✅ 完了 (2026-01-30)
- [x] **47. StatusChangeButton.tsx** → `tool-items/actions.ts` (notes) ✅ 完了 (2026-01-30)
- [x] **48. OrderDetailActions.tsx** → `consumables/orders/[id]/actions.ts` (delivery_notes) ✅ 完了 (2026-01-30)
- [x] **49. PurchaseOrder Approve** → `/api/purchase-orders/[id]/approve` (comment) ✅ 完了 (2026-01-30)
- [x] **50. PurchaseOrder Reject** → `/api/purchase-orders/[id]/reject` (comment) ✅ 完了 (2026-01-30)
- [ ] **51-90. その他LOW** → 各種簡易フォーム（約42件残り）

---

## 🧪 テスト計画

### 単体テスト

各API Route/Server Actionに対して:

```typescript
// テスト例
describe('POST /api/staff', () => {
  it('should reject input with <script> tag', async () => {
    const response = await fetch('/api/staff', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test<script>alert(1)</script>User'
      })
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('不正な文字列')
    })
  })

  it('should escape HTML in name field', async () => {
    const response = await fetch('/api/staff', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test & <Company>'
      })
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.name).toBe('Test &amp; &lt;Company&gt;')
  })
})
```

### 統合テスト

1. フォーム送信 → DB保存 → データ取得 → 画面表示までの一連の流れを確認
2. エスケープされたデータが正しく表示されることを確認
3. PDF生成、メール送信時に不正なHTMLが含まれないことを確認

### セキュリティテスト

以下のペイロードで全フォームをテスト:

```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<iframe src="javascript:alert('XSS')">
javascript:alert('XSS')
<object data="javascript:alert('XSS')">
<embed src="javascript:alert('XSS')">
```

---

## 📝 実装時の注意事項

### 1. 既存データの扱い

既にDBに保存されているデータはエスケープされていない可能性があります:

- **対応方法A**: マイグレーションスクリプトで既存データをエスケープ
- **対応方法B**: 表示時に動的にエスケープ（推奨しない）
- **対応方法C**: 既存データはそのままで、今後の入力のみ保護（最も現実的）

### 2. 検索機能への影響

HTMLエスケープされたデータは検索時に考慮が必要:

```typescript
// 例: ユーザーが "A & B" で検索
// DB には "A &amp; B" として保存されている

// 対応方法: 検索クエリもエスケープしてから検索
const searchQuery = escapeHtml(userInput)
// SELECT * FROM table WHERE name LIKE '%A &amp; B%'
```

### 3. CSVエクスポート時の処理

エクスケープされたデータをエクスポートする場合:

- **Option A**: エスケープされたままエクスポート（安全だが読みにくい）
- **Option B**: エクスポート時にアンエスケープ（要注意: Excel等での実行リスク）
- **推奨**: エスケープされたままエクスポートし、説明をドキュメントに記載

### 4. API互換性

既存のモバイルアプリやサードパーティ連携がある場合:

- APIのレスポンス形式が変わらないことを確認
- エスケープはサーバー側のみで行い、レスポンスには影響させない

### 5. パフォーマンス考慮

大量データのインポート時:

```typescript
// 悪い例: ループ内で毎回関数呼び出し
for (const row of csvRows) {
  if (hasSuspiciousPattern(row.name)) { /* ... */ }
  sanitizedRows.push({ name: escapeHtml(row.name) })
}

// 良い例: バッチ処理
const validatedRows = csvRows.filter(row => !hasSuspiciousPattern(row.name))
const sanitizedRows = validatedRows.map(row => ({
  name: escapeHtml(row.name),
  // ...
}))
```

---

## 📚 参考資料

### 内部ドキュメント

- `lib/security/html-escape.ts` - セキュリティライブラリ本体
- `docs/CSRF_PROTECTION_PLAN.md` - CSRF対策計画（参考）
- `docs/DATABASE_SCHEMA.md` - データベーススキーマ
- `docs/ROLE_BASED_ACCESS_CONTROL.md` - 権限管理仕様

### 外部リソース

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

---

## 🔄 進捗トラッキング

このドキュメントを更新し、各フォームの実装完了時にチェックマークを付けてください。

**最終更新日**: 2026-01-30
**完了率**: 52/94 (55%)

---

## 📧 質問・相談

実装中に不明点がある場合は、以下を確認してください:

1. 既存のセキュリティ実装例: `app/api/demo/request/route.ts`
2. セキュリティライブラリ: `lib/security/html-escape.ts`
3. このドキュメントの実装パターン

---

**このドキュメントは実装の進捗に応じて定期的に更新してください。**
