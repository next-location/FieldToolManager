'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, CameraDevice } from 'html5-qrcode'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, X } from 'lucide-react'

type ScanMode = 'tool' | 'equipment'

interface QRScannerMobileProps {
  mode: ScanMode
  onClose?: () => void
}

export function QRScannerMobile({ mode, onClose }: QRScannerMobileProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingQrRef = useRef<boolean>(false) // QR処理中フラグ
  const lastScannedRef = useRef<string | null>(null) // 最後にスキャンしたQRコード
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

          // 同じQRの再スキャンを防ぐ
          if (lastScannedRef.current === decodedText) {
            return
          }

          // 処理中フラグを立てる
          processingQrRef.current = true
          lastScannedRef.current = decodedText

          // スキャン成功フィードバック
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }
          playBeep()

          try {
            console.log('[QR Scanner] Mode:', mode, 'QR Code:', decodedText)
            await handleSingleScan(decodedText)
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

  const handleSingleScan = async (qrCode: string) => {
    await stopScanning()

    const supabase = createClient()

    if (mode === 'tool') {
      // 道具のQRコードを検索
      const { data: toolItem, error: itemError } = await supabase
        .from('tool_items')
        .select('id')
        .eq('qr_code', qrCode)
        .is('deleted_at', null)
        .single()

      if (itemError || !toolItem) {
        console.error('道具アイテムが見つかりません:', itemError)
        setError('QRコードに対応する道具が見つかりませんでした')
        setTimeout(() => setError(null), 5000)
        return
      }

      // 移動ページへリダイレクト（スキャンしたアイテムIDを渡す）
      router.push(`/movements/bulk?items=${toolItem.id}`)
      return
    }

    if (mode === 'equipment') {
      // 重機のQRコードを検索
      const { data: equipment, error: equipmentError } = await supabase
        .from('heavy_equipment')
        .select('id')
        .eq('qr_code', qrCode)
        .is('deleted_at', null)
        .single()

      if (equipmentError || !equipment) {
        console.error('重機が見つかりません:', equipmentError)
        setError('QRコードに対応する重機が見つかりませんでした')
        setTimeout(() => setError(null), 5000)
        return
      }

      // 重機詳細ページへリダイレクト
      router.push(`/equipment/${equipment.id}`)
      return
    }
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

      {/* 下部ガイドメッセージ */}
      <div className="bg-white border-t p-4">
        <p className="text-center text-gray-600 text-sm">
          {mode === 'tool' && '道具のQRコードをスキャンしてください'}
          {mode === 'equipment' && '重機のQRコードをスキャンしてください'}
        </p>
      </div>
    </div>
  )
}