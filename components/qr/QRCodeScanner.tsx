'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void
  onScanFailure?: (error: string) => void
  width?: number | string
  height?: number | string
  fps?: number
  qrbox?: number | { width: number; height: number }
  aspectRatio?: number
  disableFlip?: boolean
}

export default function QRCodeScanner({
  onScanSuccess,
  onScanFailure,
  width = '100%',
  height = 400,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
  disableFlip = false,
}: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const elementId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`)

  useEffect(() => {
    return () => {
      // クリーンアップ：スキャナーを停止
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear()
          })
          .catch((err) => {
            console.error('スキャナー停止エラー:', err)
          })
      }
    }
  }, [isScanning])

  const startScanning = async () => {
    try {
      setError(null)

      // カメラの権限チェック
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
        setCameraPermission(permissionStatus.state as 'granted' | 'denied' | 'prompt')

        if (permissionStatus.state === 'denied') {
          setError('カメラへのアクセスが拒否されています。ブラウザの設定を確認してください。')
          return
        }
      }

      // Html5Qrcodeのインスタンス作成
      const html5QrCode = new Html5Qrcode(elementId.current)
      scannerRef.current = html5QrCode

      // スキャン設定
      const config = {
        fps,
        qrbox,
        aspectRatio,
        disableFlip,
      }

      // スキャン開始
      await html5QrCode.start(
        { facingMode: 'environment' }, // 背面カメラを使用
        config,
        (decodedText, decodedResult) => {
          onScanSuccess(decodedText, decodedResult)
        },
        (errorMessage) => {
          // スキャン失敗時（通常は無視して良い）
          if (onScanFailure) {
            onScanFailure(errorMessage)
          }
        }
      )

      setIsScanning(true)
    } catch (err: any) {
      console.error('QRコードスキャナー起動エラー:', err)

      if (err.name === 'NotAllowedError') {
        setError('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。')
      } else if (err.name === 'NotFoundError') {
        setError('カメラが見つかりません。デバイスにカメラが接続されているか確認してください。')
      } else {
        setError(`スキャナー起動エラー: ${err.message || '不明なエラー'}`)
      }
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        setIsScanning(false)
      } catch (err) {
        console.error('スキャナー停止エラー:', err)
      }
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* スキャナー表示エリア */}
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ width, height: isScanning ? height : 'auto' }}
      >
        {!isScanning ? (
          <div className="flex items-center justify-center h-64 bg-gray-100">
            <div className="text-center p-6">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              <p className="text-sm text-gray-600">
                QRコードスキャンを開始するには<br />
                下のボタンをクリックしてください
              </p>
            </div>
          </div>
        ) : (
          <>
            <div id={elementId.current} />

            {/* 半透明黒オーバーレイ（QR枠以外を覆う） */}
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

            {/* QRコード枠のガイド */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-64 h-64 border-2 border-white rounded-lg">
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
              </div>
            </div>

            {/* 右上に閉じるボタン */}
            <button
              onClick={stopScanning}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* コントロールボタン */}
      <div className="flex gap-2">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            📷 スキャン開始
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            ⏹️ スキャン停止
          </button>
        )}
      </div>

      {/* ヘルプテキスト */}
      <div className="text-sm text-gray-500 text-center max-w-md">
        <p>💡 QRコードをカメラに映してください</p>
        <p className="mt-1 text-xs">
          スキャンが成功すると自動的に道具情報を読み込みます
        </p>
      </div>

      {/* カメラ権限ステータス */}
      {cameraPermission !== 'granted' && (
        <div className="text-xs text-gray-400">
          カメラの権限: {cameraPermission === 'prompt' ? '未確認' : '拒否'}
        </div>
      )}
    </div>
  )
}
