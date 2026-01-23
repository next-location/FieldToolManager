'use client'

interface DownloadPdfButtonProps {
  invoiceId: string
}

export function DownloadPdfButton({ invoiceId }: DownloadPdfButtonProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!response.ok) {
        throw new Error('PDF生成に失敗しました')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `請求書_${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF download error:', error)
      alert('PDFのダウンロードに失敗しました')
    }
  }

  return (
    <button
      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
      onClick={handleDownload}
    >
      PDF出力
    </button>
  )
}
