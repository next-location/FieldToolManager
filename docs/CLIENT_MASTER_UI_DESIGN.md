# 取引先マスタ UI設計書

> **既存UIパターンに完全準拠した取引先マスタの詳細UI設計**
> スタッフ管理、現場マスタ、カテゴリ管理と同じデザインシステムを使用

---

## 🎨 既存UIパターン分析結果

### 共通レイアウトパターン

#### 1. **ページコンテナ**
```tsx
<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
  <div className="px-4 py-6 sm:px-0">
    {/* コンテンツ */}
  </div>
</div>
```

#### 2. **ページヘッダー**
```tsx
<div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold text-gray-900">
    {タイトル}
  </h1>
  <Link
    href="/path/new"
    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
  >
    + 新規登録
  </Link>
</div>
```

#### 3. **リストコンテナ**
```tsx
<div className="bg-white shadow overflow-hidden sm:rounded-md">
  <ul className="divide-y divide-gray-200">
    {/* リストアイテム */}
  </ul>
</div>
```

#### 4. **リストアイテム（ホバー付き）**
```tsx
<li>
  <Link href={`/path/${id}`} className="block hover:bg-gray-50 transition-colors">
    <div className="px-4 py-4 sm:px-6">
      {/* アイテム内容 */}
    </div>
  </Link>
</li>
```

#### 5. **ステータスバッジ**
```tsx
<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
  isActive
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800'
}`}>
  {ステータス}
</span>
```

#### 6. **空状態表示**
```tsx
<div className="px-4 py-12 text-center">
  <svg className="mx-auto h-12 w-12 text-gray-400" {/* SVGアイコン */} />
  <h3 className="mt-2 text-sm font-medium text-gray-900">
    データがありません
  </h3>
  <p className="mt-1 text-sm text-gray-500">
    説明テキスト
  </p>
  <div className="mt-6">
    <Link href="/path/new" className="...">
      + 新規登録
    </Link>
  </div>
