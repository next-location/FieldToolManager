'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QRCodeDisplay } from './QRCodeDisplay'
import { ToolItemQRCodeModal } from '@/components/tools/ToolItemQRCodeModal'

interface ToolItem {
  id: string
  serial_number: string
  qr_code: string
  status: string
  current_location: string
  notes?: string
  current_site?: { name: string }
  warehouse_location?: { code: string; display_name: string }
}

interface ToolItemQRCodeListProps {
  toolItems: ToolItem[]
  toolName: string
  toolUnit: string
  item_id?: string
  qrSize?: number
}

export function ToolItemQRCodeList({
  toolItems,
  toolName,
  toolUnit,
  item_id,
  qrSize = 25
}: ToolItemQRCodeListProps) {
  const [selectedItem, setSelectedItem] = useState<ToolItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleQRClick = (item: ToolItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  if (!toolItems || toolItems.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-500">
        個別アイテムが登録されていません
      </div>
    )
  }

  return (
    <>
      <ul className="divide-y divide-gray-200">
        {toolItems.map((item) => {
          const statusClass =
            item.status === 'available' ? 'bg-green-100 text-green-800' :
            item.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
            item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
            item.status === 'lost' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'

          const statusText =
            item.status === 'available' ? '利用可能' :
            item.status === 'in_use' ? '使用中' :
            item.status === 'maintenance' ? 'メンテナンス中' :
            item.status === 'lost' ? '紛失' :
            item.status

          const locationText =
            item.current_location === 'warehouse'
              ? (item.warehouse_location
                  ? `倉庫 (${item.warehouse_location.code} - ${item.warehouse_location.display_name})`
                  : '倉庫')
              : item.current_location === 'site'
                ? `現場: ${item.current_site?.name || '不明'}`
                : item.current_location === 'repair'
                  ? '修理中'
                  : item.current_location === 'lost'
                    ? '紛失'
                    : item.current_location

          return (
            <li
              key={item.id}
              id={`item-${item.id}`}
              className={`px-4 py-4 sm:px-6 ${item_id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
            >
              {/* スマホ: 縦並び、PC: 横並び */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center">
                    <Link
                      href={`/tool-items/${item.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      #{item.serial_number}
                    </Link>
                    <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-400 w-20 sm:w-24">現在地:</span>
                      <span className="text-xs sm:text-sm">📍 {locationText}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-20 sm:w-24 flex-shrink-0">QRコード:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => handleQRClick(item)}
                          className="hover:opacity-75 transition-opacity cursor-pointer flex-shrink-0"
                          title="クリックしてQRコードを印刷"
                        >
                          <QRCodeDisplay value={item.qr_code} size={50} />
                        </button>
                        <button
                          onClick={() => handleQRClick(item)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline flex-shrink-0 whitespace-nowrap"
                        >
                          印刷
                        </button>
                        <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                          {item.qr_code.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.notes && <p className="mt-1 text-xs text-gray-500">📝 {item.notes}</p>}
                </div>
                {/* スマホ: ボタンを横並びで表示 */}
                <div className="flex items-center gap-2 sm:flex-col sm:space-y-2 sm:gap-0">
                  <Link
                    href={`/tool-items/${item.id}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
                  >
                    📄 詳細
                  </Link>
                  <Link
                    href={`/movements/new?tool_item_id=${item.id}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-blue-600 rounded text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 whitespace-nowrap"
                  >
                    📦 移動
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {selectedItem && (
        <ToolItemQRCodeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          toolItemId={selectedItem.id}
          toolName={toolName}
          serialNumber={selectedItem.serial_number}
          qrCode={selectedItem.qr_code}
          qrSize={qrSize}
        />
      )}
    </>
  )
}
