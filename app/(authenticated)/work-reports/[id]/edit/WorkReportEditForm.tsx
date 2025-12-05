'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { WorkReport } from '@/types/work-reports'

interface Site {
  id: string
  name: string
  address: string | null
}

interface Worker {
  id: string
  name: string
  role: string
}

interface WorkReportEditFormProps {
  report: WorkReport
  sites: Site[]
  workers: Worker[]
}

export function WorkReportEditForm({ report, sites, workers }: WorkReportEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // フォームステート（既存データで初期化）
  const [siteId, setSiteId] = useState(report.site_id)
  const [reportDate, setReportDate] = useState(report.report_date)
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rainy' | 'snowy' | ''>(report.weather)
  const [description, setDescription] = useState(report.description)
  const [workLocation, setWorkLocation] = useState(report.work_location || '')
  const [progressRate, setProgressRate] = useState<number | undefined>(
    report.progress_rate ?? undefined
  )

  // 作業員IDを抽出
  const initialWorkerIds = Array.isArray(report.workers)
    ? report.workers.map((w: any) => w.user_id).filter(Boolean)
    : []
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(initialWorkerIds)

  // 作業時間を抽出（最初の作業員の作業時間を基準とする）
  const firstWorker = Array.isArray(report.workers) && report.workers.length > 0 ? report.workers[0] : null
  const initialWorkHours = firstWorker && typeof firstWorker === 'object' && 'work_hours' in firstWorker
    ? firstWorker.work_hours
    : 8

  const [workStartTime, setWorkStartTime] = useState('08:00')
  const [workEndTime, setWorkEndTime] = useState('17:00')
  const [breakTime, setBreakTime] = useState(60)

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault()
    setError('')

    // バリデーション
    if (!siteId) {
      setError('現場を選択してください')
      return
    }
    if (!reportDate) {
      setError('作業日を入力してください')
      return
    }
    if (!description.trim()) {
      setError('作業内容を入力してください')
      return
    }
    if (selectedWorkerIds.length === 0) {
      setError('作業員を1名以上選択してください')
      return
    }

    setLoading(true)

    try {
      // 作業時間を計算
      const workHours = calculateWorkHours(workStartTime, workEndTime, breakTime)

      // 作業員データを構築
      const workerData = selectedWorkerIds.map((workerId) => {
        const worker = workers.find((w) => w.id === workerId)
        return {
          user_id: workerId,
          name: worker?.name || '',
          work_hours: workHours,
        }
      })

      const response = await fetch(`/api/work-reports/${report.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: siteId,
          report_date: reportDate,
          weather,
          description,
          workers: workerData,
          work_location: workLocation || undefined,
          progress_rate: progressRate !== undefined && progressRate !== null ? progressRate : undefined,
          status: isDraft ? 'draft' : 'submitted',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '作業報告書の更新に失敗しました')
      }

      // 更新完了後、詳細ページへ遷移
      router.push(`/work-reports/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作業報告書の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 作業時間を計算（時間単位）
  const calculateWorkHours = (start: string, end: string, breakMinutes: number): number => {
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)

    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    const workMinutes = endTotalMinutes - startTotalMinutes - breakMinutes

    return Math.max(0, Math.round(workMinutes / 60 * 10) / 10) // 0.1時間単位
  }

  const calculatedWorkHours = calculateWorkHours(workStartTime, workEndTime, breakTime)

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 現場 */}
              <div className="md:col-span-2">
                <label htmlFor="site_id" className="block text-sm font-medium text-gray-700 mb-1">
                  現場 <span className="text-red-500">*</span>
                </label>
                <select
                  id="site_id"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">現場を選択してください</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} {site.address ? `(${site.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 作業日 */}
              <div>
                <label htmlFor="report_date" className="block text-sm font-medium text-gray-700 mb-1">
                  作業日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="report_date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 天気 */}
              <div>
                <label htmlFor="weather" className="block text-sm font-medium text-gray-700 mb-1">
                  天気
                </label>
                <select
                  id="weather"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択なし</option>
                  <option value="sunny">☀️ 晴れ</option>
                  <option value="cloudy">☁️ 曇り</option>
                  <option value="rainy">🌧️ 雨</option>
                  <option value="snowy">⛄ 雪</option>
                </select>
              </div>
            </div>
          </div>

          {/* 作業時間 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">作業時間</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="work_start_time" className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻
                </label>
                <input
                  type="time"
                  id="work_start_time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="work_end_time" className="block text-sm font-medium text-gray-700 mb-1">
                  終了時刻
                </label>
                <input
                  type="time"
                  id="work_end_time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="break_time" className="block text-sm font-medium text-gray-700 mb-1">
                  休憩時間（分）
                </label>
                <input
                  type="number"
                  id="break_time"
                  value={breakTime}
                  onChange={(e) => setBreakTime(Number(e.target.value))}
                  min="0"
                  step="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              実作業時間: <span className="font-semibold text-gray-900">{calculatedWorkHours}時間</span>
            </div>
          </div>

          {/* 作業員選択 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              作業員 <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {workers.map((worker) => (
                <label
                  key={worker.id}
                  className={`flex items-center px-3 py-2 border rounded-md cursor-pointer transition-colors ${
                    selectedWorkerIds.includes(worker.id)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkerIds.includes(worker.id)}
                    onChange={() => handleWorkerToggle(worker.id)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{worker.name}</span>
                </label>
              ))}
            </div>
            {selectedWorkerIds.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                選択中: <span className="font-semibold text-gray-900">{selectedWorkerIds.length}名</span>
              </div>
            )}
          </div>

          {/* 作業内容 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              作業内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="実施した作業の内容を詳しく記入してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* オプション項目 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">オプション</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 作業場所 */}
              <div>
                <label htmlFor="work_location" className="block text-sm font-medium text-gray-700 mb-1">
                  作業場所（詳細）
                </label>
                <input
                  type="text"
                  id="work_location"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="例: 1階 西側エリア"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 進捗率 */}
              <div>
                <label htmlFor="progress_rate" className="block text-sm font-medium text-gray-700 mb-1">
                  進捗率（%）
                </label>
                <input
                  type="number"
                  id="progress_rate"
                  value={progressRate ?? ''}
                  onChange={(e) => setProgressRate(e.target.value ? Number(e.target.value) : undefined)}
                  min="0"
                  max="100"
                  placeholder="0〜100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-3">
        <Link
          href={`/work-reports/${report.id}`}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          キャンセル
        </Link>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? '保存中...' : '下書き保存'}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '提出中...' : '提出する'}
        </button>
      </div>
    </form>
  )
}
