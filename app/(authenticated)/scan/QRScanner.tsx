'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, CameraDevice } from 'html5-qrcode'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ScanMode = 'single' | 'bulk' | 'info' | 'inventory' | 'location'

interface QRScannerProps {
  mode?: ScanMode
}

export function QRScanner({ mode = 'single' }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // コンポーネントマウント時にカメラリストを取得
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          setAvailableCameras(devices)
          // デフォルトで最初のカメラを選択
          setSelectedCameraId(devices[0].id)
        }
      } catch (err) {
        console.error('カメラリスト取得エラー:', err)
      }
    }
    getCameras()
  }, [])

  const startScanning = async () => {
    try {
      setError(null)

      // HTTPS接続チェック
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError('セキュリティ上の理由により、HTTPS接続でのみカメラを使用できます。')
        return
      }

      // カメラ権限の明示的な要求
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // 権限取得後、即座にストリームを停止
        stream.getTracks().forEach(track => track.stop())
      } catch (permissionError) {
        console.error('カメラ権限エラー:', permissionError)
        if (permissionError instanceof Error) {
          if (permissionError.name === 'NotAllowedError') {
            setError('カメラへのアクセスが拒否されました。ブラウザの設定でカメラへのアクセスを許可してください。')
          } else if (permissionError.name === 'NotFoundError') {
            setError('カメラが見つかりません。PCにカメラが接続されていることを確認してください。')
          } else {
            setError(`カメラの権限エラー: ${permissionError.message}`)
          }
        }
        return
      }

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      // カメラ設定を調整
      const cameraConfig = selectedCameraId
        ? { deviceId: selectedCameraId }
        : { facingMode: 'environment' } // デフォルトは背面カメラ（モバイル向け）

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // QRコードをスキャン成功
          console.log('QRコード検出:', decodedText)

          // スキャンを停止
          await stopScanning()

          // QRコードから個別アイテムを検索
          const { data: toolItem, error: itemError } = await supabase
            .from('tool_items')
            .select(
              `
              id,
              serial_number,
              tool_id,
              tools (
                id,
                name
              )
            `
            )
            .eq('qr_code', decodedText)
            .is('deleted_at', null)
            .single()

          if (itemError || !toolItem) {
            console.error('道具アイテムが見つかりません:', itemError)
            setError('QRコードに対応する道具が見つかりませんでした')
            return
          }

          console.log('道具アイテム発見:', toolItem)
          console.log('リダイレクト先:', `/tool-items/${toolItem.id}`)

          // 個別アイテム詳細ページへリダイレクト
          router.push(`/tool-items/${toolItem.id}`)
        },
        (errorMessage) => {
          // スキャンエラー（通常は無視）
          // console.log('Scan error:', errorMessage)
        }
      )

      setIsScanning(true)
    } catch (err) {
      console.error('カメラ起動エラー:', err)
      if (err instanceof Error) {
        // より詳細なエラーメッセージ
        if (err.message.includes('NotAllowed')) {
          setError('カメラへのアクセスが拒否されました。ブラウザのアドレスバーにあるカメラアイコンをクリックして、アクセスを許可してください。')
        } else if (err.message.includes('NotFound')) {
          setError('カメラが見つかりません。PCにカメラが接続されていることを確認してください。')
        } else if (err.message.includes('NotReadableError')) {
          setError('カメラが他のアプリケーションで使用中です。他のアプリケーションを終了してから再試行してください。')
        } else {
          setError(`カメラの起動に失敗しました: ${err.message}`)
        }
      } else {
        setError('カメラの起動に失敗しました。カメラへのアクセスを許可してください。')
      }
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

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* カメラ選択（複数カメラがある場合のみ表示） */}
      {availableCameras.length > 1 && !isScanning && (
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 mb-2">
              使用するカメラを選択
            </label>
            <select
              id="camera-select"
              value={selectedCameraId || ''}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {availableCameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `カメラ ${camera.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div
        id="qr-reader"
        className="w-full max-w-md mx-auto border-2 border-gray-300 rounded-lg overflow-hidden"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
          {/* HTTPS関連のヘルプ */}
          {error.includes('HTTPS') && (
            <div className="mt-2 text-sm">
              <p className="font-semibold">解決方法：</p>
              <ul className="list-disc list-inside mt-1">
                <li>URLが https:// で始まることを確認してください</li>
                <li>または、localhost でアクセスしてください</li>
              </ul>
            </div>
          )}
          {/* カメラ権限関連のヘルプ */}
          {error.includes('アクセスが拒否') && (
            <div className="mt-2 text-sm">
              <p className="font-semibold">解決方法：</p>
              <ul className="list-disc list-inside mt-1">
                <li>ブラウザのアドレスバーにあるカメラアイコンをクリック</li>
                <li>「カメラへのアクセスを許可」を選択</li>
                <li>ページを再読み込みしてください</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center space-x-4">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            スキャン開始
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            スキャン停止
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600 text-center space-y-2">
        <p>カメラでQRコードをスキャンしてください</p>
        <p className="text-xs">QRコードが枠内に入るように調整してください</p>
      </div>
    </div>
  )
}
