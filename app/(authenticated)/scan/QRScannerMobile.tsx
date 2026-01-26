'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, CameraDevice } from 'html5-qrcode'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, X } from 'lucide-react'

type ScanMode = 'tool' | 'consumable' | 'equipment'

interface QRScannerMobileProps {
  mode: ScanMode
  onClose?: () => void
}

interface ScannedItem {
  id: string
  qrCode: string
  name: string
  serialNumber?: string
  currentLocation?: string
  siteId?: string
}

export function QRScannerMobile({ mode, onClose }: QRScannerMobileProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [lastScannedItem, setLastScannedItem] = useState<ScannedItem | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [isListExpanded, setIsListExpanded] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingQrRef = useRef<boolean>(false) // QR処理中フラグ
  const lastScannedRef = useRef<string | null>(null) // 最後にスキャンしたQRコード
  const scannedQrCodesRef = useRef<Set<string>>(new Set()) // スキャン済みQRコードのSet
  const router = useRouter()
  const supabase = createClient()

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

          // 既にスキャン済みかチェック
          if (scannedQrCodesRef.current.has(decodedText)) {
            return
          }

          // 処理中フラグを立てる
          processingQrRef.current = true

          // スキャン済みSetに追加
          scannedQrCodesRef.current.add(decodedText)

          // スキャン成功フィードバック
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }
          playBeep()

          try {
            console.log('[QR Scanner] Mode:', mode, 'QR Code:', decodedText)
            await addScannedItem(decodedText)
            processingQrRef.current = false
          } catch (error) {
            console.error('QRスキャン処理エラー:', error)
            scannedQrCodesRef.current.delete(decodedText)
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
    if (mode === 'tool') {
      // 道具のQRコードを検索（位置情報も取得）
      const { data: toolItem, error: itemError } = await supabase
        .from('tool_items')
        .select('id, serial_number, tool_id, current_location, current_site_id, tools!inner(id, name)')
        .eq('qr_code', qrCode)
        .is('deleted_at', null)
        .single()

      if (itemError || !toolItem) {
        console.error('道具アイテムが見つかりません:', itemError)
        setError('QRコードに対応する道具が見つかりませんでした')
        setTimeout(() => setError(null), 3000)
        return
      }

      const newItem: ScannedItem = {
        id: toolItem.id,
        qrCode,
        name: (toolItem as any).tools?.name || '不明な道具',
        serialNumber: toolItem.serial_number,
        currentLocation: toolItem.current_location,
        siteId: toolItem.current_site_id || undefined
      }

      // 位置チェック（setStateのコールバックで最新の値を使用）
      setScannedItems(prev => {
        if (prev.length > 0) {
          const firstItem = prev[0]
          const firstItemLocation = firstItem.currentLocation

          // 現在地が異なる場合はエラー
          if (newItem.currentLocation !== firstItemLocation) {
            const locationNames: Record<string, string> = {
              warehouse: '倉庫',
              site: '現場',
              lost: '紛失'
            }
            const firstLocationName = locationNames[firstItemLocation || ''] || firstItemLocation
            const currentLocationName = locationNames[newItem.currentLocation || ''] || newItem.currentLocation

            setError(
              `現在地が異なる道具は同時に選択できません。\n\n` +
              `選択済み: ${firstLocationName}\n` +
              `スキャンした道具: ${currentLocationName}\n\n` +
              `同じ場所にある道具のみスキャンしてください。`
            )
            setTimeout(() => setError(null), 5000)
            return prev // 追加しない
          }

          // 現場の場合、同じ現場かチェック
          if (newItem.currentLocation === 'site' && newItem.siteId !== firstItem.siteId) {
            setError(
              `異なる現場の道具は同時に選択できません。\n\n` +
              `同じ現場にある道具のみスキャンしてください。`
            )
            setTimeout(() => setError(null), 5000)
            return prev // 追加しない
          }
        }

        // チェックOK: 新しいアイテムを追加
        return [...prev, newItem]
      })

      setLastScannedItem(newItem)

      // スキャン成功エフェクト
      setScanSuccess(true)
      setTimeout(() => setScanSuccess(false), 500)
      return
    }

    if (mode === 'consumable') {
      // 消耗品のQRコードを検索（toolsテーブルのmanagement_type = 'consumable'）
      const { data: consumable, error: consumableError } = await supabase
        .from('tools')
        .select('id, name, model_number, unit')
        .eq('qr_code', qrCode)
        .eq('management_type', 'consumable')
        .is('deleted_at', null)
        .single()

      if (consumableError || !consumable) {
        console.error('消耗品が見つかりません:', consumableError)
        setError('QRコードに対応する消耗品が見つかりませんでした')
        setTimeout(() => setError(null), 3000)
        return
      }

      const newItem: ScannedItem = {
        id: consumable.id,
        qrCode,
        name: consumable.name,
        serialNumber: consumable.model_number || undefined
      }

      setScannedItems(prev => [...prev, newItem])
      setLastScannedItem(newItem)

      // スキャン成功エフェクト
      setScanSuccess(true)
      setTimeout(() => setScanSuccess(false), 500)
      return
    }

    if (mode === 'equipment') {
      // 重機のQRコードを検索
      const { data: equipment, error: equipmentError } = await supabase
        .from('heavy_equipment')
        .select('id, name, serial_number')
        .eq('qr_code', qrCode)
        .is('deleted_at', null)
        .single()

      if (equipmentError || !equipment) {
        console.error('重機が見つかりません:', equipmentError)
        setError('QRコードに対応する重機が見つかりませんでした')
        setTimeout(() => setError(null), 3000)
        return
      }

      const newItem: ScannedItem = {
        id: equipment.id,
        qrCode,
        name: equipment.name,
        serialNumber: equipment.serial_number
      }

      setScannedItems(prev => [...prev, newItem])
      setLastScannedItem(newItem)

      // スキャン成功エフェクト
      setScanSuccess(true)
      setTimeout(() => setScanSuccess(false), 500)
      return
    }
  }

  const handleComplete = async () => {
    if (scannedItems.length === 0) return

    await stopScanning()

    if (mode === 'tool') {
      // 道具移動ページへリダイレクト
      const itemIds = scannedItems.map(item => item.id).join(',')
      router.push(`/movements/bulk?items=${itemIds}`)
    } else if (mode === 'consumable') {
      // 消耗品移動ページへリダイレクト
      const consumableIds = scannedItems.map(item => item.id).join(',')
      router.push(`/consumables/bulk-movement?items=${consumableIds}`)
    } else if (mode === 'equipment') {
      // 重機移動ページへリダイレクト
      const equipmentIds = scannedItems.map(item => item.id).join(',')
      router.push(`/equipment/bulk-movement?items=${equipmentIds}`)
    }
  }

  const removeScannedItem = (qrCode: string) => {
    setScannedItems(prev => prev.filter(item => item.qrCode !== qrCode))
    scannedQrCodesRef.current.delete(qrCode)
  }


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
      case 'tool': return '道具移動'
      case 'consumable': return '消耗品移動'
      case 'equipment': return '重機移動'
      default: return 'QRスキャン'
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
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
          margin: 0 !important;
          padding: 0 !important;
        }

        /* アニメーションも無効化 */
        #qr-reader-mobile *,
        #qr-reader-mobile video {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* ヘッダー（最小限） */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button onClick={onClose || (() => router.back())} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-medium">{getModeTitle()}</h1>
          <span className="text-xs opacity-75">[MODE: {mode.toUpperCase()}]</span>
        </div>
        <button onClick={onClose || (() => router.back())} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* カメラビュー */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <div id="qr-reader-mobile" className="w-full h-full" />

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

        {/* スキャン成功エフェクト（緑のフラッシュ） */}
        {scanSuccess && (
          <div className="absolute inset-0 bg-green-500 z-20 animate-pulse pointer-events-none" style={{ opacity: 0.3 }} />
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

      {/* スキャン済みアイテム表示 + 完了ボタン */}
      <div className="bg-white border-t p-4">
        {/* スキャン数表示 + 一覧表示ボタン */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            スキャン済み: <span className="text-blue-600 text-lg font-bold">{scannedItems.length}</span>個
          </p>
          {scannedItems.length > 0 && (
            <button
              onClick={() => setIsListExpanded(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              一覧を表示
            </button>
          )}
        </div>

        {/* 最後にスキャンしたアイテム */}
        {lastScannedItem && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-500 text-xl">✓</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{lastScannedItem.name}</p>
                {lastScannedItem.serialNumber && (
                  <p className="text-xs text-gray-500">#{lastScannedItem.serialNumber}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 font-medium">最新</span>
            </div>
          </div>
        )}

        {/* 完了ボタン */}
        <button
          onClick={handleComplete}
          disabled={scannedItems.length === 0}
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium ${
            scannedItems.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          完了して移動先を選ぶ ({scannedItems.length}個)
        </button>
      </div>

      {/* スキャン済み一覧（全画面オーバーレイ） */}
      {isListExpanded && (
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
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-green-500 text-xl">✓</span>
                        <div className="flex-1">
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
                完了して移動先を選ぶ ({scannedItems.length}個)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}