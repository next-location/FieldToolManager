'use client'

import { useState } from 'react'
import { Download, Menu } from 'lucide-react'

interface MyRecordsHeaderProps {
  userName: string
  userId: string
  isViewingOtherUser: boolean
  currentMonth?: string
}

export function MyRecordsHeader({
  userName,
  userId,
  isViewingOtherUser,
  currentMonth,
}: MyRecordsHeaderProps) {
  const [exporting, setExporting] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setMobileMenuOpen(false)

    try {
      // フィルターをクエリパラメータに変換
      const params = new URLSearchParams()
      params.append('user_id', userId)

      // 月フィルターがある場合は開始日・終了日を追加
      if (currentMonth) {
        const [year, month] = currentMonth.split('-').map(Number)
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      }

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
      const fileName = isViewingOtherUser
        ? `attendance_${userName}_${currentMonth || new Date().toISOString().split('T')[0]}.csv`
        : `attendance_records_${currentMonth || new Date().toISOString().split('T')[0]}.csv`
      a.download = fileName
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
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
          {isViewingOtherUser ? `勤怠履歴 - ${userName}` : '勤怠履歴'}
        </h1>

        {/* PC: エクスポートボタン */}
        <div className="hidden sm:flex">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'エクスポート中...' : 'CSVエクスポート'}
          </button>
        </div>

        {/* モバイル: メニューボタン */}
        <div className="sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        {isViewingOtherUser
          ? `${userName} の出退勤記録を確認できます`
          : 'あなたの出退勤記録を確認できます'}
      </p>

      {/* モバイルメニュー */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 sm:hidden">
            <div className="py-1">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'エクスポート中...' : 'CSVエクスポート'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
