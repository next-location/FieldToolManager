'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type TabType = 'tool' | 'consumable' | 'equipment'

interface ToolMovement {
  id: string
  created_at: string
  movement_type: string
  from_location: string
  to_location: string
  notes: string | null
  tool_items: {
    id: string
    serial_number: string
    tools: {
      name: string
      model_number: string
    } | null
  } | null
  tools: {
    name: string
    model_number: string
  } | null
  from_site: { name: string; type: string } | null
  to_site: { name: string; type: string } | null
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
  tool_id: string
  tools: {
    name: string
    model_number: string | null
  } | null
  from_site: { name: string; type: string } | null
  to_site: { name: string; type: string } | null
  users: { name: string } | null
}

interface EquipmentMovement {
  id: string
  action_type: string
  action_at: string
  hour_meter_reading: number | null
  notes: string | null
  other_location_name: string | null
  heavy_equipment: {
    equipment_code: string
    name: string
  } | null
  from_site: { name: string; type: string } | null
  to_site: { name: string; type: string } | null
  users: { name: string } | null
}

// 拠点タイプに応じたアイコンを返す
function getLocationIcon(type: string): string {
  switch (type) {
    case 'own_warehouse':
      return '🏢' // 自社倉庫
    case 'branch':
      return '🏪' // 支店
    case 'storage_yard':
      return '📦' // 資材置き場
    case 'customer_site':
      return '🏗️' // 顧客現場
    default:
      return '📍' // その他
  }
}

// 拠点名にアイコンを付けて表示
function formatLocationWithIcon(site: { name: string; type: string } | null, defaultName: string = '倉庫'): string {
  if (!site) return defaultName
  const icon = getLocationIcon(site.type)
  return `${icon} ${site.name}`
}

interface MovementTabsProps {
  toolMovements: ToolMovement[]
  consumableMovements: ConsumableMovement[]
  equipmentMovements: EquipmentMovement[]
  heavyEquipmentEnabled: boolean
  successMessage?: string
  initialTab?: string
}

