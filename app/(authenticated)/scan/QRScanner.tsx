'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const startScanning = async () => {
    try {
      setError(null)
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' }, // 背面カメラを使用
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
      setError('カメラの起動に失敗しました。カメラへのアクセスを許可してください。')
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
      <div
        id="qr-reader"
        className="w-full max-w-md mx-auto border-2 border-gray-300 rounded-lg overflow-hidden"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
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
