'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, CameraDevice } from 'html5-qrcode'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, X } from 'lucide-react'

type ScanMode = 'bulk' | 'info' | 'location'

interface QRScannerMobileProps {
  mode: ScanMode
  onClose?: () => void
}

interface ScannedItem {
  id: string
  qrCode: string
  name: string
  serialNumber?: string
  currentLocation: string // 道具の現在地（warehouse, site, lost）
  siteId?: string // 現場の場合、どの現場か
  timestamp: Date
}

export function QRScannerMobile({ mode, onClose }: QRScannerMobileProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false) // スキャン成功フラグ
  const [lastScannedItem, setLastScannedItem] = useState<ScannedItem | null>(null) // 最後にスキャンしたアイテム
  const [isListExpanded, setIsListExpanded] = useState(false) // 一覧の展開状態
  const [bottomAreaHeight, setBottomAreaHeight] = useState(0) // 下部エリアの高さ
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingQrRef = useRef<boolean>(false) // QR処理中フラグ
  const scannedQrCodesRef = useRef<Set<string>>(new Set()) // スキャン済みQRコードのSet
  const lastScannedRef = useRef<string | null>(null) // 最後にスキャンしたQRコード
  const lastScannedTimeRef = useRef<number>(0) // 最後にスキャンした時刻
  const bottomAreaRef = useRef<HTMLDivElement | null>(null) // 下部エリアのref
  const router = useRouter()
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 注: bulkモードでは同じQRを複数回スキャンする必要はない
  // 一度スキャンしたQRは scannedItems に追加され、重複チェックで弾かれる

  // モバイル判定
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // コンポーネントマウント時に自動でカメラを起動
  useEffect(() => {
    if (isMobile) {
      // 少し遅延を入れてからカメラを起動（画面描画を優先）
      const timer = setTimeout(() => {
        startScanning()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setIsProcessing(true)

      // HTTPS接続チェック
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError('セキュリティ上の理由により、HTTPS接続でのみカメラを使用できます。')
        setIsProcessing(false)
        return
      }

      const scanner = new Html5Qrcode('qr-reader-mobile')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // 背面カメラを使用
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: window.innerHeight / window.innerWidth, // スマホの画面比率に合わせる
          disableFlip: true, // 反転スキャンを無効化（点滅防止）
        },
        async (decodedText) => {
          // 処理中は新しいスキャンを無視
          if (processingQrRef.current) {
            return
          }

          // 既にスキャン済みかチェック（Setで即座に判定）
          if (scannedQrCodesRef.current.has(decodedText)) {
            return // 既にスキャン済みの場合は無視
          }

          // 単一モードでは同じQRの再スキャンを防ぐ
          if (mode !== 'bulk' && lastScannedRef.current === decodedText) {
            return
          }

          // 処理中フラグを立てる
          processingQrRef.current = true
          if (mode !== 'bulk') {
            lastScannedRef.current = decodedText
          }

          // スキャン済みSetに追加（bulkモードのみ）
          if (mode === 'bulk') {
            scannedQrCodesRef.current.add(decodedText)
          }

          // スキャン成功フィードバック
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }
          playBeep()

          // 視覚的フィードバック（画面全体が緑に光る）
          setScanSuccess(true)
          setTimeout(() => setScanSuccess(false), 300)

          try {
            // mode === 'bulk' の場合は連続スキャン
            if (mode === 'bulk') {
              await addScannedItem(decodedText)
              // bulkモードでは処理完了後に再スキャン可能にする
              processingQrRef.current = false
            } else {
              // その他のモードは即座に遷移（処理中フラグは解除しない）
              await handleSingleScan(decodedText)
            }
          } catch (error) {
            console.error('QRスキャン処理エラー:', error)
            processingQrRef.current = false
          }
        },
        (errorMessage) => {
          // スキャンエラーは無視（通常の動作）
        }
      )

      setIsScanning(true)
      setIsProcessing(false)
    } catch (err) {
      console.error('カメラ起動エラー:', err)
      setError('カメラの起動に失敗しました。')
      setIsProcessing(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
        setIsScanning(false)
      } catch (err) {
        console.error('スキャン停止エラー:', err)
      }
    }
  }

  const playBeep = () => {
    // ビープ音を再生（実装は簡略化）
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl7yvLYgjMGHm7A7+OZURE')
      audio.volume = 0.1
      audio.play()
    } catch (e) {
      console.error('音声再生エラー:', e)
    }
  }

  const addScannedItem = async (qrCode: string) => {
    // 現在のユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) return

    // データベースから道具情報を取得（組織IDでフィルタ）
    const { data: toolItem, error: itemError } = await supabase
      .from('tool_items')
      .select(`
        id,
        serial_number,
        tool_id,
        current_location,
        site_id,
        tools!inner (
          id,
          name
        )
      `)
      .eq('qr_code', qrCode)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (itemError || !toolItem) {
      console.error('道具アイテムが見つかりません:', itemError)
      return
    }

    // セット登録チェック
    const { data: toolSetItem } = await supabase
      .from('tool_set_items')
      .select(`
        tool_set_id,
        tool_sets!inner (
          id,
          name
        )
      `)
      .eq('tool_item_id', toolItem.id)
      .single()

    if (toolSetItem) {
      const toolSetName = (toolSetItem as any).tool_sets?.name || '不明'
      const canRemoveFromSet = userData.role === 'admin' || userData.role === 'manager' || userData.role === 'leader'

      if (!canRemoveFromSet) {
        // 一般スタッフ：選択不可
        setError(`この道具はセット「${toolSetName}」に登録されています。個別移動はできません。`)
        setTimeout(() => setError(null), 5000)
        return
      } else {
        // リーダー以上：確認ダイアログ
        const confirmed = window.confirm(
          `この道具はセット「${toolSetName}」に登録されています。\n\nセットから解除して個別移動しますか？`
        )
        if (!confirmed) {
          return
        }

        // セットから解除
        const { error: removeError } = await supabase
          .from('tool_set_items')
          .delete()
          .eq('tool_item_id', toolItem.id)

        if (removeError) {
          setError(`セット解除に失敗しました: ${removeError.message}`)
          setTimeout(() => setError(null), 5000)
          return
        }
      }
    }

    // 現在地の一貫性チェック
    if (scannedItems.length > 0) {
      const firstItem = scannedItems[0]
      const firstItemLocation = firstItem.currentLocation

      // 現在地が異なる場合はエラー
      if (toolItem.current_location !== firstItemLocation) {
        const locationNames: Record<string, string> = {
          warehouse: '倉庫',
          site: '現場',
          lost: '紛失'
        }
        const firstLocationName = locationNames[firstItemLocation] || firstItemLocation
        const currentLocationName = locationNames[toolItem.current_location] || toolItem.current_location

        setError(
          `現在地が異なる道具は同時に選択できません。\n\n` +
          `選択済み: ${firstLocationName}\n` +
          `スキャンした道具: ${currentLocationName}\n\n` +
          `同じ場所にある道具のみスキャンしてください。`
        )
        setTimeout(() => setError(null), 7000)
        return
      }

      // 現場の場合、同じ現場かチェック
      if (toolItem.current_location === 'site') {
        if (toolItem.site_id !== firstItem.siteId) {
          setError(
            `異なる現場の道具は同時に選択できません。\n\n` +
            `同じ現場にある道具のみスキャンしてください。`
          )
          setTimeout(() => setError(null), 7000)
          return
        }
      }
    }

    const newItem: ScannedItem = {
      id: toolItem.id,
      qrCode,
      name: (toolItem as any).tools?.name || '不明な道具',
      serialNumber: toolItem.serial_number,
      currentLocation: toolItem.current_location,
      siteId: toolItem.site_id || undefined,
      timestamp: new Date()
    }

    setScannedItems(prev => [...prev, newItem])
    setLastScannedItem(newItem) // 最後にスキャンしたアイテムを記録
  }

  const handleSingleScan = async (qrCode: string) => {
    // 単体スキャンの場合は即座に詳細ページへ
    await stopScanning()

    // locationモードの場合は現場または倉庫を検索
    if (mode === 'location') {
      // 現場を検索
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('qr_code', qrCode)
        .is('deleted_at', null)
        .single()

      if (site) {
        router.push(`/sites/${site.id}`)
        return
      }

      // 倉庫位置を検索
      const { data: location } = await supabase
        .from('warehouse_locations')
        .select('id')
        .eq('qr_code', qrCode)
        .is('deleted_at', null)
        .single()

      if (location) {
        router.push(`/warehouse-locations/${location.id}`)
        return
      }

      // どちらも見つからない
      setError('現場または倉庫位置のQRコードが見つかりませんでした')
      setTimeout(() => setError(null), 3000)
      return
    }

    // 道具モードの場合は個別アイテムを検索
    const { data: toolItem } = await supabase
      .from('tool_items')
      .select('id')
      .eq('qr_code', qrCode)
      .is('deleted_at', null)
      .single()

    if (toolItem) {
      router.push(`/tool-items/${toolItem.id}`)
    } else {
      setError('道具が見つかりませんでした')
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleComplete = async () => {
    if (scannedItems.length === 0) return

    await stopScanning()

    // 移動先選択画面へ遷移（スキャンしたアイテムIDを渡す）
    const itemIds = scannedItems.map(item => item.id).join(',')
    router.push(`/movements/bulk?items=${itemIds}`)
  }

  const removeScannedItem = (qrCode: string) => {
    setScannedItems(prev => prev.filter(item => item.qrCode !== qrCode))
    scannedQrCodesRef.current.delete(qrCode) // Setからも削除
  }

  // 下部エリアの高さを測定
  useEffect(() => {
    if (bottomAreaRef.current && mode === 'bulk') {
      const updateHeight = () => {
        const height = bottomAreaRef.current?.offsetHeight || 0
        setBottomAreaHeight(height)
      }
      updateHeight()
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
  }, [mode, lastScannedItem])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  const getModeTitle = () => {
    switch (mode) {
      case 'bulk': return '道具を移動'
      case 'info': return '道具確認'
      case 'location': return '倉庫/現場確認'
      default: return 'QRスキャン'
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ paddingBottom: mode === 'bulk' ? `${bottomAreaHeight}px` : '0' }}>
      {/* html5-qrcodeの点滅するボーダーを無効化 */}
      <style jsx global>{`
        /* 全ての枠線・アウトラインを無効化 */
        #qr-reader-mobile,
        #qr-reader-mobile *,
        #qr-reader-mobile video,
        #qr-reader-mobile__scan_region,
        #qr-reader-mobile__scan_region video,
        #qr-reader-mobile__dashboard,
        #qr-reader-mobile__dashboard_section,
        #qr-reader-mobile__camera_selection {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        /* アニメーションも無効化 */
        #qr-reader-mobile *,
        #qr-reader-mobile video {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* ヘッダー（最小限） */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button onClick={onClose || (() => router.back())} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-medium">{getModeTitle()}</h1>
        <button onClick={onClose || (() => router.back())} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* カメラビュー */}
      <div className="flex-1 relative bg-black">
        <div id="qr-reader-mobile" className="h-full" />

        {/* 半透明黒オーバーレイ（QR枠以外を覆う） */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* 上部 */}
            <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: 'calc(50% - 128px)' }} />
            {/* 左側 */}
            <div className="absolute left-0 bg-black/60" style={{ top: 'calc(50% - 128px)', width: 'calc(50% - 128px)', height: '256px' }} />
            {/* 右側 */}
            <div className="absolute right-0 bg-black/60" style={{ top: 'calc(50% - 128px)', width: 'calc(50% - 128px)', height: '256px' }} />
            {/* 下部 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: 'calc(50% - 128px)' }} />
          </div>
        )}

        {/* 右上に閉じるボタン（カメラビュー内の上部に配置） */}
        {isScanning && (
          <button
            onClick={onClose || (() => router.back())}
            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        {/* スキャン成功時の視覚的フィードバック */}
        {scanSuccess && (
          <>
            <div className="absolute inset-0 bg-green-500 opacity-30 pointer-events-none transition-opacity duration-300 z-20" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="bg-green-500 rounded-full p-8 animate-ping">
                <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="absolute top-16 left-4 right-4 bg-red-500 text-white p-3 rounded-lg z-30">
            {error}
          </div>
        )}

        {/* 読み込み中 */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p>カメラを起動中...</p>
            </div>
          </div>
        )}

        {/* QRコード枠のガイド */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-64 h-64 border-2 border-white rounded-lg">
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
            </div>
          </div>
        )}
      </div>

      {/* ステータスバー + スキャン済み情報（固定表示） */}
      {mode === 'bulk' ? (
        <div ref={bottomAreaRef} className="fixed bottom-0 left-0 right-0 bg-white border-t flex flex-col z-40" style={{ paddingBottom: '10px' }}>
          {/* スキャン数 + 最後にスキャンしたアイテム */}
          <div className="bg-gray-50 px-4 pt-3 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                スキャン済み: <span className="text-blue-600 text-lg font-bold">{scannedItems.length}</span>個
              </p>
              <button
                onClick={() => setIsListExpanded(!isListExpanded)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {isListExpanded ? '一覧を閉じる' : '一覧を表示'}
              </button>
            </div>

            {/* 最後にスキャンしたアイテム */}
            {lastScannedItem && (
              <div className="bg-white border border-green-200 rounded-lg p-3 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 text-xl">✓</span>
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900">{lastScannedItem.name}</p>
                    {lastScannedItem.serialNumber && (
                      <p className="text-sm text-gray-500">#{lastScannedItem.serialNumber}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 font-medium">最新</span>
                </div>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="px-4 py-2 flex-shrink-0">
            <button
              onClick={handleComplete}
              disabled={scannedItems.length === 0}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium ${
                scannedItems.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              完了して移動先を選ぶ
            </button>
          </div>
        </div>
      ) : (
        // その他のモード（info、location）用の下部UI
        <div className="bg-white border-t p-4">
          <p className="text-center text-gray-600 text-sm">
            {mode === 'info' && '道具のQRコードをスキャンしてください'}
            {mode === 'location' && '倉庫や現場のQRコードをスキャンしてください'}
          </p>
        </div>
      )}

      {/* スキャン済み一覧（全画面オーバーレイ） */}
      {isListExpanded && mode === 'bulk' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl shadow-2xl" style={{ maxHeight: '80vh' }}>
            {/* ヘッダー */}
            <div className="bg-gray-50 px-4 py-3 border-b rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                スキャン済み一覧 ({scannedItems.length}個)
              </h3>
              <button
                onClick={() => setIsListExpanded(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* リスト */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              {scannedItems.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">
                  QRコードをスキャンしてください
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {scannedItems.slice().reverse().map((item) => (
                    <li key={item.qrCode} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-green-500 text-xl">✓</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {item.serialNumber && (
                            <p className="text-xs text-gray-500">シリアル: #{item.serialNumber}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeScannedItem(item.qrCode)}
                        className="text-gray-400 hover:text-red-500 p-2"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 一覧画面のアクションボタン */}
            <div className="px-4 py-3 border-t bg-white">
              <button
                onClick={handleComplete}
                disabled={scannedItems.length === 0}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium ${
                  scannedItems.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                完了して移動先を選ぶ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}