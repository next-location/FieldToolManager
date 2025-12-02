'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H', // 最高の訂正レベル（30%復元可能）
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (err) => {
        if (err) {
          console.error('QRコード生成エラー:', err)
          setError('QRコードの生成に失敗しました')
        }
      }
    )
  }, [value, size])

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start space-y-2">
      <canvas ref={canvasRef} className="border border-gray-200 rounded" />
      <p className="text-xs text-gray-500">
        スマートフォンのカメラでスキャンできます
      </p>
    </div>
  )
}
