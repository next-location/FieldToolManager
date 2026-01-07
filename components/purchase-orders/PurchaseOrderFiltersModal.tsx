'use client'

import { X } from 'lucide-react'

interface PurchaseOrderFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  creatorFilter: string
  setCreatorFilter: (value: string) => void
  staffList: Array<{ id: string; name: string }>
  isManagerOrAdmin: boolean
  onReset: () => void
}

export default function PurchaseOrderFiltersModal({
  isOpen,
  onClose,
  statusFilter,
  setStatusFilter,
  creatorFilter,
  setCreatorFilter,
  staffList,
  isManagerOrAdmin,
  onReset,
}: PurchaseOrderFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onClose()
  }

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] animate-fadeIn"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-[70] animate-slideUp max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">フィルター</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="draft">下書き</option>
              <option value="submitted">承認申請中</option>
              <option value="approved">承認済み</option>
              <option value="rejected">差戻し</option>
              <option value="ordered">発注済み</option>
              <option value="received">納品済み</option>
              <option value="paid">支払済み</option>
            </select>
          </div>

          {/* 作成者（マネージャー・管理者のみ） */}
          {isManagerOrAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                作成者
              </label>
              <select
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">すべて</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
