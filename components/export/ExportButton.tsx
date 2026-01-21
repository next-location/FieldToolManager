'use client'

import { useState } from 'react'

interface ExportButtonProps {
  endpoint: string
  filename: string
  label?: string
}

export function ExportButton({ endpoint, filename, label = 'CSVエクスポート' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(endpoint)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'エクスポートに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
    >
      {exporting ? 'エクスポート中...' : label}
    </button>
  )
}
