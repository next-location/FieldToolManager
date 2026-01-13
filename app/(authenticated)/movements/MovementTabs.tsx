'use client'

import { useState } from 'react'
import Link from 'next/link'

type TabType = 'tool' | 'consumable' | 'equipment'

interface ToolMovement {
  id: string
  created_at: string
  from_location: string
  to_location: string
  tool_items: {
    id: string
    serial_number: string
    tools: {
      name: string
      model_number: string
    } | null
  } | null
  from_site: { name: string } | null
  to_site: { name: string } | null
  users: { name: string } | null
}

interface ConsumableMovement {
  id: string
  movement_type: string
  from_location_type: string
  to_location_type: string
  quantity: number
  notes: string | null
  created_at: string
  tools: {
    name: string
    model_number: string | null
  }[]
  from_site: { name: string }[]
  to_site: { name: string }[]
  users: { name: string }[]
}

interface EquipmentMovement {
  id: string
  action_type: string
  action_at: string
  hour_meter_reading: number | null
  notes: string | null
  heavy_equipment: {
    equipment_code: string
    name: string
  } | null
  from_site: { name: string } | null
  to_site: { name: string } | null
  users: { name: string } | null
}

interface MovementTabsProps {
  toolMovements: ToolMovement[]
  consumableMovements: ConsumableMovement[]
  equipmentMovements: EquipmentMovement[]
  heavyEquipmentEnabled: boolean
}

export function MovementTabs({
  toolMovements,
  consumableMovements,
  equipmentMovements,
  heavyEquipmentEnabled
}: MovementTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tool')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6">移動履歴</h1>

        {/* タブナビゲーション */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('tool')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'tool'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="hidden sm:inline">道具移動履歴</span>
              <span className="sm:hidden">道具</span>
            </button>
            <button
              onClick={() => setActiveTab('consumable')}
              className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'consumable'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="hidden sm:inline">消耗品移動履歴</span>
              <span className="sm:hidden">消耗品</span>
            </button>
            {heavyEquipmentEnabled && (
              <button
                onClick={() => setActiveTab('equipment')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'equipment'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="hidden sm:inline">重機移動履歴</span>
                <span className="sm:hidden">重機</span>
              </button>
            )}
          </div>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'equipment' ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* PC: Table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      種別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      重機
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      移動元
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      移動先
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      実施者
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {equipmentMovements && equipmentMovements.length > 0 ? (
                    equipmentMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movement.action_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movement.action_type === 'checkout' ? '🏗️ 持出' :
                           movement.action_type === 'checkin' ? '🏢 返却' :
                           movement.action_type === 'transfer' ? '🔄 移動' : movement.action_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movement.heavy_equipment ? (
                            <span className="text-gray-900">
                              {movement.heavy_equipment.equipment_code} - {movement.heavy_equipment.name}
                            </span>
                          ) : (
                            <span className="text-gray-500">削除済み</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.from_site?.name || '倉庫'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.to_site?.name || '倉庫'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.users?.name || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        重機の移動履歴がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card view */}
            <div className="sm:hidden divide-y divide-gray-200">
              {equipmentMovements && equipmentMovements.length > 0 ? (
                equipmentMovements.map((movement) => (
                  <div key={movement.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {movement.heavy_equipment ? `${movement.heavy_equipment.equipment_code} - ${movement.heavy_equipment.name}` : '削除済み'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(movement.action_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {movement.action_type === 'checkout' ? '持出' : movement.action_type === 'checkin' ? '返却' : '移動'}
                        </span>
                        <span>{movement.from_site?.name || '倉庫'} → {movement.to_site?.name || '倉庫'}</span>
                      </div>
                      <div className="text-xs text-gray-500">実施者: {movement.users?.name || '-'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center text-gray-500">
                  重機の移動履歴がありません
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'tool' ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* PC: Table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      種別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      道具
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      移動元
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      移動先
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      実施者
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {toolMovements && toolMovements.length > 0 ? (
                    toolMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movement.created_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movement.to_location === 'site' ? '🏗️ 現場へ' :
                           movement.to_location === 'warehouse' ? '🏢 倉庫へ' :
                           movement.to_location === 'repair' ? '🔧 修理へ' : movement.to_location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movement.tool_items ? (
                            <Link
                              href={`/tool-items/${movement.tool_items.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {movement.tool_items.tools?.name || '不明'} #{movement.tool_items.serial_number}
                            </Link>
                          ) : (
                            <span className="text-gray-500">削除済み</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.from_location === 'warehouse' ? '倉庫' :
                           movement.from_location === 'site' ? (movement.from_site?.name || '現場') :
                           movement.from_location === 'repair' ? '修理中' : movement.from_location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.to_location === 'site' ? (movement.to_site?.name || '現場') :
                           movement.to_location === 'warehouse' ? '倉庫' :
                           movement.to_location === 'repair' ? '修理中' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.users?.name || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        道具の移動履歴がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card view */}
            <div className="sm:hidden divide-y divide-gray-200">
              {toolMovements && toolMovements.length > 0 ? (
                toolMovements.map((movement) => (
                  <div key={movement.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      {movement.tool_items ? (
                        <Link
                          href={`/tool-items/${movement.tool_items.id}`}
                          className="text-sm font-medium text-blue-600"
                        >
                          {movement.tool_items.tools?.name || '不明'} #{movement.tool_items.serial_number}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-gray-500">削除済み</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(movement.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {movement.to_location === 'site' ? '現場へ' : movement.to_location === 'warehouse' ? '倉庫へ' : '修理へ'}
                        </span>
                        <span>
                          {movement.from_location === 'warehouse' ? '倉庫' : movement.from_location === 'site' ? (movement.from_site?.name || '現場') : '修理中'} → {movement.to_location === 'site' ? (movement.to_site?.name || '現場') : movement.to_location === 'warehouse' ? '倉庫' : '修理中'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">実施者: {movement.users?.name || '-'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center text-gray-500">
                  道具の移動履歴がありません
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {consumableMovements && consumableMovements.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {consumableMovements.map((movement) => (
                  <li key={movement.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {movement.movement_type}
                          </span>
                          <h3 className="text-sm font-medium text-gray-900">
                            {movement.tools[0]?.name || '不明な道具'}
                          </h3>
                          {movement.tools[0]?.model_number && (
                            <span className="text-sm text-gray-500">
                              ({movement.tools[0].model_number})
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="font-medium mr-1">移動元:</span>
                            {movement.from_location_type === 'warehouse'
                              ? '倉庫'
                              : movement.from_site?.[0]?.name || '不明'}
                          </div>
                          <span>→</span>
                          <div className="flex items-center">
                            <span className="font-medium mr-1">移動先:</span>
                            {movement.to_location_type === 'warehouse'
                              ? '倉庫'
                              : movement.to_site?.[0]?.name || '不明'}
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-1">数量:</span>
                            {movement.quantity}個
                          </div>
                        </div>

                        {movement.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">メモ:</span>{' '}
                            {movement.notes}
                          </div>
                        )}

                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                          <span>
                            実行者: {movement.users?.[0]?.name || '不明'}
                          </span>
                          <span>
                            {new Date(movement.created_at).toLocaleString(
                              'ja-JP',
                              {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  移動履歴がありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  消耗品の移動を行うと、ここに履歴が表示されます
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
