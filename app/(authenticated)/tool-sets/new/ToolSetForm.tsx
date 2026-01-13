'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { QrCameraScanner } from '@/components/QrCameraScanner'

type ToolItem = {
  id: string
  serial_number: string
  qr_code: string
  current_location: string
  current_site_id: string | null
  status: string
  tools: {
    id: string
    name: string
    model_number: string | null
    manufacturer: string | null
  } | null
  current_site?: {
    name: string
  }[]
  isRegistered?: boolean
  registeredSetName?: string | null
}

type ToolSetFormProps = {
  toolItems: ToolItem[]
  action: (formData: FormData) => Promise<void>
}

export function ToolSetForm({ toolItems, action }: ToolSetFormProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const selectedItemIdsRef = useRef<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [lastScannedTool, setLastScannedTool] = useState<string | null>(null)
  const [requiredLocation, setRequiredLocation] = useState<string | null>(null)

  // ひらがな・カタカナ変換ヘルパー
  const toHiragana = (str: string): string => {
    return str.replace(/[\u30a1-\u30f6]/g, (match) => {
      const chr = match.charCodeAt(0) - 0x60
      return String.fromCharCode(chr)
    })
  }

  const toKatakana = (str: string): string => {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      const chr = match.charCodeAt(0) + 0x60
      return String.fromCharCode(chr)
    })
  }

  // 検索時にひらがな・カタカナ両方でマッチさせる
  const normalizeForSearch = (text: string): string => {
    const lower = text.toLowerCase()
    const hiragana = toHiragana(lower)
    const katakana = toKatakana(lower)
    return `${lower}|${hiragana}|${katakana}`
  }

  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // スクロールダウン時に縮小
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      } else if (currentScrollY < lastScrollY) {
        setIsScrolled(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const toggleItem = (itemId: string) => {
    const item = toolItems.find(t => t.id === itemId)
    if (!item) return

    if (selectedItemIds.includes(itemId)) {
      // 削除時
      selectedItemIdsRef.current.delete(itemId)
      const newSelected = selectedItemIds.filter((id) => id !== itemId)
      setSelectedItemIds(newSelected)

      // 全て削除された場合は場所制限をリセット
      if (newSelected.length === 0) {
        setRequiredLocation(null)
      }
    } else {
      // 追加時：場所チェック
      if (requiredLocation === null) {
        // 最初の1個：場所を記録
        setRequiredLocation(item.current_location)
        selectedItemIdsRef.current.add(itemId)
        setSelectedItemIds([...selectedItemIds, itemId])
      } else if (item.current_location === requiredLocation) {
        // 2個目以降：同じ場所のみ許可
        selectedItemIdsRef.current.add(itemId)
        setSelectedItemIds([...selectedItemIds, itemId])
      } else {
        // 違う場所：エラー
        const locationName = requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'
        setError(`現在地が異なるため選択できません（セット内は全て${locationName}にある道具のみ）`)
        setTimeout(() => setError(null), 5000)
      }
    }
  }

  // QRコードスキャン処理
  const handleQrScan = async (qrCode: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedQr = qrCode.trim()
    if (!trimmedQr) {
      return { success: false, message: 'QRコードが空です' }
    }

    // QRコードで道具を検索
    const tool = toolItems.find((item) => item.qr_code === trimmedQr)

    if (!tool) {
      setError('QRコードが見つかりません')
      setTimeout(() => setError(null), 3000)
      return { success: false, message: 'QRコードが見つかりません' }
    }

    // 他のセットに登録済みチェック
    if (tool.isRegistered) {
      setError(`この道具は既に「${tool.registeredSetName}」に登録されています`)
      setTimeout(() => setError(null), 3000)
      return { success: false, message: `既に「${tool.registeredSetName}」に登録済み` }
    }

    // Setを使って重複チェック（即座に反映）
    if (selectedItemIdsRef.current.has(tool.id)) {
      setError('この道具は既に選択されています')
      setTimeout(() => setError(null), 3000)
      return { success: false, message: 'この道具は既に選択されています' }
    }

    // 場所チェック
    if (requiredLocation === null) {
      // 最初の1個：場所を記録
      setRequiredLocation(tool.current_location)
    } else if (tool.current_location !== requiredLocation) {
      // 違う場所：エラー
      const locationName = requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'
      setError(`現在地が異なるため追加できません（セット内は全て${locationName}にある道具のみ）`)
      setTimeout(() => setError(null), 5000)
      return { success: false, message: `現在地が異なるため追加できません` }
    }

    // Setに追加（即座に反映）
    selectedItemIdsRef.current.add(tool.id)

    // 状態を更新
    setSelectedItemIds((prev) => [...prev, tool.id])
    setLastScannedTool(`${tool.tools?.name || '不明'} (${tool.serial_number})`)
    setScanSuccess(true)
    setTimeout(() => {
      setScanSuccess(false)
      setLastScannedTool(null)
    }, 2000)

    return { success: true }
  }

  const filteredItems = toolItems.filter((item) => {
    const tool = item.tools
    const searchNormalized = normalizeForSearch(searchTerm)

    const toolNameNormalized = tool?.name ? normalizeForSearch(tool.name) : ''
    const serialNumberNormalized = normalizeForSearch(item.serial_number)
    const modelNumberNormalized = tool?.model_number ? normalizeForSearch(tool.model_number) : ''

    // 検索語の各バリエーション（ひらがな/カタカナ/元の文字）でマッチング
    const searchVariations = searchNormalized.split('|')

    return searchVariations.some(searchVariation =>
      toolNameNormalized.includes(searchVariation) ||
      serialNumberNormalized.includes(searchVariation) ||
      modelNumberNormalized.includes(searchVariation)
    )
  })

  // 道具マスタごとにグループ化
  const groupedItems = filteredItems.reduce((acc, item) => {
    const tool = item.tools
    const key = tool?.id || 'unknown'
    if (!acc[key]) {
      acc[key] = {
        tool: tool,
        items: [],
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { tool: any; items: ToolItem[] }>)

  return (
    <form action={action}>
      <div className="space-y-6">
        {/* セット名 */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            セット名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 基本工具セット、電動工具セット"
          />
        </div>

        {/* 説明 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            説明
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="このセットの用途や内容を説明"
          />
        </div>

        {/* 道具選択 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              道具を選択 <span className="text-red-500">*</span>
              <span className="ml-2 text-sm font-normal text-gray-500">
                （{selectedItemIds.length}個選択中）
              </span>
              {requiredLocation && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  📍 {requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'}のみ
                </span>
              )}
            </label>
          </div>

          {/* QRスキャンボタン */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <p className="text-sm text-gray-600">QRスキャンまたは検索して道具を選択</p>
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              📷 QRコードをスキャン
            </button>
          </div>

          {/* 成功メッセージ */}
          {scanSuccess && lastScannedTool && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2 animate-pulse mb-4">
              <span className="text-2xl">✓</span>
              <div>
                <div className="font-semibold">読み取り成功！</div>
                <div className="text-sm">{lastScannedTool}</div>
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* 検索ボックス */}
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="道具名、型番、シリアル番号で検索..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 個別アイテムのリスト */}
          <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
            {Object.keys(groupedItems).length > 0 ? (
              Object.values(groupedItems).map((group) => (
                <div key={group.tool.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="bg-gray-50 px-4 py-2 font-medium text-gray-900">
                    {group.tool.name}
                    {group.tool.model_number && ` (${group.tool.model_number})`}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => {
                      const currentSite = item.current_site as any
                      const locationText =
                        item.current_location === 'warehouse'
                          ? '倉庫'
                          : item.current_location === 'site'
                          ? currentSite?.name || '現場'
                          : item.current_location === 'repair'
                          ? '修理中'
                          : '不明'

                      const statusColor =
                        item.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'in_use'
                          ? 'bg-blue-100 text-blue-800'
                          : item.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.status === 'lost'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'

                      // 場所チェック：最初に選択した場所と異なる場合は無効化
                      const isWrongLocation = requiredLocation !== null && item.current_location !== requiredLocation
                      const isDisabled = item.isRegistered || isWrongLocation

                      return (
                        <label
                          key={item.id}
                          className={`flex items-center px-4 py-3 ${
                            isDisabled
                              ? 'bg-gray-50 cursor-not-allowed opacity-60'
                              : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => toggleItem(item.id)}
                            disabled={isDisabled}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-medium text-gray-900">
                                #{item.serial_number}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${statusColor}`}
                              >
                                {item.status === 'available'
                                  ? '利用可能'
                                  : item.status === 'in_use'
                                  ? '使用中'
                                  : item.status === 'maintenance'
                                  ? 'メンテナンス'
                                  : item.status === 'lost'
                                  ? '紛失'
                                  : item.status}
                              </span>
                              {item.registeredSetName && (
                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                                  「{item.registeredSetName}」に登録済み
                                </span>
                              )}
                              {isWrongLocation && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                                  異なる場所
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              📍 {locationText}
                            </div>
                            {isWrongLocation && requiredLocation && (
                              <div className="text-xs text-red-600 mt-1">
                                ⚠️ セット内は全て{requiredLocation === 'warehouse' ? '倉庫' : requiredLocation === 'site' ? '現場' : '修理中'}にある道具のみ選択可能
                              </div>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm
                  ? '検索結果が見つかりません'
                  : '道具が登録されていません'}
              </div>
            )}
          </div>

          {/* Hidden inputs for selected tool item IDs */}
          {selectedItemIds.map((itemId) => (
            <input key={itemId} type="hidden" name="tool_item_ids" value={itemId} />
          ))}

          <p className="mt-2 text-[10px] sm:text-xs text-gray-500">
            ※ セットに含める個別アイテムを選択してください（チェックボックス）
          </p>
        </div>

        {/* ボタン - PCのみ表示 */}
        <div className="hidden sm:flex justify-end space-x-3 pt-4">
          <Link
            href="/tool-sets"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={selectedItemIds.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            セットを作成 ({selectedItemIds.length}個)
          </button>
        </div>

        {/* FABボタン - スマホのみ表示 */}
        <button
          type="submit"
          disabled={selectedItemIds.length === 0}
          className={`sm:hidden fixed right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 disabled:opacity-50 disabled:cursor-not-allowed ${
            isScrolled ? 'w-10 h-10 bottom-20' : 'w-14 h-14 bottom-24'
          }`}
          style={{ bottom: isScrolled ? '5rem' : '6rem' }}
          aria-label="セットを作成"
        >
          <Plus className={`${isScrolled ? 'h-5 w-5' : 'h-6 w-6'}`} />
        </button>
      </div>

      {/* QRカメラスキャナー */}
      {showCamera && (
        <QrCameraScanner
          onScan={handleQrScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </form>
  )
}
