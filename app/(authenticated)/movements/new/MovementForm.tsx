'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMovement } from '../actions'
import { createClient } from '@/lib/supabase/client'

type ToolItem = {
  id: string
  serial_number: string
  current_location: string
  current_site_id: string | null
  warehouse_location_id: string | null
  tools: {
    id: string
    name: string
    model_number: string | null
  }[]
}

type Site = {
  id: string
  name: string
}

type WarehouseLocation = {
  id: string
  code: string
  display_name: string
  site_id?: string | null
  sites?: {
    name: string
    type: string
  } | null
}

export function MovementForm({
  toolItems,
  sites,
  warehouseLocations = [],
  selectedItemId,
  toolSetItems = [],
  toolSetId,
  userRole,
}: {
  toolItems: ToolItem[]
  sites: Site[]
  warehouseLocations?: WarehouseLocation[]
  selectedItemId?: string
  toolSetItems?: ToolItem[]
  toolSetId?: string
  userRole: string
}) {
  const router = useRouter()
  const [toolItemId, setToolItemId] = useState(selectedItemId || '')
  const [destination, setDestination] = useState<'warehouse' | 'site' | 'repair'>('warehouse')
  const [toSiteId, setToSiteId] = useState('')
  const [warehouseLocationId, setWarehouseLocationId] = useState('')
  const [correctionMode, setCorrectionMode] = useState(false)
  const [actualLocation, setActualLocation] = useState<'warehouse' | 'site'>('warehouse')
  const [actualSiteId, setActualSiteId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 道具セットモードかどうか
  const isToolSetMode = toolSetItems.length > 0 && toolSetId

  const selectedItem = toolItems.find((item) => item.id === toolItemId)

  // 現在地のテキスト
  const currentLocationText = selectedItem
    ? selectedItem.current_location === 'warehouse'
      ? '倉庫'
      : selectedItem.current_location === 'site'
      ? sites.find((s) => s.id === selectedItem.current_site_id)?.name || '現場'
      : selectedItem.current_location === 'repair'
      ? '修理中'
      : '不明'
    : ''

  // 移動種別を自動判定
  const getMovementType = (): string => {
    if (!selectedItem) return ''
    if (correctionMode) return 'correction' // 位置修正

    const from = selectedItem.current_location
    const to = destination

    // 修理関連
    if (to === 'repair') return 'repair'
    if (from === 'repair' && to === 'warehouse') return 'return_from_repair'

    // 倉庫 → 倉庫（倉庫内移動）
    if (from === 'warehouse' && to === 'warehouse') return 'warehouse_move'

    // 倉庫 → 現場
    if (from === 'warehouse' && to === 'site') return 'check_out'

    // 現場 → 倉庫
    if (from === 'site' && to === 'warehouse') return 'check_in'

    // 現場 → 現場
    if (from === 'site' && to === 'site') return 'transfer'

    return ''
  }

  // 移動種別のラベル
  const movementTypeLabel = () => {
    const type = getMovementType()
    if (correctionMode) return '🔧 位置修正'
    if (type === 'warehouse_move') return '📦 倉庫内移動'
    if (type === 'check_out') return '🔵 持ち出し（倉庫→現場）'
    if (type === 'check_in') return '🟢 返却（現場→倉庫）'
    if (type === 'transfer') return '🔄 移動（現場→現場）'
    if (type === 'repair') return '🔧 修理に出す'
    if (type === 'return_from_repair') return '✅ 修理から戻る'
    return '移動先を選択してください'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isToolSetMode) {
        // 道具セット一括移動
        let successCount = 0
        let failureCount = 0
        const errors: string[] = []

        for (const item of toolSetItems) {
          try {
            const formData = new FormData()
            formData.append('tool_item_id', item.id)

            // 移動種別を判定
            const from = item.current_location
            const to = destination
            let movementType = ''

            if (to === 'repair') movementType = 'repair'
            else if (from === 'repair' && to === 'warehouse') movementType = 'return_from_repair'
            else if (from === 'warehouse' && to === 'warehouse') {
              movementType = 'warehouse_move'
              // 倉庫内移動で倉庫位置が指定されていない場合はスキップ
              if (!warehouseLocationId) {
                errors.push(`${item.serial_number}: 倉庫位置を選択してください`)
                failureCount++
                continue
              }
              // 同じ倉庫位置への移動はスキップ
              if (item.warehouse_location_id === warehouseLocationId) {
                errors.push(`${item.serial_number}: 既に同じ倉庫位置にあります`)
                failureCount++
                continue
              }
            }
            else if (from === 'warehouse' && to === 'site') movementType = 'check_out'
            else if (from === 'site' && to === 'warehouse') movementType = 'check_in'
            else if (from === 'site' && to === 'site') movementType = 'transfer'

            formData.append('movement_type', movementType)
            formData.append('quantity', '1')
            formData.append('skipRedirect', 'true') // リダイレクトをスキップ

            if (item.current_site_id) {
              formData.append('from_site_id', item.current_site_id)
            }

            if (destination === 'site' && toSiteId) {
              formData.append('to_site_id', toSiteId)
            }

            if (destination === 'warehouse' && warehouseLocationId) {
              formData.append('warehouse_location_id', warehouseLocationId)
            }

            if (notes) {
              formData.append('notes', `[セット移動] ${notes}`)
            } else {
              formData.append('notes', '[セット移動]')
            }

            await createMovement(formData)
            successCount++
          } catch (err: any) {
            failureCount++
            errors.push(`${item.serial_number}: ${err.message}`)
          }
        }

        if (failureCount > 0) {
          setError(`${successCount}個成功、${failureCount}個失敗しました。\n${errors.join('\n')}`)
          setLoading(false)
        } else {
          router.push('/movements')
          return
        }
      } else {
        // 個別移動

        // 位置修正モードでない場合、セットメンバーシップをチェック
        if (!correctionMode && selectedItem) {
          const supabase = createClient()
          const { data: setMembership } = await supabase
            .from('tool_set_items')
            .select('tool_set_id, tool_sets(name)')
            .eq('tool_item_id', selectedItem.id)
            .single()

          if (setMembership) {
            const setName = (setMembership as any).tool_sets?.name || 'セット'
            if (userRole === 'admin' || userRole === 'leader') {
              setError(
                `❌ この道具は「${setName}」に含まれています。\n\nセット内の道具は個別に移動できません。\n\n個別移動が必要な場合:\n1. セット詳細画面でセットを削除\n2. 道具を個別に移動\n3. 必要に応じてセットを再登録`
              )
            } else {
              setError(
                `❌ この道具は「${setName}」に含まれています。\n\nセット内の道具は個別に移動できません。\n\n上司（リーダー以上）に相談してください。`
              )
            }
            setLoading(false)
            return
          }
        }

        // 倉庫内移動で同じ倉庫位置への移動をチェック
        if (getMovementType() === 'warehouse_move') {
          if (!warehouseLocationId) {
            setError('倉庫位置を選択してください')
            setLoading(false)
            return
          }
          if (selectedItem?.warehouse_location_id === warehouseLocationId) {
            setError('既に同じ倉庫位置にあります')
            setLoading(false)
            return
          }
        }

        const formData = new FormData()
        formData.append('tool_item_id', toolItemId)
        formData.append('movement_type', getMovementType())
        formData.append('quantity', '1')

        if (selectedItem && selectedItem.current_site_id) {
          formData.append('from_site_id', selectedItem.current_site_id)
        }

        if (destination === 'site' && toSiteId) {
          formData.append('to_site_id', toSiteId)
        }

        if (destination === 'warehouse' && warehouseLocationId) {
          formData.append('warehouse_location_id', warehouseLocationId)
        }

        if (notes) {
          formData.append('notes', correctionMode ? `[位置修正] ${notes}` : notes)
        } else if (correctionMode) {
          formData.append('notes', '[位置修正]')
        }

        await createMovement(formData)
        // 成功時は自動的にリダイレクトされる（エラーをthrowしない）
        return
      }
    } catch (err: any) {
      setError(err.message || '登録に失敗しました')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isToolSetMode ? (
        <>
          {/* 道具セットモード：セット内のアイテム一覧を表示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              移動する道具（{toolSetItems.length}個）
            </label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {toolSetItems.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-2 border-b border-gray-100 last:border-b-0 text-sm"
                >
                  <span className="font-medium">{item.tools[0]?.name || '不明'}</span>
                  <span className="ml-2 font-mono text-gray-600">#{item.serial_number}</span>
                  <span className="ml-2 text-gray-500">
                    現在地:{' '}
                    {item.current_location === 'warehouse'
                      ? '倉庫'
                      : item.current_location === 'site'
                      ? '現場'
                      : item.current_location === 'repair'
                      ? '修理中'
                      : '不明'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 個別移動モード：アイテム選択 */}
          <div>
            <label htmlFor="tool_item_id" className="block text-sm font-medium text-gray-700 mb-2">
              道具（個別アイテム） <span className="text-red-500">*</span>
            </label>
            <select
              id="tool_item_id"
              value={toolItemId}
              onChange={(e) => setToolItemId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">選択してください</option>
              {toolItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.tools[0]?.name || '不明'} #{item.serial_number} ({item.tools[0]?.model_number || '型番なし'}) - 現在地:{' '}
                  {item.current_location === 'warehouse'
                    ? '倉庫'
                    : item.current_location === 'site'
                    ? '現場'
                    : item.current_location === 'repair'
                    ? '修理中'
                    : '不明'}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {(isToolSetMode || selectedItem) && (
        <>
          {/* 現在地表示（個別移動モードのみ） */}
          {!isToolSetMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">現在地</label>
              <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                📍 {currentLocationText}
              </div>
              {(userRole === 'admin' || userRole === 'leader') && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionMode(!correctionMode)}
                    className={`text-sm ${
                      correctionMode ? 'text-red-600 font-medium' : 'text-blue-600'
                    } hover:underline`}
                  >
                    {correctionMode ? '✓ 位置修正モード' : '実際の場所が違う場合はこちら'}
                  </button>
                </div>
              )}
              {userRole !== 'admin' && userRole !== 'leader' && (
                <p className="mt-2 text-xs text-gray-500">
                  💡 実際の場所が違う場合は、上司（リーダー以上）に位置修正を依頼してください
                </p>
              )}
            </div>
          )}

          {!correctionMode ? (
            <>
              {/* 通常モード: 移動先選択 */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">1. 移動先を選択</h3>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDestination('warehouse')
                      setToSiteId('')
                    }}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      destination === 'warehouse'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🏢</div>
                    <div className="font-medium">倉庫</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestination('site')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      destination === 'site'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🏗️</div>
                    <div className="font-medium">現場</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDestination('repair')
                      setToSiteId('')
                    }}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      destination === 'repair'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">🔧</div>
                    <div className="font-medium">修理</div>
                  </button>
                </div>

                {/* 現場選択 */}
                {destination === 'site' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      現場 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={toSiteId}
                      onChange={(e) => setToSiteId(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">現場を選択してください</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 倉庫位置選択（オプション） */}
                {destination === 'warehouse' && warehouseLocations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      倉庫位置（オプション）
                    </label>
                    <select
                      value={warehouseLocationId}
                      onChange={(e) => setWarehouseLocationId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">倉庫位置を選択（任意）</option>
                      {/* 会社メイン倉庫の位置 */}
                      {warehouseLocations.filter(loc => !loc.site_id).length > 0 && (
                        <optgroup label="━━ 会社（メイン倉庫） ━━">
                          {warehouseLocations.filter(loc => !loc.site_id).map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.code} - {location.display_name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* 各拠点の倉庫位置 */}
                      {Array.from(new Set(warehouseLocations.filter(loc => loc.site_id).map(loc => loc.site_id))).map((siteId) => {
                        const siteLocations = warehouseLocations.filter(loc => loc.site_id === siteId)
                        const siteName = siteLocations[0]?.sites?.name || '不明な拠点'
                        return (
                          <optgroup key={siteId} label={`━━ ${siteName} ━━`}>
                            {siteLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.code} - {location.display_name}
                              </option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* 位置修正モード */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium text-red-900">⚠️ 位置修正モード</div>
                <p className="text-sm text-red-700">
                  システムの記録：<strong>{currentLocationText}</strong>
                  <br />
                  実際の場所が異なる場合、以下の2つを設定してください。この操作は監査ログに記録されます。
                </p>
              </div>

              {/* STEP 1: 実際の現在地 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-xs mr-2">STEP 1</span>
                  実際の現在地はどこですか？ <span className="text-red-500">*</span>
                </label>
                <select
                  value={actualLocation === 'warehouse' ? '' : actualSiteId}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setActualLocation('warehouse')
                      setActualSiteId('')
                    } else {
                      setActualLocation('site')
                      setActualSiteId(e.target.value)
                    }
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">🏢 倉庫</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      🏗️ {site.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  ※ システムは「{currentLocationText}」と記録していますが、実際にはどこにありますか？
                </p>
              </div>

              {/* STEP 2: 移動先 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-xs mr-2">STEP 2</span>
                  どこに移動しますか？ <span className="text-red-500">*</span>
                </label>
                <select
                  value={destination === 'warehouse' ? '' : toSiteId}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setDestination('warehouse')
                      setToSiteId('')
                    } else {
                      setDestination('site')
                      setToSiteId(e.target.value)
                    }
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">🏢 倉庫</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      🏗️ {site.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  ※ 位置修正後、この道具をどこに移動しますか？
                </p>
              </div>

              {/* 位置修正の処理説明 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-xs text-yellow-800">
                  <strong>📝 登録される内容：</strong>
                  <br />
                  1️⃣ システム記録を「
                  {actualLocation === 'warehouse' ? '倉庫' : sites.find((s) => s.id === actualSiteId)?.name || '現場'}
                  」に修正
                  <br />
                  2️⃣ その後「
                  {destination === 'warehouse' ? '倉庫' : sites.find((s) => s.id === toSiteId)?.name || '現場'}
                  」に移動
                </div>
              </div>
            </>
          )}

          {/* メモ */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              メモ {correctionMode && <span className="text-red-500">*（位置修正の理由を記入）</span>}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required={correctionMode}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={correctionMode ? '位置修正の理由を記入してください' : '移動の理由や特記事項があれば記入'}
            />
          </div>
        </>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* ボタン */}
      <div className="flex justify-end space-x-3 pt-4">
        <Link
          href="/movements"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={
            loading ||
            (!isToolSetMode && !toolItemId) ||
            (destination === 'site' && !toSiteId)
          }
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? '登録中...'
            : isToolSetMode
            ? `一括移動 (${toolSetItems.length}個)`
            : '登録'}
        </button>
      </div>
    </form>
  )
}