export function MovementTabs({
  toolMovements,
  consumableMovements,
  equipmentMovements,
  heavyEquipmentEnabled,
  successMessage: propSuccessMessage,
  initialTab
}: MovementTabsProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType || tabParam || 'tool')
  const [successMessage, setSuccessMessage] = useState<string | null>(propSuccessMessage || null)

  // propsのsuccessMessageが変更されたら反映
  useEffect(() => {
    if (propSuccessMessage) {
      setSuccessMessage(propSuccessMessage)
      // 5秒後にメッセージを消す
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [propSuccessMessage])

  // URLパラメータからタブを取得
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType | null
    if (tab && (tab === 'tool' || tab === 'consumable' || tab === 'equipment')) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // セット移動をグルーピング
  const groupedToolMovements = toolMovements.reduce((acc, movement) => {
    const setMatch = movement.notes?.match(/\[セット:\s*(.+?)\]/)
    if (setMatch) {
      const setName = setMatch[1]
      const key = `${movement.created_at}_${setName}_${movement.from_location}_${movement.to_location}`
      if (!acc[key]) {
        acc[key] = {
          setName,
          created_at: movement.created_at,
          from_location: movement.from_location,
          to_location: movement.to_location,
          from_site: movement.from_site,
          to_site: movement.to_site,
          users: movement.users,
          movements: []
        }
      }
      acc[key].movements.push(movement)
      return acc
    }
    // 個別移動
    acc[movement.id] = { movements: [movement] }
    return acc
  }, {} as Record<string, any>)

  const displayMovements = Object.values(groupedToolMovements)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6">移動履歴</h1>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            ✓ {successMessage}
          </div>
        )}

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
            {/* Card view (PC & Mobile) */}
            <div className="divide-y divide-gray-200">
              {equipmentMovements && equipmentMovements.length > 0 ? (
                equipmentMovements.map((movement) => (
                  <div key={movement.id} className="p-4 sm:p-6 hover:bg-gray-50">
                    {/* ヘッダー: 重機名と日時 */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        {movement.heavy_equipment ? (
                          <div className="text-base font-semibold text-gray-900">
                            {movement.heavy_equipment.equipment_code} - {movement.heavy_equipment.name}
                          </div>
                        ) : (
                          <div className="text-base font-semibold text-gray-500">削除済み</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                        {new Date(movement.action_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* 詳細情報 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">種別:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {movement.action_type === 'checkout' ? '🏗️ 持出' :
                           movement.action_type === 'checkin' ? '🏢 返却' :
                           movement.action_type === 'transfer' ? '🔄 移動' : movement.action_type}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">実施者:</span>
                        <span className="text-gray-900">{movement.users?.name || '-'}</span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">移動元:</span>
                        <span className="text-gray-900">
                          {movement.action_type === 'checkout'
                            ? '会社'
                            : !movement.from_site && movement.other_location_name
                            ? movement.other_location_name
                            : movement.from_site ? formatLocationWithIcon(movement.from_site, '会社') : '会社'}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">移動先:</span>
                        <span className="text-gray-900">
                          {movement.action_type === 'checkin'
                            ? '会社'
                            : !movement.to_site && movement.other_location_name
                            ? movement.other_location_name
                            : movement.to_site ? formatLocationWithIcon(movement.to_site, '会社') : '会社'}
                        </span>
                      </div>

                      {movement.notes && (
                        <div className="sm:col-span-2 flex">
                          <span className="text-gray-500 w-16 flex-shrink-0">備考:</span>
                          <span className="text-gray-600 flex-1">{movement.notes}</span>
                        </div>
                      )}
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
            {/* Card view (PC & Mobile) */}
            <div className="divide-y divide-gray-200">
              {displayMovements && displayMovements.length > 0 ? (
                displayMovements.map((group: any, idx: number) => {
                  const isSet = group.setName
                  const firstMovement = group.movements[0]

                  return (
                    <div key={idx} className="p-4 sm:p-6 hover:bg-gray-50">
                      {/* ヘッダー: 道具名と日時 */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          {isSet ? (
                            <div>
                              <div className="text-base font-semibold text-gray-900 mb-1">
                                📦 {group.setName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {group.movements.map((m: ToolMovement, i: number) => (
                                  <span key={m.id}>
                                    {m.tool_items?.tools?.name || '不明'} #{m.tool_items?.serial_number}
                                    {i < group.movements.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              {firstMovement.tool_items ? (
                                <Link
                                  href={`/tool-items/${firstMovement.tool_items.id}`}
                                  className="text-base font-semibold text-blue-600 hover:text-blue-800"
                                >
                                  {firstMovement.tool_items.tools?.name || '不明'} #{firstMovement.tool_items.serial_number}
                                </Link>
                              ) : firstMovement.tools ? (
                                <div className="text-base font-semibold text-gray-900">
                                  {firstMovement.tools.name}
                                  {firstMovement.tools.model_number && (
                                    <span className="text-sm text-gray-500 font-normal ml-2">({firstMovement.tools.model_number})</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-base font-semibold text-gray-500">削除済み</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                          {new Date(group.created_at || firstMovement.created_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* 詳細情報 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center">
                          <span className="text-gray-500 w-16">種別:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {isSet && '📦 '}
                            {firstMovement.movement_type === 'adjustment' ? '📝 在庫調整' :
                             firstMovement.movement_type === 'correction' ? '🔄 修正' :
                             (group.to_location || firstMovement.to_location) === 'site' ? '🏗️ 現場へ' :
                             (group.to_location || firstMovement.to_location) === 'warehouse' ? '🏢 会社へ' :
                             (group.to_location || firstMovement.to_location) === 'repair' ? '🔧 修理へ' : (group.to_location || firstMovement.to_location)}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-gray-500 w-16">実施者:</span>
                          <span className="text-gray-900">{(group.users || firstMovement.users)?.name || '-'}</span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-gray-500 w-16">移動元:</span>
                          <span className="text-gray-900">
                            {(group.from_location || firstMovement.from_location) === 'warehouse' ? '会社' :
                             (group.from_location || firstMovement.from_location) === 'site' ? formatLocationWithIcon((group.from_site || firstMovement.from_site), '現場') :
                             (group.from_location || firstMovement.from_location) === 'repair' ? '修理中' : (group.from_location || firstMovement.from_location)}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <span className="text-gray-500 w-16">移動先:</span>
                          <span className="text-gray-900">
                            {(group.to_location || firstMovement.to_location) === 'site' ? formatLocationWithIcon((group.to_site || firstMovement.to_site), '現場') :
                             (group.to_location || firstMovement.to_location) === 'warehouse' ? '会社' :
                             (group.to_location || firstMovement.to_location) === 'repair' ? '修理中' : '-'}
                          </span>
                        </div>

                        {firstMovement.notes && (
                          <div className="sm:col-span-2 flex">
                            <span className="text-gray-500 w-16 flex-shrink-0">備考:</span>
                            <span className="text-gray-600 flex-1">{firstMovement.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-12 text-center text-gray-500">
                  道具の移動履歴がありません
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* Card view (PC & Mobile) */}
            <div className="divide-y divide-gray-200">
              {consumableMovements && consumableMovements.length > 0 ? (
                consumableMovements.map((movement) => (
                  <div key={movement.id} className="p-4 sm:p-6 hover:bg-gray-50">
                    {/* ヘッダー: 消耗品名と日時 */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-base font-semibold text-gray-900">
                          {movement.tools?.name || '不明な消耗品'}
                          {movement.tools?.model_number && (
                            <span className="text-sm text-gray-500 font-normal ml-2">
                              ({movement.tools.model_number})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                        {new Date(movement.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* 詳細情報 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">種別:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {movement.movement_type}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">実施者:</span>
                        <span className="text-gray-900">{movement.users?.name || '-'}</span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">移動元:</span>
                        <span className="text-gray-900">
                          {movement.from_location_type === 'warehouse' ? '会社' :
                           movement.from_location_type === 'site' ? formatLocationWithIcon(movement.from_site, '現場') :
                           movement.from_location_type}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">移動先:</span>
                        <span className="text-gray-900">
                          {movement.to_location_type === 'warehouse' ? '会社' :
                           movement.to_location_type === 'site' ? formatLocationWithIcon(movement.to_site, '現場') :
                           movement.to_location_type}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 w-16">数量:</span>
                        <span className="text-gray-900">{movement.quantity}個</span>
                      </div>

                      {movement.notes && (
                        <div className="sm:col-span-2 flex">
                          <span className="text-gray-500 w-16 flex-shrink-0">備考:</span>
                          <span className="text-gray-600 flex-1">{movement.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center text-gray-500">
                  消耗品の移動履歴がありません
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
