'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  value: string
  equipmentName: string
  equipmentCode: string
  size?: number
  qrSize?: number // 印刷サイズ(mm)
}

export function QRCodeDisplay({ value, equipmentName, equipmentCode, size = 200, qrSize = 25 }: QRCodeDisplayProps) {
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
        errorCorrectionLevel: 'H',
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
    if (!printWindow) return

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL()

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QRコード印刷 - ${equipmentName}</title>
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
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 8px;
              background: white;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
              font-weight: bold;
            }
            .code {
              margin: 0 0 20px 0;
              font-size: 18px;
              color: #666;
            }
            img {
              width: ${qrSize}mm;
              height: ${qrSize}mm;
              margin: 20px 0;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${equipmentName}</h1>
            <p class="code">重機コード: ${equipmentCode}</p>
            <img src="${dataUrl}" alt="QRコード" />
            <div class="instructions">
              スマートフォンのカメラでスキャンしてください
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()

    // 画像読み込み後に印刷ダイアログを表示
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
    <div className="flex flex-col items-start space-y-4">
      <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
        <canvas ref={canvasRef} className="rounded" />
      </div>
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          スマートフォンのカメラでスキャンできます
        </p>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          QRコードを印刷
        </button>
      </div>
    </div>
  )
}