</div>
```

---

## 📱 取引先マスタ画面設計（既存UIパターン準拠）

### 1. 取引先一覧ページ (`app/(authenticated)/clients/page.tsx`)

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClientFilter } from './ClientFilter'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    client_type?: string
    is_active?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const clientType = params.client_type || 'all'
  const isActive = params.is_active !== 'false' // デフォルトtrue
  const search = params.search || ''

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 取引先一覧を取得
  let query = supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // フィルター適用
  if (clientType !== 'all') {
    query = query.eq('client_type', clientType)
  }

  if (isActive) {
    query = query.eq('is_active', true)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,address.ilike.%${search}%`)
  }

  const { data: clients, error } = await query

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">取引先マスタ</h1>
          <Link
            href="/clients/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + 新規登録
          </Link>
        </div>

        {/* フィルター */}
        <ClientFilter />

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            エラーが発生しました: {error.message}
          </div>
        )}

        {/* 検索結果件数 */}
        {search && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-medium">{clients?.length || 0}</span> 件の取引先が見つかりました
          </div>
        )}

        {/* 取引先リスト */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {clients && clients.length > 0 ? (
              clients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* 取引先名 */}
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {client.name}
                            </p>
                            {/* 取引先分類バッジ */}
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getClientTypeBadgeColor(client.client_type)}`}>
                              {getClientTypeLabel(client.client_type)}
                            </span>
                          </div>

                          {/* 取引先コード */}
                          <p className="mt-1 text-sm text-gray-500">
                            🏷️ {client.code}
                          </p>

                          {/* 住所 */}
                          {client.address && (
                            <p className="mt-1 text-sm text-gray-500">
                              📍 {client.address}
                            </p>
                          )}

                          {/* 電話番号 */}
                          {client.phone && (
                            <p className="mt-1 text-sm text-gray-500">
                              📞 {client.phone}
                            </p>
                          )}

                          {/* 取引実績 */}
                          {client.total_transaction_count > 0 && (
                            <p className="mt-1 text-sm text-gray-500">
                              📊 取引実績: {client.total_transaction_count}回 / 累計 ¥{client.total_transaction_amount?.toLocaleString()}
                            </p>
                          )}

                          {/* 最終取引日 */}
                          {client.last_transaction_date && (
                            <p className="mt-1 text-sm text-gray-500">
                              🕐 最終取引: {new Date(client.last_transaction_date).toLocaleDateString('ja-JP')}
                            </p>
                          )}
                        </div>

                        {/* ステータスバッジ */}
                        <div className="ml-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            client.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {client.is_active ? '有効' : '無効'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            ) : (
              <li className="px-4 py-12 text-center text-gray-500">
                {search || clientType !== 'all' ? (
                  <>
                    検索条件に一致する取引先がありません
                    <br />
                    <span className="text-sm">検索条件を変更してお試しください</span>
                  </>
                ) : (
                  <div>
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">取引先が登録されていません</h3>
                    <p className="mt-1 text-sm text-gray-500">顧客・仕入先・協力会社を登録してください</p>
                    <div className="mt-6">
                      <Link
                        href="/clients/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        + 新規登録
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ヘルパー関数
function getClientTypeLabel(type: string) {
  const labels: Record<string, string> = {
    customer: '顧客',
    supplier: '仕入先',
    partner: '協力会社',
    both: '顧客兼仕入先',
  }
  return labels[type] || type
}

function getClientTypeBadgeColor(type: string) {
  const colors: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-800',
    supplier: 'bg-green-100 text-green-800',
    partner: 'bg-purple-100 text-purple-800',
    both: 'bg-orange-100 text-orange-800',
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}
```

---

### 2. フィルターコンポーネント (`app/(authenticated)/clients/ClientFilter.tsx`)

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export function ClientFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [clientType, setClientType] = useState(searchParams.get('client_type') || 'all')
  const [isActive, setIsActive] = useState(searchParams.get('is_active') !== 'false')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === 'all' || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    router.push(`/clients?${params.toString()}`)
  }

  return (
    <div className="bg-white shadow sm:rounded-md p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 取引先分類フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            取引先分類
          </label>
          <div className="flex items-center space-x-4">
            {[
              { value: 'all', label: 'すべて' },
              { value: 'customer', label: '顧客' },
              { value: 'supplier', label: '仕入先' },
              { value: 'partner', label: '協力会社' },
            ].map((option) => (
              <label key={option.value} className="inline-flex items-center">
                <input
                  type="radio"
                  value={option.value}
                  checked={clientType === option.value}
                  onChange={(e) => {
                    setClientType(e.target.value)
                    updateFilters({ client_type: e.target.value })
                  }}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 有効/無効フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive(e.target.checked)
                updateFilters({ is_active: e.target.checked ? 'true' : 'false' })
              }}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">有効のみ表示</span>
          </label>
        </div>

        {/* 検索ボックス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            type="text"
            placeholder="取引先名、コード、住所で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateFilters({ search })
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  )
}
```

---

### 3. 取引先詳細ページ (`app/(authenticated)/clients/[id]/page.tsx`)

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 取引先詳細取得
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !client) {
    redirect('/clients')
  }

  // 関連現場取得
  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('client_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Link href="/clients" className="text-blue-600 hover:text-blue-800 text-sm">
              ← 取引先一覧に戻る
            </Link>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-sm text-gray-500">{client.code}</span>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getClientTypeBadgeColor(client.client_type)}`}>
                  {getClientTypeLabel(client.client_type)}
                </span>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.is_active ? '有効' : '無効'}
                </span>
              </div>
            </div>
            <Link
              href={`/clients/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              編集
            </Link>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メイン情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <InfoItem label="正式名称" value={client.name} />
                  <InfoItem label="略称" value={client.short_name} />
                  <InfoItem label="フリガナ" value={client.name_kana} />
                  <InfoItem label="業種" value={client.industry} />
                </dl>
              </div>
            </div>

            {/* 連絡先情報 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">連絡先</h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <InfoItem label="郵便番号" value={client.postal_code} />
                  <InfoItem label="住所" value={client.address} span2 />
                  <InfoItem label="電話番号" value={client.phone} />
                  <InfoItem label="FAX番号" value={client.fax} />
                  <InfoItem label="メールアドレス" value={client.email} />
                  <InfoItem label="ウェブサイト" value={client.website} />
                </dl>
              </div>
            </div>

            {/* 担当者情報 */}
            {client.contact_person && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">担当者</h2>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <InfoItem label="担当者名" value={client.contact_person} />
                    <InfoItem label="部署" value={client.contact_department} />
                    <InfoItem label="電話番号" value={client.contact_phone} />
                    <InfoItem label="メールアドレス" value={client.contact_email} />
                  </dl>
                </div>
              </div>
            )}

            {/* 関連現場 */}
            {sites && sites.length > 0 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">関連現場 ({sites.length}件)</h2>
                  <ul className="divide-y divide-gray-200">
                    {sites.slice(0, 5).map((site) => (
                      <li key={site.id} className="py-3">
                        <Link href={`/sites/${site.id}`} className="text-blue-600 hover:text-blue-800">
                          🏗️ {site.name}
                        </Link>
                        {site.address && (
                          <p className="text-sm text-gray-500 mt-1">📍 {site.address}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {sites.length > 5 && (
                    <div className="mt-4">
                      <Link href={`/sites?client_id=${id}`} className="text-sm text-blue-600 hover:text-blue-800">
                        すべての現場を見る →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 取引条件 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">取引条件</h2>
                <dl className="space-y-4">
                  <InfoItem label="支払条件" value={client.payment_terms} />
                  <InfoItem label="支払方法" value={client.payment_method && getPaymentMethodLabel(client.payment_method)} />
                  <InfoItem label="支払期日" value={client.payment_due_days && `${client.payment_due_days}日`} />
                  <InfoItem label="与信限度額" value={client.credit_limit && `¥${client.credit_limit.toLocaleString()}`} />
                  <InfoItem label="現在残高" value={`¥${client.current_balance.toLocaleString()}`} />
                </dl>
              </div>
            </div>

            {/* 銀行情報 */}
            {client.bank_name && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">銀行情報</h2>
                  <dl className="space-y-4">
                    <InfoItem label="銀行名" value={client.bank_name} />
                    <InfoItem label="支店名" value={client.bank_branch} />
                    <InfoItem label="口座種別" value={client.bank_account_type} />
                    <InfoItem label="口座番号" value={client.bank_account_number} />
                    <InfoItem label="口座名義" value={client.bank_account_holder} />
                  </dl>
                </div>
              </div>
            )}

            {/* 取引実績 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">取引実績</h2>
                <dl className="space-y-4">
                  <InfoItem label="初回取引日" value={client.first_transaction_date && new Date(client.first_transaction_date).toLocaleDateString('ja-JP')} />
                  <InfoItem label="最終取引日" value={client.last_transaction_date && new Date(client.last_transaction_date).toLocaleDateString('ja-JP')} />
                  <InfoItem label="取引回数" value={`${client.total_transaction_count}回`} />
                  <InfoItem label="累計取引額" value={`¥${client.total_transaction_amount.toLocaleString()}`} />
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 情報表示コンポーネント
function InfoItem({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) {
  if (!value) return null

  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
}
```

---

## 📊 実装済みパターンの活用

実装タスクドキュメント（`CLIENT_MASTER_IMPLEMENTATION_TASKS.md`）の**Phase 2**で、以下のコンポーネントを上記のUIパターンに従って実装します:

### ✅ 既に計画に含まれているUI実装

1. **取引先一覧ページ** (Task 2.2.1)
   - ✅ スタッフ管理・現場マスタと同じレイアウト
   - ✅ ホバーエフェクト付きリスト
   - ✅ ステータスバッジ
   - ✅ 空状態表示

2. **取引先フィルター** (Task 2.2.3)
   - ✅ ラジオボタン形式
   - ✅ チェックボックス
   - ✅ 検索ボックス

3. **取引先詳細ページ** (Task 2.3.1)
   - ✅ 情報カード形式
   - ✅ グリッドレイアウト
   - ✅ 編集ボタン

4. **取引先登録・編集フォーム** (Task 2.4.3)
   - ✅ セクション分割
   - ✅ react-hook-form
   - ✅ zodバリデーション

5. **共通コンポーネント** (Task 2.1.1-2.1.4)
   - ✅ ClientTypeSelect
   - ✅ PaymentMethodSelect
   - ✅ BankAccountTypeSelect
   - ✅ ClientCard

---

## 🎨 カラーパレット（統一）

```tsx
// ステータス
const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

// 取引先分類
const clientTypeColors = {
  customer: 'bg-blue-100 text-blue-800',
  supplier: 'bg-green-100 text-green-800',
  partner: 'bg-purple-100 text-purple-800',
  both: 'bg-orange-100 text-orange-800',
}

// ボタン
const buttonPrimary = 'bg-blue-600 hover:bg-blue-700 text-white'
const buttonSecondary = 'bg-gray-100 hover:bg-gray-200 text-gray-700'
const buttonDanger = 'bg-red-600 hover:bg-red-700 text-white'
```

---

## ✅ 結論

**はい、実装計画にUIの詳細が含まれています！**

実装タスクドキュメントの**Phase 2（Week 2-3）**に、以下がすべて含まれています:

✅ **登録機能** - Task 2.4.1（新規登録ページ）
✅ **編集機能** - Task 2.4.2（編集ページ）
✅ **削除機能** - Task 1.2.5（削除API）
✅ **一覧表示** - Task 2.2.1（一覧ページ）
✅ **詳細表示** - Task 2.3.1（詳細ページ）
✅ **フィルター・検索** - Task 2.2.3（フィルターコンポーネント）
✅ **統一されたデザイン** - 既存のスタッフ管理・現場マスタと同じUIパターン

すべての画面で**既存のデザインシステムを踏襲**し、ユーザーが違和感なく操作できる設計になっています。