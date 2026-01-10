'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, CameraDevice } from 'html5-qrcode'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, X } from 'lucide-react'

type ScanMode = 'bulk' | 'info' | 'inventory' | 'location'

interface QRScannerMobileProps {
  mode: ScanMode
  onClose?: () => void
}

interface ScannedItem {
  id: string
  qrCode: string
  name: string
  serialNumber?: string
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
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingQrRef = useRef<boolean>(false) // QR処理中フラグ
  const scannedQrCodesRef = useRef<Set<string>>(new Set()) // スキャン済みQRコードのSet
  const lastScannedRef = useRef<string | null>(null) // 最後にスキャンしたQRコード
  const lastScannedTimeRef = useRef<number>(0) // 最後にスキャンした時刻
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
    // データベースから道具情報を取得
    const { data: toolItem, error: itemError } = await supabase
      .from('tool_items')
      .select(`
        id,
        serial_number,
        tool_id,
        tools!inner (
          id,
          name
        )
      `)
      .eq('qr_code', qrCode)
      .is('deleted_at', null)
      .single()

    if (itemError || !toolItem) {
      console.error('道具アイテムが見つかりません:', itemError)
      return
    }

    const newItem: ScannedItem = {
      id: toolItem.id,
      qrCode,
      name: (toolItem as any).tools?.name || '不明な道具',
      serialNumber: toolItem.serial_number,
      timestamp: new Date()
    }

    setScannedItems(prev => [...prev, newItem])
    setLastScannedItem(newItem) // 最後にスキャンしたアイテムを記録
  }

  const handleSingleScan = async (qrCode: string) => {
    // 単体スキャンの場合は即座に詳細ページへ
    await stopScanning()

    const { data: toolItem } = await supabase
      .from('tool_items')
      .select('id')
      .eq('qr_code', qrCode)
      .is('deleted_at', null)
      .single()

    if (toolItem) {
      router.push(`/tool-items/${toolItem.id}`)
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
      case 'inventory': return '在庫確認'
      case 'location': return '倉庫/現場確認'
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
        <div className="w-6" /> {/* バランス用のスペーサー */}
      </div>

      {/* カメラビュー */}
      <div className="flex-1 relative bg-black">
        <div id="qr-reader-mobile" className="h-full" />

        {/* スキャン成功時の視覚的フィードバック */}
        {scanSuccess && (
          <>
            <div className="absolute inset-0 bg-green-500 opacity-30 pointer-events-none transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
          <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 読み込み中 */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>カメラを起動中...</p>
            </div>
          </div>
        )}

        {/* QRコード枠のガイド */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-white rounded-lg opacity-50">
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
        <div className="bg-white border-t flex flex-col">
          {/* スキャン数 + 最後にスキャンしたアイテム */}
          <div className="bg-gray-50 px-4 pt-3 pb-20 border-b flex-shrink-0">
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
          <div className="p-4 flex-shrink-0">
            <button
              onClick={handleComplete}
              disabled={scannedItems.length === 0}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
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
        // その他のモード（info、inventory、location）用の下部UI
        <div className="bg-white border-t p-4">
          <p className="text-center text-gray-600 text-sm">
            {mode === 'info' && '道具のQRコードをスキャンしてください'}
            {mode === 'inventory' && '在庫確認するQRコードをスキャンしてください'}
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
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
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
          </div>
        </div>
      )}
    </div>
  )
}