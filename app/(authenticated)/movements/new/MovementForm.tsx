'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createMovement } from '../actions'

type ToolItem = {
  id: string
  serial_number: string
  current_location: string
  current_site_id: string | null
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
}

export function MovementForm({
  toolItems,
  sites,
  warehouseLocations = [],
  selectedItemId,
  toolSetItems = [],
  toolSetId,
}: {
  toolItems: ToolItem[]
  sites: Site[]
  warehouseLocations?: WarehouseLocation[]
  selectedItemId?: string
  toolSetItems?: ToolItem[]
  toolSetId?: string
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
            else if (from === 'warehouse' && to === 'site') movementType = 'check_out'
            else if (from === 'site' && to === 'warehouse') movementType = 'check_in'
            else if (from === 'site' && to === 'site') movementType = 'transfer'

            formData.append('movement_type', movementType)
            formData.append('quantity', '1')

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
        } else {
          router.push('/movements')
        }
      } else {
        // 個別移動
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
        // 成功時は自動的にリダイレクトされる
      }
    } catch (err: any) {
      setError(err.message || '登録に失敗しました')
    } finally {
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
            </div>
          )}

          {!correctionMode ? (
            <>
              {/* 通常モード: 移動先選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  移動先 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {/* 倉庫オプション */}
                  {selectedItem && selectedItem.current_location !== 'warehouse' && (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setDestination('warehouse')
                          setToSiteId('')
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-lg text-left ${
                          destination === 'warehouse'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">🏢 倉庫に戻す</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {selectedItem?.current_location === 'site' && '返却'}
                          {selectedItem?.current_location === 'repair' && '修理完了'}
                        </div>
                      </button>
                      {destination === 'warehouse' && warehouseLocations.length > 0 && (
                        <select
                          value={warehouseLocationId}
                          onChange={(e) => setWarehouseLocationId(e.target.value)}
                          className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">倉庫位置を選択（任意）...</option>
                          {warehouseLocations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.code} - {location.display_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* 現場オプション */}
                  {selectedItem && selectedItem.current_location !== 'repair' && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setDestination('site')}
                        className={`w-full px-4 py-3 border-2 rounded-lg text-left ${
                          destination === 'site'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">🏗️ 現場に移動</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {selectedItem?.current_location === 'warehouse' && '持ち出し'}
                          {selectedItem?.current_location === 'site' && '現場間移動'}
                        </div>
                      </button>
                      {destination === 'site' && (
                        <select
                          value={toSiteId}
                          onChange={(e) => setToSiteId(e.target.value)}
                          required
                          className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">現場を選択...</option>
                          {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* 修理オプション */}
                  {selectedItem && selectedItem.current_location !== 'repair' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestination('repair')
                        setToSiteId('')
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-lg text-left ${
                        destination === 'repair'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">🔧 修理に出す</div>
                      <div className="text-sm text-gray-600 mt-1">メンテナンス・修理</div>
                    </button>
                  )}
                </div>
              </div>

              {/* 自動判定された移動種別を表示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-900">移動種別（自動設定）</div>
                <div className="text-lg font-bold text-blue-700 mt-1">{movementTypeLabel()}</div>
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
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={
            loading ||
            (!isToolSetMode && !toolItemId) ||
            (destination === 'site' && !toSiteId)
          }
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? '登録中...'
            : isToolSetMode
            ? `セット一括移動 (${toolSetItems.length}個)`
            : '登録する'}
        </button>
        <Link
          href="/movements"
          className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium text-center"
        >
          キャンセル
        </Link>
      </div>
    </form>
  )
}
