'use client'

import { useState, memo, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Client, ClientType, PaymentMethod, BankAccountType } from '@/types/clients'

interface ClientFormProps {
  client?: Client
  mode?: 'create' | 'edit'
}

function ClientForm({ client, mode = 'create' }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォームデータ
  const [formData, setFormData] = useState({
    // 基本情報
    name: client?.name || '',
    name_kana: client?.name_kana || '',
    short_name: client?.short_name || '',
    client_type: client?.client_type || ('customer' as ClientType),
    industry: client?.industry || '',

    // 連絡先情報
    postal_code: client?.postal_code || '',
    address: client?.address || '',
    phone: client?.phone || '',
    fax: client?.fax || '',
    email: client?.email || '',
    website: client?.website || '',

    // 担当者情報
    contact_person: client?.contact_person || '',
    contact_department: client?.contact_department || '',
    contact_phone: client?.contact_phone || '',
    contact_email: client?.contact_email || '',

    // 取引条件
    payment_terms: client?.payment_terms || '',
    payment_method: client?.payment_method || ('' as PaymentMethod | ''),
    payment_due_days: client?.payment_due_days || 30,
    credit_limit: client?.credit_limit || null,

    // 銀行情報
    bank_name: client?.bank_name || '',
    bank_branch: client?.bank_branch || '',
    bank_account_type: client?.bank_account_type || ('' as BankAccountType | ''),
    bank_account_number: client?.bank_account_number || '',
    bank_account_holder: client?.bank_account_holder || '',

    // 税務情報
    tax_id: client?.tax_id || '',
    tax_registration_number: client?.tax_registration_number || '',
    is_tax_exempt: client?.is_tax_exempt || false,

    // 評価とメモ
    rating: client?.rating || null,
    notes: client?.notes || '',
    internal_notes: client?.internal_notes || '',

    // ステータス
    is_active: client?.is_active !== undefined ? client.is_active : true,
  })

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
            ? value === ''
              ? null
              : Number(value)
            : value || null,
    }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 必須項目チェック
      if (!formData.name || !formData.client_type) {
        setError('取引先名と取引先分類は必須です')
        setLoading(false)
        return
      }

      const url = mode === 'create' ? '/api/clients' : `/api/clients/${client?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存に失敗しました')
      }

      // 成功したら詳細ページにリダイレクト
      router.push(`/clients/${data.data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました')
      setLoading(false)
    }
  }, [formData, mode, client?.id, router])

  return (
    <form onSubmit={handleSubmit}>
      {/* エラー表示 */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 基本情報 */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  取引先名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="name_kana" className="block text-sm font-medium text-gray-700">
                  フリガナ
                </label>
                <input
                  type="text"
                  name="name_kana"
                  id="name_kana"
                  value={formData.name_kana || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="short_name" className="block text-sm font-medium text-gray-700">
                  略称
                </label>
                <input
                  type="text"
                  name="short_name"
                  id="short_name"
                  value={formData.short_name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="client_type" className="block text-sm font-medium text-gray-700">
                  取引先分類 <span className="text-red-500">*</span>
                </label>
                <select
                  name="client_type"
                  id="client_type"
                  required
                  value={formData.client_type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="customer">顧客</option>
                  <option value="supplier">仕入先</option>
                  <option value="partner">協力会社</option>
                  <option value="both">顧客兼仕入先</option>
                </select>
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                  業種
                </label>
                <input
                  type="text"
                  name="industry"
                  id="industry"
                  value={formData.industry || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="is_active" className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">有効</span>
                </label>
              </div>
            </div>
        </div>

        {/* 連絡先情報 */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">連絡先</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                  郵便番号
                </label>
                <input
                  type="text"
                  name="postal_code"
                  id="postal_code"
                  placeholder="123-4567"
                  value={formData.postal_code || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  住所
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  電話番号
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="fax" className="block text-sm font-medium text-gray-700">
                  FAX番号
                </label>
                <input
                  type="tel"
                  name="fax"
                  id="fax"
                  value={formData.fax || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  ウェブサイト
                </label>
                <input
                  type="url"
                  name="website"
                  id="website"
                  value={formData.website || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
        </div>

        {/* 担当者情報 */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">担当者</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">
                  担当者名
                </label>
                <input
                  type="text"
                  name="contact_person"
                  id="contact_person"
                  value={formData.contact_person || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="contact_department"
                  className="block text-sm font-medium text-gray-700"
                >
                  部署
                </label>
                <input
                  type="text"
                  name="contact_department"
                  id="contact_department"
                  value={formData.contact_department || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                  電話番号
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  id="contact_phone"
                  value={formData.contact_phone || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="contact_email"
                  id="contact_email"
                  value={formData.contact_email || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
        </div>

        {/* 取引条件 */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">取引条件</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700">
                  支払条件
                </label>
                <input
                  type="text"
                  name="payment_terms"
                  id="payment_terms"
                  placeholder="例: 月末締め翌月末払い"
                  value={formData.payment_terms || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
                  支払方法
                </label>
                <select
                  name="payment_method"
                  id="payment_method"
                  value={formData.payment_method || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="bank_transfer">銀行振込</option>
                  <option value="cash">現金</option>
                  <option value="check">小切手</option>
                  <option value="credit">掛売り</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="payment_due_days"
                  className="block text-sm font-medium text-gray-700"
                >
                  支払期日（日数）
                </label>
                <input
                  type="number"
                  name="payment_due_days"
                  id="payment_due_days"
                  value={formData.payment_due_days || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700">
                  与信限度額（円）
                </label>
                <input
                  type="number"
                  name="credit_limit"
                  id="credit_limit"
                  value={formData.credit_limit || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
        </div>

        {/* 銀行情報 */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">銀行情報</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700">
                  銀行名
                </label>
                <input
                  type="text"
                  name="bank_name"
                  id="bank_name"
                  value={formData.bank_name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="bank_branch" className="block text-sm font-medium text-gray-700">
                  支店名
                </label>
                <input
                  type="text"
                  name="bank_branch"
                  id="bank_branch"
                  value={formData.bank_branch || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="bank_account_type"
                  className="block text-sm font-medium text-gray-700"
                >
                  口座種別
                </label>
                <select
                  name="bank_account_type"
                  id="bank_account_type"
                  value={formData.bank_account_type || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="savings">普通預金</option>
                  <option value="current">当座預金</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="bank_account_number"
                  className="block text-sm font-medium text-gray-700"
                >
                  口座番号
                </label>
                <input
                  type="text"
                  name="bank_account_number"
                  id="bank_account_number"
                  value={formData.bank_account_number || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="bank_account_holder"
                  className="block text-sm font-medium text-gray-700"
                >
                  口座名義
                </label>
                <input
                  type="text"
                  name="bank_account_holder"
                  id="bank_account_holder"
                  value={formData.bank_account_holder || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
        </div>

        {/* 税務情報 */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">税務情報</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700">
                  法人番号
                </label>
                <input
                  type="text"
                  name="tax_id"
                  id="tax_id"
                  value={formData.tax_id || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="tax_registration_number"
                  className="block text-sm font-medium text-gray-700"
                >
                  インボイス登録番号
                </label>
                <input
                  type="text"
                  name="tax_registration_number"
                  id="tax_registration_number"
                  value={formData.tax_registration_number || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="is_tax_exempt" className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_tax_exempt"
                    id="is_tax_exempt"
                    checked={formData.is_tax_exempt}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">免税事業者</span>
                </label>
              </div>
            </div>
        </div>

        {/* 評価とメモ */}
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">評価とメモ</h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
                  評価（1-5）
                </label>
                <select
                  name="rating"
                  id="rating"
                  value={formData.rating || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="1">⭐</option>
                  <option value="2">⭐⭐</option>
                  <option value="3">⭐⭐⭐</option>
                  <option value="4">⭐⭐⭐⭐</option>
                  <option value="5">⭐⭐⭐⭐⭐</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  備考
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={4}
                  value={formData.notes || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700">
                  社内用メモ 🔒
                </label>
                <textarea
                  name="internal_notes"
                  id="internal_notes"
                  rows={4}
                  value={formData.internal_notes || ''}
                  onChange={handleChange}
                  placeholder="社内のみで共有されるメモです"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/clients"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : mode === 'create' ? '登録' : '更新'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default memo(ClientForm)
