'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import AttendanceRecordsMobileMenu from '@/components/attendance/AttendanceRecordsMobileMenu'

interface AttendanceExportButtonProps {
  filters: {
    user_id: string
    start_date: string
    end_date: string
    location_type: string
    site_id: string
  }
  mobileMenuOnly?: boolean
}

export function AttendanceExportButton({
  filters,
  mobileMenuOnly = false,
}: AttendanceExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)

    try {
      // フィルターをクエリパラメータに変換
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.location_type) params.append('location_type', filters.location_type)
      if (filters.site_id) params.append('site_id', filters.site_id)

      const response = await fetch(`/api/attendance/records/export?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'エクスポートに失敗しました')
      }

      // ファイルをダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`
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

  // モバイルメニューモード
  if (mobileMenuOnly) {
    return (
      <AttendanceRecordsMobileMenu
        onExport={handleExport}
        exporting={exporting}
      />
    )
  }

  // PC版のボタン
  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center"
    >
      <Download className="h-4 w-4 mr-2" />
      {exporting ? 'エクスポート中...' : 'CSVエクスポート'}
    </button>
  )
}
