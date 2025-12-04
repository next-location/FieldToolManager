'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodePrintProps {
  value: string
  itemName: string
  itemCode: string
  itemType: '道具' | '消耗品' | '重機' | '倉庫位置'
  size?: number
}

export function QRCodePrint({
  value,
  itemName,
  itemCode,
  itemType,
  size = 200
}: QRCodePrintProps) {
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
          <title>QRコード印刷 - ${itemName}</title>
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
              font-family: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: #f3f4f6;
            }
            .qr-container {
              text-align: center;
              background: white;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
              font-size: 24px;
              font-weight: bold;
              color: #111827;
              margin: 0 0 10px 0;
            }
            .item-type {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .code {
              font-size: 16px;
              color: #374151;
              margin-bottom: 20px;
              font-weight: 600;
            }
            img {
              width: 300px;
              height: 300px;
              margin: 0 auto;
              display: block;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body {
                background-color: white;
              }
              .qr-container {
                box-shadow: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="item-type">${itemType}</div>
            <h1>${itemName}</h1>
            <p class="code">${itemCode}</p>
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
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          QRコードを印刷
        </button>
      </div>
    </div>
  )
}
