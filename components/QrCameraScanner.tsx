'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode } from 'html5-qrcode'

interface QrCameraScannerProps {
  onScan: (qrCode: string) => Promise<{ success: boolean; message?: string }>
  onClose: () => void
}

export function QrCameraScanner({ onScan, onClose }: QrCameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingQrRef = useRef<boolean>(false)
  const scannedQrCodesRef = useRef<Set<string>>(new Set())
  const bottomAreaRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanFlash, setScanFlash] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [lastScannedName, setLastScannedName] = useState<string | null>(null)
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null)
  const [bottomAreaHeight, setBottomAreaHeight] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!mounted) return

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

            try {
              const result = await onScan(decodedText)

              if (result.success) {
                // 成功時
                scannedQrCodesRef.current.add(decodedText)
                setScanFlash(true)
                setScanCount((prev) => prev + 1)
                setLastScannedName(result.message || 'スキャン成功')
                setTimeout(() => setScanFlash(false), 300)
                setLastErrorMessage(null)
              } else {
                // 失敗時
                setLastErrorMessage(result.message || 'エラーが発生しました')
                setTimeout(() => setLastErrorMessage(null), 3000)
              }
            } catch (err) {
              setLastErrorMessage('エラーが発生しました')
              setTimeout(() => setLastErrorMessage(null), 3000)
            } finally {
              // 処理完了後、フラグを下ろす
              processingQrRef.current = false
            }
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
  }, [mounted])

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
  }, [scanCount, lastScannedName, lastErrorMessage])

  if (!mounted) return null

  const scannerContent = (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ paddingBottom: `${bottomAreaHeight}px` }}>
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
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button onClick={onClose} className="p-1">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium">QRコードをスキャン</h1>
        <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-full transition-colors">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* カメラビュー */}
      <div className="flex-1 relative bg-black">
        <div id="qr-reader" className="h-full" />

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
          <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg z-10">
            {error}
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

      {/* ステータスバー + スキャン済み情報（固定表示） - QRScannerMobileのbulkモードと完全一致 */}
      <div ref={bottomAreaRef} className="fixed bottom-0 left-0 right-0 bg-white border-t flex flex-col z-40" style={{ paddingBottom: '10px' }}>
        {/* スキャン数 + 最後にスキャンしたアイテム */}
        <div className="bg-gray-50 px-4 pt-3 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              スキャン済み: <span className="text-blue-600 text-lg font-bold">{scanCount}</span>個
            </p>
          </div>

          {/* 最後にスキャンしたアイテム */}
          {lastScannedName && (
            <div className="bg-white border border-green-200 rounded-lg p-3 mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-500 text-xl">✓</span>
                <div className="flex-1">
                  <p className="text-base font-medium text-gray-900">{lastScannedName}</p>
                </div>
                <span className="text-sm text-gray-400 font-medium">最新</span>
              </div>
            </div>
          )}

          {/* エラーメッセージ */}
          {lastErrorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-red-700 text-center">{lastErrorMessage}</p>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="px-4 py-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            閉じる {scanCount > 0 && `(${scanCount}個追加済み)`}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(scannerContent, document.body)
}
