'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AttendanceRecord } from '@/types/attendance'
import { EditAttendanceModal } from './EditAttendanceModal'

interface Staff {
  id: string
  name: string
  email: string
}

interface Site {
  id: string
  name: string
}

interface AttendanceRecordsTableProps {
  userRole: string
  filters?: {
    user_id: string
    start_date: string
    end_date: string
    location_type: string
    site_id: string
  }
  showStaffName?: boolean
  showStaffSort?: boolean
}

export function AttendanceRecordsTable({
  userRole,
  filters = {
    user_id: '',
    start_date: '',
    end_date: '',
    location_type: '',
    site_id: '',
  },
  showStaffName = true,
  showStaffSort = false,
}: AttendanceRecordsTableProps) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const router = useRouter()

  // 編集モーダル状態
  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [sitesList, setSitesList] = useState<Site[]>([])

  // データ取得
  useEffect(() => {
    fetchRecords()
    fetchSites()
  }, [page, filters])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites')
      if (response.ok) {
        const data = await response.json()
        setSitesList(data)
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error)
    }
  }

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.user_id && { user_id: filters.user_id }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.location_type && { location_type: filters.location_type }),
        ...(filters.site_id && { site_id: filters.site_id }),
      })

      const response = await fetch(`/api/attendance/records?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records)
        setTotalPages(data.total_pages)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoading(false)
    }
  }

  // 勤務時間計算（時間:分）- 休憩時間を差し引く
  const calculateWorkHours = (record: any) => {
    if (!record.clock_in_time || !record.clock_out_time) return '---'

    const clockIn = new Date(record.clock_in_time)
    const clockOut = new Date(record.clock_out_time)
    const diffMs = clockOut.getTime() - clockIn.getTime()
    let diffMinutes = Math.floor(diffMs / (1000 * 60))

    // 休憩時間を差し引く（ユーザー入力 + 自動控除）
    const breakMinutes = (record.break_minutes || 0) + (record.auto_break_deducted_minutes || 0)
    diffMinutes -= breakMinutes

    // マイナスにならないようにする
    if (diffMinutes < 0) diffMinutes = 0

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }

  // 休憩時間の表示（分）
  const formatBreakTime = (record: any) => {
    const breakMinutes = (record.break_minutes || 0) + (record.auto_break_deducted_minutes || 0)
    if (breakMinutes === 0) return '---'
    return `${breakMinutes}分`
  }

  // 残業時間の計算と表示（30分単位切り捨て、勤務パターン基準）
  const calculateOvertimeHours = (record: any) => {
    // シフト制スタッフは手動入力値を表示
    if (record.is_shift_work) {
      const manualOvertimeMinutes = record.manual_overtime_minutes || 0
      if (manualOvertimeMinutes === 0) return '---'

      const hours = Math.floor(manualOvertimeMinutes / 60)
      const minutes = manualOvertimeMinutes % 60
      return `${hours}:${minutes.toString().padStart(2, '0')}`
    }

    if (!record.clock_in_time || !record.clock_out_time || !record.work_pattern) return '---'

    const workPattern = record.work_pattern

    // 遅刻しているかチェック（5分猶予）
    const clockInTime = new Date(record.clock_in_time)
    const clockInHours = clockInTime.getUTCHours() + 9 // JST変換
    const clockInMinutes = clockInTime.getUTCMinutes()
    const clockInTotalMinutes = clockInHours * 60 + clockInMinutes

    const [startHour, startMinute] = workPattern.expected_checkin_time.split(':').map(Number)
    const startTotalMinutes = startHour * 60 + startMinute

    const isLate = clockInTotalMinutes > startTotalMinutes + 5

    // 退勤時刻（分）
    const clockOutTime = new Date(record.clock_out_time)
    const clockOutHours = clockOutTime.getUTCHours() + 9 // JST変換
    const clockOutMinutes = clockOutTime.getUTCMinutes()
    let clockOutTotalMinutes = clockOutHours * 60 + clockOutMinutes

    // 夜勤対応: 退勤時刻が出勤時刻より小さい場合は翌日とみなす
    const [endHour, endMinute] = workPattern.expected_checkout_time.split(':').map(Number)
    const endTotalMinutes = endHour * 60 + endMinute

    if (endTotalMinutes < startTotalMinutes && clockOutTotalMinutes < startTotalMinutes) {
      // 夜勤パターン（22:00-07:00など）で退勤が翌日の場合
      clockOutTotalMinutes += 24 * 60 // 1440分を加算
    }

    // 勤務開始時刻を決定（遅刻していない場合は勤務パターンの開始時刻、遅刻の場合は実打刻時刻）
    const effectiveStartMinutes = isLate ? clockInTotalMinutes : startTotalMinutes

    // 勤務パターンの開始時刻（または実打刻時刻）から退勤時刻までの時間を計算
    const totalWorkMinutes = clockOutTotalMinutes - effectiveStartMinutes

    // 休憩時間を差し引く
    const breakMinutes = (record.break_minutes || 0) + (record.auto_break_deducted_minutes || 0)
    const actualWorkMinutes = Math.max(0, totalWorkMinutes - breakMinutes)

    // 8時間（480分）を超えた分が残業
    if (actualWorkMinutes <= 480) return '---'

    const overtimeMinutes = actualWorkMinutes - 480
    // 30分単位で切り捨て
    const roundedOvertime = Math.floor(overtimeMinutes / 30) * 30

    if (roundedOvertime === 0) return '---'

    const hours = Math.floor(roundedOvertime / 60)
    const minutes = roundedOvertime % 60

    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }

  // 場所の表示（出勤・退勤共通）
  const formatLocation = (locationType: string, siteName: string | null) => {
    if (locationType === 'office') return '会社'
    if (locationType === 'site') return siteName || '現場'
    if (locationType === 'remote') return 'リモート'
    if (locationType === 'direct_home') return '直帰'
    return '---'
  }

  // 時刻フォーマット
  const formatTime = (datetime: string | null) => {
    if (!datetime) return '---'
    return new Date(datetime).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 日付フォーマット
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
  }

  // 編集モーダルを開く
  const handleEdit = (record: any) => {
    setEditingRecord(record)
    setIsEditModalOpen(true)
  }

  // 編集成功後
  const handleEditSuccess = () => {
    fetchRecords()
    router.refresh()
  }

  // 管理者かどうか
  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  if (loading && records.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 件数表示（背景なし） */}
      <div className="mb-4">
        <div className="text-sm text-gray-700">
          全 {total} 件中 {(page - 1) * 50 + 1} 〜{' '}
          {Math.min(page * 50, total)} 件を表示
        </div>
      </div>

      {/* PC: テーブル表示 */}
      <div className="hidden md:block bg-white shadow sm:rounded-lg p-6">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日付
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                スタッフ
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                出勤
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                退勤
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                休憩
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                勤務時間
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                残業時間
              </th>
              {isAdminOrManager && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    {formatDate(record.date)}
                    {record.is_holiday_work && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                        ● 休日出勤
                      </span>
                    )}
                    {record.users?.work_patterns?.is_night_shift && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800" title="夜勤">
                        🌙 夜勤
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span>{record.user_name}</span>
                      {isAdminOrManager && (
                        <button
                          onClick={() => router.push(`/attendance/my-records?user_id=${record.user_id}`)}
                          className="text-xs text-blue-600 hover:text-blue-900 underline"
                        >
                          詳細
                        </button>
                      )}
                      {record.is_manually_edited && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          編集済
                        </span>
                      )}
                    </div>
                    {record.is_manually_edited && record.editor?.name && (
                      <span className="text-xs text-gray-500">
                        編集者: {record.editor.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className="font-medium">{formatTime(record.clock_in_time)}</span>
                    <span className="text-xs text-gray-500">{formatLocation(record.clock_in_location_type, record.clock_in_site_name)}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900">
                  {record.clock_out_time ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{formatTime(record.clock_out_time)}</span>
                      <span className="text-xs text-gray-500">{formatLocation(record.clock_out_location_type, record.clock_out_site_name)}</span>
                    </div>
                  ) : (
                    <span className="text-green-600 font-medium">勤務中</span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {formatBreakTime(record)}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                  {calculateWorkHours(record)}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {calculateOvertimeHours(record)}
                </td>
                {isAdminOrManager && (
                  <td className="px-3 py-3 text-sm text-gray-500">
                    <button
                      onClick={() => handleEdit(record)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      編集
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">勤怠記録がありません</p>
          </div>
        )}
      </div>

      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {record.user_name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatDate(record.date)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {record.is_holiday_work && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                      休日
                    </span>
                  )}
                  {record.users?.work_patterns?.is_night_shift && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                      夜勤
                    </span>
                  )}
                </div>
                {record.is_manually_edited && record.editor?.name && (
                  <div className="text-xs text-gray-500 mt-1">
                    編集者: {record.editor.name}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {!record.clock_out_time && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                    勤務中
                  </span>
                )}
                {record.is_manually_edited && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    編集済
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">出勤</div>
                  <div className="font-medium text-gray-900">{formatTime(record.clock_in_time)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">退勤</div>
                  <div className="font-medium text-gray-900">
                    {record.clock_out_time ? formatTime(record.clock_out_time) : <span className="text-green-600">勤務中</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">休憩</div>
                  <div className="font-medium text-gray-900">{formatBreakTime(record)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">勤務時間</div>
                  <div className="font-medium text-gray-900">{calculateWorkHours(record)}</div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">出勤場所</div>
                    <div className="font-medium text-gray-900">
                      {formatLocation(record.clock_in_location_type, record.clock_in_site_name)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">退勤場所</div>
                    <div className="font-medium text-gray-900">
                      {record.clock_out_time ? formatLocation(record.clock_out_location_type, record.clock_out_site_name) : <span className="text-gray-400">---</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isAdminOrManager && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => router.push(`/attendance/my-records?user_id=${record.user_id}`)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  詳細
                </button>
                <button
                  onClick={() => handleEdit(record)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  編集
                </button>
              </div>
            )}
          </div>
        ))}

        {records.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">勤怠記録がありません</p>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {page} / {totalPages} ページ
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* 編集モーダル */}
      {editingRecord && (
        <EditAttendanceModal
          record={editingRecord}
          sitesList={sitesList}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingRecord(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
