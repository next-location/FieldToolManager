'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AdjustmentHistoryProps {
  consumableId: string
  organizationId: string
  initialAdjustments: any[]
  unit: string
}

export function AdjustmentHistory({
  consumableId,
  organizationId,
  initialAdjustments,
  unit,
}: AdjustmentHistoryProps) {
  const [adjustments, setAdjustments] = useState(initialAdjustments)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleShowMore = async () => {
    setIsLoading(true)

    const supabase = createClient()

    const { data } = await supabase
      .from('consumable_movements')
      .select(`
        *,
        performed_by_user:users!consumable_movements_performed_by_fkey(name)
      `)
      .eq('tool_id', consumableId)
      .eq('organization_id', organizationId)
      .in('movement_type', ['調整', '消費'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setAdjustments(data)
      setIsExpanded(true)
    }

    setIsLoading(false)
  }

  const handleShowLess = () => {
    setAdjustments(initialAdjustments)
    setIsExpanded(false)
  }

  return (
    <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          在庫調整・消費履歴（{isExpanded ? '最新100件' : '最新10件'}）
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          過去の在庫調整・消費記録
        </p>
      </div>
      <div className="border-t border-gray-200">
        {adjustments && adjustments.length > 0 ? (
          <>
            <ul className="divide-y divide-gray-200">
              {adjustments.map((adjustment) => {
                const isConsumption = adjustment.movement_type === '消費'
                const hasUnitPrice = adjustment.unit_price !== null && adjustment.unit_price !== undefined
                const isPriceRequired = !isConsumption && !hasUnitPrice

                return (
                  <li key={adjustment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isConsumption && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              消費
                            </span>
                          )}
                          {!isConsumption && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              調整
                            </span>
                          )}
                          {isPriceRequired && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⚠️ 単価未入力
                            </span>
                          )}
                          <div className="text-sm text-gray-900">
                            {adjustment.notes || '在庫調整'}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(adjustment.created_at).toLocaleString(
                            'ja-JP'
                          )}{' '}
                          •{' '}
                          {adjustment.performed_by_user
                            ? (adjustment.performed_by_user as any).name
                            : '不明'}
                          {hasUnitPrice && (
                            <>
                              {' '}• 単価: ¥{adjustment.unit_price?.toLocaleString()}/{unit}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {isConsumption && '-'}
                          {adjustment.quantity}
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            {unit}
                          </span>
                        </div>
                        {hasUnitPrice && adjustment.total_amount && (
                          <div className="text-xs text-gray-600 mt-1">
                            ¥{adjustment.total_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="px-4 py-3 bg-gray-50 text-center border-t border-gray-200">
              {!isExpanded ? (
                <button
                  onClick={handleShowMore}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
                >
                  {isLoading ? '読み込み中...' : 'もっと見る（最新100件）'}
                </button>
              ) : (
                <button
                  onClick={handleShowLess}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  閉じる
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            在庫調整・消費履歴がありません
          </div>
        )}
      </div>
    </div>
  )
}
