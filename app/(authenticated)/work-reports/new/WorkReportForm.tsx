'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CustomFieldInput } from './CustomFieldInput'
import { PhotoUpload } from './PhotoUpload'
import { AttachmentUpload } from './AttachmentUpload'

interface Site {
  id: string
  name: string
  address: string | null
}

interface OrganizationUser {
  id: string
  name: string
  email: string
}

interface CustomField {
  name: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'time'
  options?: string[]
  required?: boolean
  unit?: string
}

interface CustomFieldDefinition {
  id: string
  field_key: string
  field_label: string
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
  field_options?: string[]
  is_required: boolean
  placeholder?: string
  help_text?: string
}

interface Settings {
  enable_work_location: boolean
  enable_progress_rate: boolean
  enable_materials: boolean
  enable_tools: boolean
  custom_fields: CustomField[]
  require_approval: boolean
}

interface WorkReportFormProps {
  sites: Site[]
  organizationUsers: OrganizationUser[]
  currentUserId: string
  currentUserName: string
  settings: Settings
  customFields: CustomFieldDefinition[]
}

export function WorkReportForm({ sites, organizationUsers, currentUserId, currentUserName, settings, customFields }: WorkReportFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // フォームステート
  const [siteId, setSiteId] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rainy' | 'snowy' | ''>('')
  const [workStartTime, setWorkStartTime] = useState('08:00')
  const [workEndTime, setWorkEndTime] = useState('17:00')
  const [breakTime, setBreakTime] = useState(60)
  const [description, setDescription] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [progressRate, setProgressRate] = useState<number | undefined>(undefined)
  const [materials, setMaterials] = useState('')
  const [tools, setTools] = useState('')

  // 帯同作業員（自分以外のユーザー）
  const [accompaniedWorkerIds, setAccompaniedWorkerIds] = useState<string[]>([])

  // 時間外（残業時間） - 作業員ごとに管理（currentUserIdも含む）
  const [overtimeHours, setOvertimeHours] = useState<Record<string, number>>({})

  // 特記事項・備考
  const [specialNotes, setSpecialNotes] = useState('')
  const [remarks, setRemarks] = useState('')

  // カスタムフィールドの値を保持
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})

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

    setLoading(true)

    try {
      // 作業時間を計算
      const workHours = calculateWorkHours(workStartTime, workEndTime, breakTime)

      // 作業員データを構築（作成者 + 帯同作業員）
      const workerData = [
        {
          user_id: currentUserId,
          name: currentUserName,
          work_hours: workHours,
          overtime_hours: overtimeHours[currentUserId] || 0,
        },
        ...accompaniedWorkerIds.map(workerId => {
          const user = organizationUsers.find(u => u.id === workerId)
          return {
            user_id: workerId,
            name: user?.name || '',
            work_hours: workHours, // 同じ作業時間を適用
            overtime_hours: overtimeHours[workerId] || 0,
          }
        })
      ]

      const response = await fetch('/api/work-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: siteId,
          report_date: reportDate,
          weather,
          work_start_time: workStartTime,
          work_end_time: workEndTime,
          break_minutes: breakTime,
          description,
          workers: workerData,
          work_location: workLocation || undefined,
          progress_rate: progressRate !== undefined && progressRate !== null ? progressRate : undefined,
          materials: materials || undefined,
          tools: tools || undefined,
          special_notes: specialNotes || undefined,
          remarks: remarks || undefined,
          custom_fields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
          custom_fields_data: customFieldValues, // 新しいカスタムフィールドデータ
          status: isDraft ? 'draft' : 'submitted',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '作業報告書の作成に失敗しました')
      }

      const data = await response.json()

      // 作成完了後、詳細ページへ遷移
      router.push(`/work-reports/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作業報告書の作成に失敗しました')
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

            {/* 自分の時間外 */}
            <div className="mt-4">
              <label htmlFor="own_overtime" className="block text-sm font-medium text-gray-700 mb-1">
                時間外（残業時間）
              </label>
              <input
                type="number"
                id="own_overtime"
                value={overtimeHours[currentUserId] || ''}
                onChange={(e) => setOvertimeHours({
                  ...overtimeHours,
                  [currentUserId]: e.target.value ? Number(e.target.value) : 0
                })}
                min="0"
                step="0.5"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">残業時間を時間単位で入力してください（例: 2、1.5）</p>
            </div>
          </div>

          {/* 帯同作業員 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">帯同作業員</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">一緒に作業した社員を選択してください（任意）</p>
              {organizationUsers
                .filter(user => user.id !== currentUserId)
                .map(user => (
                  <div key={user.id} className="space-y-2">
                    <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accompaniedWorkerIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAccompaniedWorkerIds([...accompaniedWorkerIds, user.id])
                          } else {
                            setAccompaniedWorkerIds(accompaniedWorkerIds.filter(id => id !== user.id))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900">{user.name}</span>
                      <span className="text-xs text-gray-500">({user.email})</span>
                    </label>
                    {accompaniedWorkerIds.includes(user.id) && (
                      <div className="ml-7 pb-2">
                        <label htmlFor={`overtime_${user.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                          時間外（残業時間）
                        </label>
                        <input
                          type="number"
                          id={`overtime_${user.id}`}
                          value={overtimeHours[user.id] || ''}
                          onChange={(e) => setOvertimeHours({
                            ...overtimeHours,
                            [user.id]: e.target.value ? Number(e.target.value) : 0
                          })}
                          min="0"
                          step="0.5"
                          placeholder="0"
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="ml-1 text-xs text-gray-500">時間</span>
                      </div>
                    )}
                  </div>
                ))}
              {organizationUsers.filter(user => user.id !== currentUserId).length === 0 && (
                <p className="text-sm text-gray-500">他の社員が登録されていません</p>
              )}
            </div>
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
          {(settings.enable_work_location || settings.enable_progress_rate || settings.enable_materials || settings.enable_tools) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">オプション</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 作業場所 */}
                {settings.enable_work_location && (
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
                )}

                {/* 進捗率 */}
                {settings.enable_progress_rate && (
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
                )}

                {/* 使用資材 */}
                {settings.enable_materials && (
                  <div className="md:col-span-2">
                    <label htmlFor="materials" className="block text-sm font-medium text-gray-700 mb-1">
                      使用資材
                    </label>
                    <textarea
                      id="materials"
                      value={materials}
                      onChange={(e) => setMaterials(e.target.value)}
                      rows={3}
                      placeholder="例: コンクリート 5m³、鉄筋 D13 100本"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* 使用道具 */}
                {settings.enable_tools && (
                  <div className="md:col-span-2">
                    <label htmlFor="tools" className="block text-sm font-medium text-gray-700 mb-1">
                      使用道具
                    </label>
                    <textarea
                      id="tools"
                      value={tools}
                      onChange={(e) => setTools(e.target.value)}
                      rows={3}
                      placeholder="例: 電動ドリル、サンダー、水平器"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 特記事項・備考 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">特記事項・備考</h3>
            <div className="grid grid-cols-1 gap-6">
              {/* 特記事項 */}
              <div>
                <label htmlFor="special_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  特記事項
                </label>
                <textarea
                  id="special_notes"
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  rows={3}
                  placeholder="特別な注意事項や重要な情報を記載してください"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 備考 */}
              <div>
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="その他補足事項があれば記載してください"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 新しいカスタムフィールド */}
          {customFields.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">カスタム項目</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customFields.map((field) => (
                  <CustomFieldInput
                    key={field.id}
                    field={field}
                    value={customFieldValues[field.field_key]}
                    onChange={(key, value) => setCustomFieldValues({ ...customFieldValues, [key]: value })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 旧形式のカスタムフィールド（後方互換性のため残す） */}
          {settings.custom_fields.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">業種固有項目（旧形式）</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.custom_fields.map((field, index) => (
                  <div key={index}>
                    <label
                      htmlFor={`custom_field_${index}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                      {field.unit && <span className="text-gray-500 ml-1">({field.unit})</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        type="text"
                        id={`custom_field_${index}`}
                        value={customFieldValues[field.name] || ''}
                        onChange={(e) =>
                          setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })
                        }
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        id={`custom_field_${index}`}
                        value={customFieldValues[field.name] ?? ''}
                        onChange={(e) =>
                          setCustomFieldValues({
                            ...customFieldValues,
                            [field.name]: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}

                    {field.type === 'select' && field.options && (
                      <select
                        id={`custom_field_${index}`}
                        value={customFieldValues[field.name] || ''}
                        onChange={(e) =>
                          setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })
                        }
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">選択してください</option>
                        {field.options.map((option, optIdx) => (
                          <option key={optIdx} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'checkbox' && (
                      <label className="flex items-center pt-2">
                        <input
                          type="checkbox"
                          id={`custom_field_${index}`}
                          checked={customFieldValues[field.name] || false}
                          onChange={(e) =>
                            setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">はい</span>
                      </label>
                    )}

                    {field.type === 'date' && (
                      <input
                        type="date"
                        id={`custom_field_${index}`}
                        value={customFieldValues[field.name] || ''}
                        onChange={(e) =>
                          setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })
                        }
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}

                    {field.type === 'time' && (
                      <input
                        type="time"
                        id={`custom_field_${index}`}
                        value={customFieldValues[field.name] || ''}
                        onChange={(e) =>
                          setCustomFieldValues({ ...customFieldValues, [field.name]: e.target.value })
                        }
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 写真セクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <PhotoUpload reportId={undefined} />
      </div>

      {/* 添付ファイルセクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <AttachmentUpload reportId={undefined} />
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-3">
        <Link
          href="/work-reports"
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
