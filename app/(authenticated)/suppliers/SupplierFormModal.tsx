'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

// Supplier型は廃止 - Client型を使用
interface Supplier {
  id: string
  name: string
  name_kana?: string
  postal_code?: string
  address?: string
  phone?: string
  fax?: string
  email?: string
  website?: string
  contact_person?: string
  payment_terms?: string
  bank_name?: string
  branch_name?: string
  account_type?: string
  account_number?: string
  account_holder?: string
  notes?: string
  is_active: boolean
}

interface SupplierFormModalProps {
  supplier?: Supplier
  onClose: () => void
  onSuccess: () => void
}

export function SupplierFormModal({ supplier, onClose, onSuccess }: SupplierFormModalProps) {
  const isEdit = !!supplier
  const [loading, setLoading] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    name_kana: '',
    postal_code: '',
    address: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    contact_person: '',
    payment_terms: '',
    bank_name: '',
    branch_name: '',
    account_type: '',
    account_number: '',
    account_holder: '',
    notes: '',
    is_active: true,
  })

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        name_kana: supplier.name_kana || '',
        postal_code: supplier.postal_code || '',
        address: supplier.address || '',
        phone: supplier.phone || '',
        fax: supplier.fax || '',
        email: supplier.email || '',
        website: supplier.website || '',
        contact_person: supplier.contact_person || '',
        payment_terms: supplier.payment_terms || '',
        bank_name: supplier.bank_name || '',
        branch_name: supplier.branch_name || '',
        account_type: supplier.account_type || '',
        account_number: supplier.account_number || '',
        account_holder: supplier.account_holder || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active,
      })
    }
  }, [supplier])

  // 郵便番号から住所を検索
  const handlePostalCodeSearch = async (postalCodeInput: string) => {
    const postalCode = postalCodeInput.replace(/[^0-9]/g, '')

    // 7桁になったら自動検索
    if (postalCode.length !== 7) {
      return
    }

    setAddressLoading(true)
    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
      const data = await response.json()

      if (data.status === 200 && data.results) {
        const result = data.results[0]
        const address = `${result.address1}${result.address2}${result.address3}`
        setFormData(prev => ({ ...prev, address }))
      }
    } catch (error) {
      console.error('Error fetching address:', error)
    } finally {
      setAddressLoading(false)
    }
  }

  // 郵便番号入力時のハンドラー
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData({ ...formData, postal_code: value })

    // 自動検索を実行
    handlePostalCodeSearch(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEdit ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
      const method = isEdit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '保存に失敗しました')
      }

      alert(isEdit ? '仕入先を更新しました' : '仕入先を登録しました')
      onSuccess()
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? '仕入先編集' : '仕入先登録'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  仕入先名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  仕入先名（カナ）
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.name_kana}
                  onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  郵便番号 {addressLoading && <span className="text-sm text-gray-500">(住所検索中...)</span>}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.postal_code}
                  onChange={handlePostalCodeChange}
                  placeholder="123-4567 または 1234567"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">7桁入力すると自動で住所を検索します</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">電話番号</label>
                <input
                  type="tel"
                  maxLength={20}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">住所</label>
                <input
                  type="text"
                  maxLength={200}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">FAX</label>
                <input
                  type="tel"
                  maxLength={20}
                  value={formData.fax}
                  onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">メール</label>
                <input
                  type="email"
                  maxLength={100}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Webサイト</label>
                <input
                  type="url"
                  maxLength={200}
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">担当者名</label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* 支払条件 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">支払条件</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">支払条件</label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="例: 月末締め翌月末払い"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* 銀行口座情報 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">銀行口座情報</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">銀行名</label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">支店名</label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">口座種別</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">口座番号</label>
                <input
                  type="text"
                  maxLength={20}
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">口座名義</label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.account_holder}
                  onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">備考</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* ステータス */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              有効
            </label>
          </div>

          {/* フッター */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '保存中...' : (isEdit ? '更新' : '登録')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
