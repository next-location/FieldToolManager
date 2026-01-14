'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export interface QRCodeItem {
  id: string
  qrCode: string
  name: string
  code: string
}

interface BulkQRCodePrintProps {
  items: QRCodeItem[]
  selectedIds: Set<string>
  onClose: () => void
  itemType: '道具' | '消耗品' | '重機'
  qrSize?: number // QRコードサイズ(mm): 20, 25, 30, 50
}

export function BulkQRCodePrint({
  items,
  selectedIds,
  onClose,
  itemType,
  qrSize = 25
}: BulkQRCodePrintProps) {
  const [qrDataUrls, setQrDataUrls] = useState<Map<string, string>>(new Map())
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map())

  const selectedItems = items.filter(item => selectedIds.has(item.id))

  useEffect(() => {
    const generateQRCodes = async () => {
      setIsGenerating(true)
      setQrDataUrls(new Map())
      const dataUrls = new Map<string, string>()

      for (const item of selectedItems) {
        try {
          const canvas = document.createElement('canvas')
          await QRCode.toCanvas(canvas, item.qrCode, {
            width: 200,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          })
          dataUrls.set(item.id, canvas.toDataURL())
        } catch (error) {
          console.error('QRコード生成エラー:', error)
          console.error('QRコード値:', item.qrCode)
        }
      }

      setQrDataUrls(dataUrls)
      setIsGenerating(false)
    }

    if (selectedItems.length > 0) {
      generateQRCodes()
    } else {
      setQrDataUrls(new Map())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, items])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('ポップアップがブロックされました。ブラウザの設定を確認してください。')
      return
    }

    // QRコードサイズに応じて列数を決定
    const columns = qrSize <= 20 ? 4 : qrSize <= 30 ? 3 : 2
    const qrCodesPerPage = 9
    const qrCodesHTML = selectedItems
      .map((item, index) => {
        const dataUrl = qrDataUrls.get(item.id)
        if (!dataUrl) return ''

        return `
          <div class="qr-item">
            <div class="qr-container">
              <div class="qr-type">${itemType}</div>
              <div class="qr-name">${item.name}</div>
              <div class="qr-code-text">${item.code}</div>
              <img src="${dataUrl}" alt="QRコード" class="qr-image" />
            </div>
          </div>
        `
      })
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QRコード一括印刷 - ${itemType}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .page-break {
                page-break-after: always;
              }
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
              background-color: #f3f4f6;
              padding: 10mm;
            }

            .qr-grid {
              display: grid;
              grid-template-columns: repeat(${columns}, 1fr);
              gap: 8mm;
              width: 100%;
              max-width: 190mm;
              margin: 0 auto;
            }

            .qr-item {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .qr-container {
              background: white;
              border: 2px solid #000;
              border-radius: 4px;
              padding: 8px;
              text-align: center;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }

            .qr-type {
              font-size: 9px;
              color: #6b7280;
              margin-bottom: 4px;
              font-weight: 500;
            }

            .qr-name {
              font-size: 11px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 3px;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .qr-code-text {
              font-size: 8px;
              color: #374151;
              margin-bottom: 6px;
              font-family: 'Courier New', monospace;
            }

            .qr-image {
              width: ${qrSize}mm;
              height: ${qrSize}mm;
              margin: 0 auto;
              display: block;
            }

            @media print {
              body {
                background-color: white;
              }
              .qr-container {
                border-radius: 0;
              }
            }

            @media screen {
              .print-info {
                background: #3b82f6;
                color: white;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
              }
              .print-button {
                background: #10b981;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin-right: 10px;
              }
              .print-button:hover {
                background: #059669;
              }
              .close-button {
                background: #6b7280;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
              }
              .close-button:hover {
                background: #4b5563;
              }
            }

            @media print {
              .print-info,
              .print-button,
              .close-button {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-info">
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">
              QRコード ${selectedItems.length}個を印刷
            </p>
            <p style="font-size: 14px;">
              印刷後、点線に沿って切り取ってご使用ください
            </p>
            <div style="margin-top: 16px;">
              <button class="print-button" onclick="window.print()">🖨️ 印刷</button>
              <button class="close-button" onclick="window.close()">✕ 閉じる</button>
            </div>
          </div>

          <div class="qr-grid">
            ${qrCodesHTML}
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
  }

  if (selectedItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">印刷する項目を選択してください</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          閉じる
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          選択中: {selectedItems.length}個
        </h3>
        <p className="text-xs text-blue-700">
          A4サイズに3×3のグリッドで印刷されます。印刷後、切り取ってご使用ください。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded border">
        {selectedItems.slice(0, 9).map((item) => {
          const dataUrl = qrDataUrls.get(item.id)
          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded p-2 text-center">
              <div className="text-xs text-gray-500 mb-1">{itemType}</div>
              <div className="text-xs font-semibold text-gray-900 truncate mb-1">
                {item.name}
              </div>
              <div className="text-xs text-gray-600 mb-2">{item.code}</div>
              {dataUrl && (
                <img src={dataUrl} alt="QR" className="w-20 h-20 mx-auto" />
              )}
            </div>
          )
        })}
        {selectedItems.length > 9 && (
          <div className="col-span-3 text-center text-xs text-gray-500">
            ...他 {selectedItems.length - 9}個
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={handlePrint}
          disabled={isGenerating || qrDataUrls.size !== selectedItems.length}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🖨️ {isGenerating ? '生成中...' : qrDataUrls.size === selectedItems.length ? '印刷プレビュー' : `生成中... (${qrDataUrls.size}/${selectedItems.length})`}
        </button>
      </div>
    </div>
  )
}
