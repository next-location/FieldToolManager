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

  // 勤務時間計算（時間:分）
  const calculateWorkHours = (record: any) => {
    if (!record.clock_in_time || !record.clock_out_time) return '---'

    const clockIn = new Date(record.clock_in_time)
    const clockOut = new Date(record.clock_out_time)
    const diffMs = clockOut.getTime() - clockIn.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return `${hours}:${minutes.toString().padStart(2, '0')}`
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
      <div className="hidden sm:block bg-white shadow sm:rounded-lg p-6">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日付
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                スタッフ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                出勤
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                退勤
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                勤務時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                場所
              </th>
              {isAdminOrManager && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(record.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.user_name}
                  {record.is_manually_edited && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      編集済
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(record.clock_in_time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.clock_out_time ? (
                    formatTime(record.clock_out_time)
                  ) : (
                    <span className="text-green-600 font-medium">勤務中</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {calculateWorkHours(record)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.clock_in_location_type === 'office' && '会社'}
                  {record.clock_in_location_type === 'site' &&
                    `現場: ${record.clock_in_site_name || '---'}`}
                  {record.clock_in_location_type === 'remote' && 'リモート'}
                </td>
                {isAdminOrManager && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
      </div>

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
