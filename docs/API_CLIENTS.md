# 取引先マスタ API仕様書

> **最終更新日**: 2025-12-05
> **バージョン**: 1.0

---

## 目次

1. [概要](#1-概要)
2. [認証](#2-認証)
3. [エンドポイント一覧](#3-エンドポイント一覧)
4. [データモデル](#4-データモデル)
5. [APIリファレンス](#5-apiリファレンス)
6. [エラーコード](#6-エラーコード)
7. [使用例](#7-使用例)

---

## 1. 概要

取引先マスタAPIは、顧客・仕入先・協力会社などの取引先情報を管理するためのREST APIです。

### 1.1 ベースURL

```
http://localhost:3000/api/clients
```

### 1.2 権限

⚠️ **全てのエンドポイントは管理者（admin）権限が必須です。**

---

## 2. 認証

### 2.1 認証方式

Supabase Authによるセッション認証を使用します。

### 2.2 認証ヘッダー

リクエストには自動的にSupabaseセッションCookieが含まれます。

---

## 3. エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---------|--------------|------|------|
| GET | `/api/clients` | 取引先一覧取得 | admin |
| GET | `/api/clients/:id` | 取引先詳細取得 | admin |
| POST | `/api/clients` | 取引先作成 | admin |
| PATCH | `/api/clients/:id` | 取引先更新 | admin |
| DELETE | `/api/clients/:id` | 取引先削除 | admin |
| GET | `/api/clients/stats` | 統計情報取得 | admin |
| GET | `/api/clients/export` | CSVエクスポート | admin |
| POST | `/api/clients/import` | CSVインポート | admin |

---

## 4. データモデル

### 4.1 Client型

```typescript
interface Client {
  // システム項目
  id: string                      // UUID
  organization_id: string         // 組織ID
  code: string                    // 取引先コード（CL-0001形式）
  created_at: string              // 作成日時（ISO 8601）
  updated_at: string              // 更新日時（ISO 8601）
  deleted_at: string | null       // 削除日時（論理削除）

  // 基本情報
  name: string                    // 取引先名（必須）
  name_kana: string | null        // フリガナ
  short_name: string | null       // 略称
  client_type: ClientType         // 取引先分類（必須）
  industry: string | null         // 業種
  is_active: boolean              // 有効フラグ

  // 連絡先情報
  postal_code: string | null      // 郵便番号
  address: string | null          // 住所
  phone: string | null            // 電話番号
  fax: string | null              // FAX番号
  email: string | null            // メールアドレス
  website: string | null          // ウェブサイト

  // 担当者情報
  contact_person: string | null   // 担当者名
  contact_department: string | null // 担当者部署
  contact_phone: string | null    // 担当者電話
  contact_email: string | null    // 担当者メール

  // 取引条件
  payment_terms: string | null    // 支払条件
  payment_method: PaymentMethod | null // 支払方法
  payment_due_days: number        // 支払期日（日数）
  credit_limit: number | null     // 与信限度額

  // 銀行情報
  bank_name: string | null        // 銀行名
  bank_branch: string | null      // 支店名
  bank_account_type: BankAccountType | null // 口座種別
  bank_account_number: string | null // 口座番号
  bank_account_holder: string | null // 口座名義

  // 税務情報
  tax_id: string | null           // 法人番号
  tax_registration_number: string | null // インボイス登録番号
  is_tax_exempt: boolean          // 免税事業者フラグ

  // 評価とメモ
  rating: number | null           // 評価（1-5）
  notes: string | null            // 備考
  internal_notes: string | null   // 社内用メモ

  // 取引実績（将来機能）
  first_transaction_date: string | null // 初回取引日
  last_transaction_date: string | null  // 最終取引日
  transaction_count: number       // 取引回数
  total_transaction_amount: number // 累計取引額
}
```

### 4.2 Enum型

```typescript
type ClientType = 'customer' | 'supplier' | 'partner' | 'both'

type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'credit' | 'other'

type BankAccountType = 'savings' | 'current' | 'other'
```

### 4.3 ラベルマッピング

```typescript
// 取引先分類
const CLIENT_TYPE_LABELS = {
  customer: '顧客',
  supplier: '仕入先',
  partner: '協力会社',
  both: '顧客兼仕入先',
}

// 支払方法
const PAYMENT_METHOD_LABELS = {
  bank_transfer: '銀行振込',
  cash: '現金',
  check: '小切手',
  credit: '掛売り',
  other: 'その他',
}

// 口座種別
const BANK_ACCOUNT_TYPE_LABELS = {
  savings: '普通預金',
  current: '当座預金',
  other: 'その他',
}
```

---

## 5. APIリファレンス

### 5.1 GET /api/clients

取引先一覧を取得します。

#### リクエスト

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|---|------|------|----------|
| client_type | string | ❌ | 取引先分類フィルター | all |
| is_active | string | ❌ | 有効フラグフィルター | - |
| search | string | ❌ | 検索キーワード | - |
| page | number | ❌ | ページ番号 | 1 |
| limit | number | ❌ | 1ページあたりの件数 | 20 |

**例**

```http
GET /api/clients?client_type=customer&is_active=true&search=サンライズ&page=1&limit=20
```

#### レスポンス

**成功 (200 OK)**

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "organization_id": "00000000-0000-0000-0000-000000000001",
      "code": "CL-0001",
      "name": "株式会社サンライズ開発",
      "name_kana": "カブシキガイシャサンライズカイハツ",
      "short_name": "サンライズ開発",
      "client_type": "customer",
      "industry": "不動産開発",
      "is_active": true,
      "postal_code": "150-0001",
      "address": "東京都渋谷区神宮前1-2-3 サンライズビル5F",
      "phone": "03-1234-5678",
      "email": "info@sunrise-dev.co.jp",
      "rating": 5,
      "created_at": "2025-12-05T10:00:00Z",
      "updated_at": "2025-12-05T10:00:00Z",
      "deleted_at": null
    }
  ],
  "count": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

**エラー (401 Unauthorized)**

```json
{
  "error": "認証が必要です"
}
```

**エラー (403 Forbidden)**

```json
{
  "error": "管理者権限が必要です"
}
```

---

### 5.2 GET /api/clients/:id

取引先の詳細情報を取得します。

#### リクエスト

**パスパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | string | ✅ | 取引先ID（UUID） |

**例**

```http
GET /api/clients/123e4567-e89b-12d3-a456-426614174000
```

#### レスポンス

**成功 (200 OK)**

```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "code": "CL-0001",
    "name": "株式会社サンライズ開発",
    "client_type": "customer",
    "payment_terms": "月末締め翌月末払い",
    "payment_method": "bank_transfer",
    "payment_due_days": 30,
    "bank_name": "みずほ銀行",
    "bank_branch": "渋谷支店",
    "bank_account_type": "current",
    "bank_account_number": "1234567",
    "bank_account_holder": "カ)サンライズカイハツ",
    "tax_registration_number": "T1234567890123",
    "is_tax_exempt": false,
    "rating": 5,
    "notes": "大手デベロッパー。案件規模が大きく信頼性が高い。",
    "created_at": "2025-12-05T10:00:00Z",
    "updated_at": "2025-12-05T10:00:00Z"
  }
}
```

**エラー (404 Not Found)**

```json
{
  "error": "取引先が見つかりません"
}
```

---

### 5.3 POST /api/clients

新しい取引先を作成します。

#### リクエスト

**ボディ (JSON)**

```json
{
  "name": "株式会社テスト建設",
  "name_kana": "カブシキガイシャテストケンセツ",
  "short_name": "テスト建設",
  "client_type": "customer",
  "industry": "建設業",
  "postal_code": "100-0001",
  "address": "東京都千代田区千代田1-1-1",
  "phone": "03-9999-8888",
  "email": "info@test-kensetsu.co.jp",
  "contact_person": "鈴木一郎",
  "contact_department": "営業部",
  "contact_phone": "03-9999-8889",
  "contact_email": "suzuki@test-kensetsu.co.jp",
  "payment_terms": "月末締め翌月末払い",
  "payment_method": "bank_transfer",
  "payment_due_days": 30,
  "rating": 4,
  "notes": "新規顧客",
  "is_active": true
}
```

**必須項目**

- `name`: 取引先名
- `client_type`: 取引先分類

#### レスポンス

**成功 (200 OK)**

```json
{
  "message": "取引先を作成しました",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "code": "CL-0008",
    "name": "株式会社テスト建設",
    "client_type": "customer",
    "created_at": "2025-12-05T11:00:00Z"
  }
}
```

**エラー (400 Bad Request)**

```json
{
  "error": "取引先名と取引先分類は必須です"
}
```

**エラー (409 Conflict)**

```json
{
  "error": "同じ名前の取引先がすでに登録されています"
}
```

---

### 5.4 PATCH /api/clients/:id

取引先情報を更新します。

#### リクエスト

**パスパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | string | ✅ | 取引先ID（UUID） |

**ボディ (JSON)**

更新したい項目のみ送信します。

```json
{
  "phone": "03-9999-7777",
  "email": "new-email@test-kensetsu.co.jp",
  "rating": 5
}
```

#### レスポンス

**成功 (200 OK)**

```json
{
  "message": "取引先を更新しました",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "株式会社テスト建設",
    "phone": "03-9999-7777",
    "email": "new-email@test-kensetsu.co.jp",
    "rating": 5,
    "updated_at": "2025-12-05T12:00:00Z"
  }
}
```

---

### 5.5 DELETE /api/clients/:id

取引先を削除（論理削除）します。

#### リクエスト

**パスパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| id | string | ✅ | 取引先ID（UUID） |

**例**

```http
DELETE /api/clients/456e7890-e89b-12d3-a456-426614174001
```

#### レスポンス

**成功 (200 OK)**

```json
{
  "message": "取引先を削除しました"
}
```

**エラー (400 Bad Request)**

```json
{
  "error": "この取引先には3件の現場が紐づいているため削除できません"
}
```

---

### 5.6 GET /api/clients/stats

取引先の統計情報を取得します。

#### リクエスト

クエリパラメータなし。

#### レスポンス

**成功 (200 OK)**

```json
{
  "data": {
    "total": 7,
    "active": 7,
    "inactive": 0,
    "byType": {
      "customer": 3,
      "supplier": 2,
      "partner": 2,
      "both": 0
    },
    "averageRating": 4.57,
    "byRating": {
      "5": 3,
      "4": 2,
      "3": 0,
      "2": 0,
      "1": 0,
      "none": 2
    },
    "transactions": {
      "totalAmount": 0,
      "totalCount": 0,
      "averageAmount": 0
    },
    "totalCreditLimit": 0,
    "invoiceRegistered": 2,
    "taxExempt": 0
  }
}
```

---

### 5.7 GET /api/clients/export

取引先情報をCSV形式でエクスポートします。

#### リクエスト

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| client_type | string | ❌ | 取引先分類フィルター |
| is_active | string | ❌ | 有効フラグフィルター |

**例**

```http
GET /api/clients/export?client_type=customer&is_active=true
```

#### レスポンス

**成功 (200 OK)**

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="clients_2025-12-05.csv"

取引先コード,取引先名,フリガナ,...
CL-0001,株式会社サンライズ開発,カブシキガイシャサンライズカイハツ,...
CL-0002,有限会社グリーンホーム,ユウゲンガイシャグリーンホーム,...
```

---

### 5.8 POST /api/clients/import

CSVファイルから取引先を一括登録します。

#### リクエスト

**Content-Type**: `multipart/form-data`

**フォームデータ**

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| file | File | ✅ | CSVファイル |

**CSV形式**

```csv
取引先名,フリガナ,略称,取引先分類,業種,...
株式会社サンプル,カブシキガイシャサンプル,サンプル,顧客,建設業,...
```

#### レスポンス

**成功 (200 OK)**

```json
{
  "message": "5件の取引先を登録しました",
  "results": {
    "success": 5,
    "errors": [
      {
        "row": 3,
        "error": "取引先名と取引先分類は必須です",
        "data": ",,,,..."
      }
    ]
  }
}
```

---

## 6. エラーコード

| ステータスコード | 説明 | 例 |
|----------------|------|---|
| 200 | 成功 | リクエスト成功 |
| 400 | バリデーションエラー | 必須項目が不足 |
| 401 | 認証エラー | ログインが必要 |
| 403 | 権限エラー | 管理者権限が必要 |
| 404 | リソースが見つからない | 取引先が存在しない |
| 409 | 競合エラー | 重複した取引先名 |
| 500 | サーバーエラー | 内部エラー |

### エラーレスポンスの形式

```json
{
  "error": "エラーメッセージ"
}
```

---

## 7. 使用例

### 7.1 取引先一覧を取得

```typescript
const response = await fetch('/api/clients?client_type=customer&is_active=true')
const data = await response.json()

if (response.ok) {
  console.log('取引先一覧:', data.data)
  console.log('総件数:', data.count)
} else {
  console.error('エラー:', data.error)
}
```

### 7.2 新しい取引先を作成

```typescript
const newClient = {
  name: '株式会社テスト建設',
  client_type: 'customer',
  phone: '03-1234-5678',
  email: 'info@test.co.jp',
  is_active: true,
}

const response = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newClient),
})

const data = await response.json()

if (response.ok) {
  console.log('作成成功:', data.data)
} else {
  console.error('エラー:', data.error)
}
```

### 7.3 取引先を更新

```typescript
const clientId = '123e4567-e89b-12d3-a456-426614174000'
const updates = {
  phone: '03-9999-8888',
  rating: 5,
}

const response = await fetch(`/api/clients/${clientId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(updates),
})

const data = await response.json()

if (response.ok) {
  console.log('更新成功:', data.data)
} else {
  console.error('エラー:', data.error)
}
```

### 7.4 CSVエクスポート

```typescript
const response = await fetch('/api/clients/export?client_type=customer')

if (response.ok) {
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'clients.csv'
  a.click()
  window.URL.revokeObjectURL(url)
} else {
  const data = await response.json()
  console.error('エラー:', data.error)
}
```

### 7.5 CSVインポート

```typescript
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/clients/import', {
  method: 'POST',
  body: formData,
})

const data = await response.json()

if (response.ok) {
  console.log('インポート成功:', data.results.success, '件')
  if (data.results.errors.length > 0) {
    console.log('エラー:', data.results.errors)
  }
} else {
  console.error('エラー:', data.error)
}
```

---

## 付録A: CSVフォーマット仕様

### ヘッダー行

```
取引先名,フリガナ,略称,取引先分類,業種,郵便番号,住所,電話番号,FAX番号,メールアドレス,ウェブサイト,担当者名,担当者部署,担当者電話,担当者メール,支払条件,支払方法,支払期日（日数）,与信限度額,銀行名,支店名,口座種別,口座番号,口座名義,法人番号,インボイス登録番号,免税事業者,評価,備考,社内用メモ,有効フラグ
```

### データ例

```csv
株式会社サンプル,カブシキガイシャサンプル,サンプル,顧客,建設業,100-0001,東京都千代田区千代田1-1-1,03-1234-5678,03-1234-5679,info@sample.co.jp,https://sample.co.jp,山田太郎,営業部,03-1234-5680,yamada@sample.co.jp,月末締め翌月末払い,銀行振込,30,5000000,みずほ銀行,渋谷支店,普通預金,1234567,カ)サンプル,1234567890123,T1234567890123,いいえ,5,優良顧客,機密メモ,有効
```

### 取引先分類の値

- 日本語: `顧客`, `仕入先`, `協力会社`, `顧客兼仕入先`
- 英語: `customer`, `supplier`, `partner`, `both`

### 支払方法の値

- 日本語: `銀行振込`, `現金`, `小切手`, `掛売り`, `その他`
- 英語: `bank_transfer`, `cash`, `check`, `credit`, `other`

### 口座種別の値

- 日本語: `普通預金`, `当座預金`, `その他`
- 英語: `savings`, `current`, `other`

---

**ドキュメントバージョン**: 1.0
**最終更新日**: 2025-12-05
