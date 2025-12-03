'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QrCameraScannerProps {
  onScan: (qrCode: string) => void
  onClose: () => void
}

export function QrCameraScanner({ onScan, onClose }: QrCameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanFlash, setScanFlash] = useState(false)
  const [scanCount, setScanCount] = useState(0)

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
          },
          (decodedText) => {
            // スキャン成功時の視覚的フィードバック
            setScanFlash(true)
            setScanCount((prev) => prev + 1)
            setTimeout(() => setScanFlash(false), 300)
            onScan(decodedText)
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">QRコードをスキャン</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* スキャン成功フラッシュ */}
        {scanFlash && (
          <div className="absolute inset-0 bg-green-400 opacity-50 animate-pulse rounded-lg pointer-events-none"></div>
        )}

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            <div className="relative">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
              {scanFlash && (
                <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-ping"></div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 text-center">
                QRコードをカメラに向けてください
              </p>
              {scanCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-center">
                  <span className="font-semibold">{scanCount}個</span>のQRコードを読み取りました
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">
                連続でスキャンできます。完了したら「閉じる」をクリック
              </p>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          閉じる {scanCount > 0 && `(${scanCount}個追加済み)`}
        </button>
      </div>
    </div>
  )
}
