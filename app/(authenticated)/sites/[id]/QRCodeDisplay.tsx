'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  value: string
  size?: number
  label?: string
  qrSize?: number // 印刷サイズ(mm)
}

export function QRCodeDisplay({ value, size = 200, label, qrSize = 25 }: QRCodeDisplayProps) {
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
    const canvas = canvasRef.current
    if (!canvas) return

    const printWindow = window.open('', '', 'width=600,height=600')
    if (!printWindow) return

    const img = canvas.toDataURL('image/png')

    printWindow.document.write(`
      <html>
        <head>
          <title>QRコード印刷 - ${label || '現場'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            img {
              width: ${qrSize}mm;
              height: ${qrSize}mm;
              border: 2px solid #000;
              padding: 20px;
            }
            .label {
              margin-top: 20px;
              font-size: 18px;
              font-weight: bold;
            }
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
            }
          </style>
        </head>
        <body>
          <img src="${img}" alt="QRコード" />
          ${label ? `<div class="label">${label}</div>` : ''}
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `)
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
