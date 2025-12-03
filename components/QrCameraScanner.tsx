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

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              QRコードをカメラに向けてください
            </p>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
