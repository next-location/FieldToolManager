'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrCameraScannerProps {
  onScan: (qrCode: string) => Promise<{ success: boolean; message?: string }>
  onClose: () => void
}

export function QrCameraScanner({ onScan, onClose }: QrCameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const scanCooldownRef = useRef<boolean>(false)
  const bottomAreaRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanFlash, setScanFlash] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null)
  const [bottomAreaHeight, setBottomAreaHeight] = useState(0)

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: window.innerHeight / window.innerWidth,
            disableFlip: true,
          },
          async (decodedText) => {
            // クールダウン中は無視
            if (scanCooldownRef.current) {
              return
            }

            // 同じQRコードの連続読み取りを防止（1秒以内）
            if (lastScannedRef.current === decodedText) {
              return
            }

            // スキャン処理を実行
            lastScannedRef.current = decodedText
            scanCooldownRef.current = true

            try {
              const result = await onScan(decodedText)

              if (result.success) {
                // 成功時: カウント増加 + 緑フラッシュ
                setScanFlash(true)
                setScanCount((prev) => prev + 1)
                setTimeout(() => setScanFlash(false), 300)
                setLastErrorMessage(null)
              } else {
                // 失敗時: エラーメッセージ表示
                setLastErrorMessage(result.message || 'エラーが発生しました')
                setTimeout(() => setLastErrorMessage(null), 3000)
              }
            } catch (err) {
              setLastErrorMessage('エラーが発生しました')
              setTimeout(() => setLastErrorMessage(null), 3000)
            }

            // 1秒後にクールダウン解除（次のQRコードをスキャン可能に）
            setTimeout(() => {
              scanCooldownRef.current = false
              lastScannedRef.current = null
            }, 1000)
          },
          () => {
            // エラーは無視（スキャン失敗は正常）
          }
        )

        setIsScanning(true)
      } catch (err: any) {
        setError('カメラの起動に失敗しました: ' + err.message)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear()
          })
          .catch(() => {
            // エラーは無視
          })
      }
    }
  }, [])

  // 下部エリアの高さを動的に計算
  useEffect(() => {
    if (bottomAreaRef.current) {
      const updateHeight = () => {
        const height = bottomAreaRef.current?.offsetHeight || 0
        setBottomAreaHeight(height)
      }
      updateHeight()
      window.addEventListener('resize', updateHeight)
      return () => window.removeEventListener('resize', updateHeight)
    }
  }, [scanCount, lastErrorMessage])

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ paddingBottom: `${bottomAreaHeight}px` }}>
      {/* html5-qrcodeの点滅するボーダーを無効化 */}
      <style jsx global>{`
        /* 全ての枠線・アウトラインを無効化 */
        #qr-reader,
        #qr-reader *,
        #qr-reader video,
        #qr-reader__scan_region,
        #qr-reader__scan_region video,
        #qr-reader__dashboard,
        #qr-reader__dashboard_section,
        #qr-reader__camera_selection {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        /* アニメーションも無効化 */
        #qr-reader *,
        #qr-reader video {
          animation: none !important;
          transition: none !important;
        }
      `}</style>

      {/* ヘッダー（最小限） */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="p-1">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium">QRコードをスキャン</h1>
        <div className="w-6" /> {/* バランス用のスペーサー */}
      </div>

      {/* カメラビュー */}
      <div className="flex-1 relative bg-black">
        <div id="qr-reader" className="h-full" />

        {/* スキャン成功時の視覚的フィードバック */}
        {scanFlash && (
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

      {/* 下部情報（固定） */}
      <div ref={bottomAreaRef} className="fixed bottom-0 left-0 right-0 bg-white border-t flex flex-col z-40" style={{ paddingBottom: '10px' }}>
        {scanCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded mx-4 mt-3 text-center">
            <span className="font-semibold">{scanCount}個</span>のQRコードを読み取りました
          </div>
        )}
        {lastErrorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mx-4 mt-3 text-center text-sm">
            {lastErrorMessage}
          </div>
        )}
        <div className="px-4 py-2">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-base"
          >
            閉じる {scanCount > 0 && `(${scanCount}個追加済み)`}
          </button>
        </div>
      </div>
    </div>
  )
}
