'use client'

import { useState, useMemo, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { SupplierFormModal } from './SupplierFormModal'
import { useRouter } from 'next/navigation'

// Supplier型は廃止 - Client型を使用
interface Supplier {
  id: string
  name: string
  name_kana?: string
  supplier_code: string
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

interface SupplierListClientProps {}

export function SupplierListClient({}: SupplierListClientProps) {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // サーバーからデータ取得
  const fetchSuppliers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/suppliers?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'データ取得に失敗しました')
      }

      setSuppliers(result.data || [])
      setTotalCount(result.count || 0)
    } catch (error) {
      console.error('仕入先取得エラー:', error)
      alert('仕入先データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初回読み込み & フィルター・ページ変更時に再取得
  useEffect(() => {
    fetchSuppliers()
  }, [currentPage, search])

  // フィルター変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleCreate = () => {
    setEditingSupplier(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsModalOpen(true)
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`仕入先「${supplier.name}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '削除に失敗しました')
      }

      alert('仕入先を削除しました')
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      alert(error instanceof Error ? error.message : '削除に失敗しました')
    }
  }

  const handleModalSuccess = async () => {
    setIsModalOpen(false)
    setEditingSupplier(undefined)
    fetchSuppliers()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* 検索バーと新規作成ボタン */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="仕入先名、コード、住所、電話番号で検索..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          新規登録
        </button>
      </div>

      {/* 仕入先一覧テーブル */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                コード
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                仕入先名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                住所
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                電話番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                担当者
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  {search ? '検索結果が見つかりません' : '仕入先が登録されていません'}
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {supplier.supplier_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                    {supplier.name_kana && (
                      <div className="text-sm text-gray-500">{supplier.name_kana}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">{supplier.address || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplier.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {supplier.contact_person || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="編集"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="text-red-600 hover:text-red-900"
                      title="削除"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 統計情報 */}
      <div className="text-sm text-gray-500">
        {isLoading ? (
          'データ読み込み中...'
        ) : (
          `全 ${totalCount} 件を表示中（${currentPage}/${totalPages} ページ）`
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* モーダル */}
      {isModalOpen && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => {
            setIsModalOpen(false)
            setEditingSupplier(undefined)
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
