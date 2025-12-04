'use client'

import { useState, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { BulkQRCodePrint, QRCodeItem } from '@/components/qr/BulkQRCodePrint'

interface ToolItem {
  id: string
  qrCode: string
  name: string
  code: string
  toolId: string
  toolName: string
  category: string
}

interface ToolBulkQRClientProps {
  items: ToolItem[]
}

export function ToolBulkQRClient({ items }: ToolBulkQRClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // カテゴリ一覧を取得
  const categories = useMemo(() => {
    const categorySet = new Set(items.map((item) => item.category))
    return Array.from(categorySet).sort()
  }, [items])

  // フィルタリング
  const filteredItems = useMemo(() => {
    let result = items

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.toolName.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query)
      )
    }

    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory)
    }

    return result
  }, [items, searchQuery, selectedCategory])

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const qrCodeItems: QRCodeItem[] = items.map((item) => ({
    id: item.id,
    qrCode: item.qrCode,
    name: item.name,
    code: item.code,
  }))

  return (
    <>
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="道具名、シリアル番号で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === filteredItems.length
                  ? 'すべての選択を解除'
                  : 'すべて選択'}
              </button>
              <span className="text-sm text-gray-600">
                {selectedIds.size}個選択中 / {filteredItems.length}個表示中
              </span>
            </div>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🖨️ QRコード印刷 ({selectedIds.size})
            </button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        selectedIds.size === filteredItems.length
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    道具名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    シリアル番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedIds.has(item.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleToggle(item.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleToggle(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.toolName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {item.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {item.category}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      {items.length === 0
                        ? '個別管理道具がありません'
                        : '検索条件に一致する道具がありません'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 印刷モーダル */}
      <Transition appear show={isPrintModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsPrintModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    QRコード一括印刷
                  </Dialog.Title>

                  <BulkQRCodePrint
                    items={qrCodeItems}
                    selectedIds={selectedIds}
                    onClose={() => setIsPrintModalOpen(false)}
                    itemType="道具"
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
