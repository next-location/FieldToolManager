'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeGeneratorProps {
  value: string // UUID or URL
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  includeMargin?: boolean
  toolName?: string
  serialNumber?: string
}

export default function QRCodeGenerator({
  value,
  size = 256,
  level = 'H', // 最高の訂正レベル（30%復元可能）
  includeMargin = true,
  toolName,
  serialNumber,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generateQR = async () => {
      if (!canvasRef.current) return

      try {
        await QRCode.toCanvas(canvasRef.current, value, {
          errorCorrectionLevel: level,
          margin: includeMargin ? 4 : 1,
          width: size,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
        setError(null)
      } catch (err) {
        console.error('QRコード生成エラー:', err)
        setError('QRコードの生成に失敗しました')
      }
    }

    generateQR()
  }, [value, size, level, includeMargin])

  const handleDownload = () => {
    if (!canvasRef.current) return

    // PNG形式でダウンロード
    const url = canvasRef.current.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-${serialNumber || 'code'}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !canvasRef.current) return

    const canvas = canvasRef.current
    const imageUrl = canvas.toDataURL('image/png')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${toolName || 'QRコード'}印刷</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 20px;
                font-family: 'Noto Sans JP', sans-serif;
              }
            }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              background: white;
            }
            .qr-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .qr-serial {
              font-size: 14px;
              color: #666;
              margin-bottom: 15px;
            }
            .qr-image {
              display: block;
              margin: 0 auto;
              width: ${size}px;
              height: ${size}px;
            }
            .qr-text {
              margin-top: 10px;
              font-size: 10px;
              color: #999;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${toolName ? `<div class="qr-title">${toolName}</div>` : ''}
            ${serialNumber ? `<div class="qr-serial">製番: ${serialNumber}</div>` : ''}
            <img src="${imageUrl}" alt="QRコード" class="qr-image" />
            <div class="qr-text">${value}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
  }

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* QRコード表示エリア */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        {(toolName || serialNumber) && (
          <div className="text-center mb-3">
            {toolName && <div className="font-semibold text-sm">{toolName}</div>}
            {serialNumber && (
              <div className="text-xs text-gray-500">製番: {serialNumber}</div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="mx-auto" />
        <div className="mt-2 text-xs text-gray-400 text-center break-all max-w-[256px]">
          {value.substring(0, 40)}
          {value.length > 40 && '...'}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          📥 ダウンロード
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          🖨️ 印刷
        </button>
      </div>

      {/* 技術情報 */}
      <div className="text-xs text-gray-500 text-center">
        <div>訂正レベル: {level} (30%復元可能)</div>
        <div>サイズ: {size}×{size}px</div>
      </div>
    </div>
  )
}
