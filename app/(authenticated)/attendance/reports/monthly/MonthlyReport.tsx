'use client'

import { useState, useEffect } from 'react'

interface StaffStats {
  user_id: string
  user_name: string
  user_email: string
  department: string | null
  total_days: number
  completed_days: number
  incomplete_days: number
  total_work_minutes: number
  total_break_minutes: number
  avg_work_minutes: number
  overtime_days: number
  total_overtime_minutes: number
  holiday_work_days: number
  total_holiday_work_minutes: number
  late_days: number
  early_leave_days: number
  manually_edited_days: number
}

interface Summary {
  period: string
  start_date: string
  end_date: string
  total_staff: number
  total_attendance_days: number
  total_work_hours: number
  avg_work_hours_per_staff: number
}

export default function MonthlyReport() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [staffStats, setStaffStats] = useState<StaffStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchReport()
  }, [year, month])

  const fetchReport = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch(
        `/api/attendance/reports/monthly?year=${year}&month=${month}`
      )
      const data = await response.json()

      if (response.ok) {
        setSummary(data.summary)
        setStaffStats(data.staff_stats || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'レポートの取得に失敗しました' })
      }
    } catch (error) {
      console.error('レポート取得エラー:', error)
      setMessage({ type: 'error', text: 'レポートの取得に失敗しました' })
    } finally {
      setIsLoading(false)
    }
  }

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}時間${mins}分`
  }

  const handleExportCSV = () => {
    if (!staffStats || staffStats.length === 0) return

    // CSVヘッダー
    const headers = [
      'スタッフ名',
      '部署',
      '出勤日数',
      '退勤完了',
      '退勤未完了',
      '総勤務時間',
      '総休憩時間',
      '平均勤務時間',
      '残業日数',
      '総残業時間',
      '休日出勤日数',
      '休日出勤時間',
      '遅刻日数',
      '早退日数',
      '手動修正日数',
    ]

    // CSVデータ作成
    const csvData = staffStats.map((stats) => [
      stats.user_name,
      stats.department || '',
      stats.total_days,
      stats.completed_days,
      stats.incomplete_days,
      formatMinutes(stats.total_work_minutes),
      formatMinutes(stats.total_break_minutes),
      formatMinutes(stats.avg_work_minutes),
      stats.overtime_days,
      formatMinutes(stats.total_overtime_minutes),
      stats.holiday_work_days,
      formatMinutes(stats.total_holiday_work_minutes),
      stats.late_days,
      stats.early_leave_days,
      stats.manually_edited_days,
    ])

    // CSV文字列生成
    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // BOM付きでダウンロード（Excel対応）
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `月次勤怠レポート_${year}年${month}月.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setMessage({ type: 'success', text: 'CSVファイルをダウンロードしました' })
  }

  return (
    <div className="space-y-6">
      {/* メッセージ表示 */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 年月選択 */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">対象年月</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!staffStats || staffStats.length === 0}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            CSVエクスポート
          </button>
        </div>
      </div>

      {/* サマリー */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">総スタッフ数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total_staff}人</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">総出勤日数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total_attendance_days}日</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">総勤務時間</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total_work_hours}h</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">平均勤務時間/人</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary.avg_work_hours_per_staff}h</p>
          </div>
        </div>
      )}

      {/* スタッフ別統計テーブル */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">読み込み中...</p>
        </div>
      ) : staffStats.length === 0 ? (
        <div className="rounded-lg bg-white p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">選択した期間の勤怠データがありません</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    スタッフ
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    出勤日数
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    勤務時間
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    休憩時間
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    残業
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    休日出勤
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                    遅刻/早退
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffStats.map((stats) => (
                  <tr key={stats.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{stats.user_name}</span>
                        {stats.department && (
                          <span className="text-xs text-gray-500">{stats.department}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{stats.total_days}日</span>
                        <span className="text-xs text-gray-500">完了 {stats.completed_days}/{stats.incomplete_days}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-right">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{formatMinutes(stats.total_work_minutes)}</span>
                        <span className="text-xs text-gray-500">平均 {formatMinutes(stats.avg_work_minutes)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-gray-600">
                      {formatMinutes(stats.total_break_minutes)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      <div className="flex flex-col gap-1">
                        {stats.overtime_days > 0 ? (
                          <>
                            <span className="inline-block rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                              {stats.overtime_days}日
                            </span>
                            <span className="text-xs text-gray-600">{formatMinutes(stats.total_overtime_minutes)}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      <div className="flex flex-col gap-1">
                        {stats.holiday_work_days > 0 ? (
                          <>
                            <span className="inline-block rounded-full bg-pink-100 px-2 py-1 text-xs font-medium text-pink-800">
                              {stats.holiday_work_days}日
                            </span>
                            <span className="text-xs text-gray-600">{formatMinutes(stats.total_holiday_work_minutes)}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-center text-gray-600">
                      {stats.late_days}/{stats.early_leave_days}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
