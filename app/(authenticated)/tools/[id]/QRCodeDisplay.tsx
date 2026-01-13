'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  value: string
  size?: number
  toolName?: string
  qrSize?: number // 印刷サイズ(mm)
}

export function QRCodeDisplay({ value, size = 200, toolName, qrSize = 25 }: QRCodeDisplayProps) {
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('ポップアップがブロックされました。ブラウザの設定を確認してください。')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL()

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QRコード印刷 - ${toolName || '道具'}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background-color: #f3f4f6;
            }
            .qr-container {
              text-align: center;
              background: white;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 8px;
            }
            h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 20px 0;
            }
            img {
              width: ${qrSize}mm;
              height: ${qrSize}mm;
              margin: 0 auto;
              display: block;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                background-color: white;
              }
              .qr-container {
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${toolName ? `<h1>${toolName}</h1>` : ''}
            <img src="${dataUrl}" alt="QRコード" />
            <div class="footer">スマートフォンのカメラでスキャンできます</div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

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
      <button
        onClick={handlePrint}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        QRコードを印刷
      </button>
      <p className="text-xs text-gray-500">
        スマートフォンのカメラでスキャンできます
      </p>
    </div>
  )
}
