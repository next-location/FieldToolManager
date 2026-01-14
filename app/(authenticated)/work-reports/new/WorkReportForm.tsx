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

interface OrganizationTool {
  id: string
  name: string
  model_number: string | null
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
  organizationTools: OrganizationTool[]
  currentUserId: string
  currentUserName: string
  settings: Settings
  customFields: CustomFieldDefinition[]
}

export function WorkReportForm({ sites, organizationUsers, organizationTools, currentUserId, currentUserName, settings, customFields }: WorkReportFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 統一フォームスタイル（PC・スマホ対応）
  const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm h-[46px]"
  const selectClassName = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm h-[46px]"
  const textareaClassName = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm"
  const dateTimeClassName = "w-1/2 md:w-full px-3 py-1.5 md:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm h-[38px] md:h-[46px]"

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
  const [toolsText, setToolsText] = useState('')

  // 使用道具（道具マスタから選択）- ユニークIDで管理
  const [selectedTools, setSelectedTools] = useState<Array<{ id: string; toolId: string }>>([])

  // 道具検索用のステート
  const [toolSearchTerms, setToolSearchTerms] = useState<Record<string, string>>({})

  // 帯同作業員（自分以外のユーザー）- ユニークIDで管理
  const [accompaniedWorkers, setAccompaniedWorkers] = useState<Array<{ id: string; userId: string }>>([])

  // 作業員検索用のステート
  const [workerSearchTerms, setWorkerSearchTerms] = useState<Record<string, string>>({})

  // 時間外（残業時間） - 作業員ごとに管理（currentUserIdも含む）
  const [overtimeHours, setOvertimeHours] = useState<Record<string, number>>({})

  // 特記事項・備考
  const [specialNotes, setSpecialNotes] = useState('')
  const [remarks, setRemarks] = useState('')

  // カスタムフィールドの値を保持
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})

  // ひらがな⇔カタカナ変換関数
  const toHiragana = (str: string) => {
    return str.replace(/[\u30A1-\u30F6]/g, (match) => {
      const chr = match.charCodeAt(0) - 0x60
      return String.fromCharCode(chr)
    })
  }
  const toKatakana = (str: string) => {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      const chr = match.charCodeAt(0) + 0x60
      return String.fromCharCode(chr)
    })
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
        ...accompaniedWorkers.map(worker => {
          const user = organizationUsers.find(u => u.id === worker.userId)
          return {
            user_id: worker.userId,
            name: user?.name || '',
            work_hours: workHours, // 同じ作業時間を適用
            overtime_hours: overtimeHours[worker.userId] || 0,
          }
        })
      ]

      // 選択された道具のIDリストを作成
      const selectedToolIds = selectedTools
        .map(t => t.toolId)
        .filter(id => id !== '')

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
          tools: toolsText || undefined,
          tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
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

  // Enterキーでの誤送信を防止
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault()
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} onKeyDown={handleKeyDown} className="space-y-6">
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
                  className={selectClassName}
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
                  className={dateTimeClassName}
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
                  className={selectClassName}
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
                  className={dateTimeClassName}
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
                  className={dateTimeClassName}
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
                  className={inputClassName}
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
                className={inputClassName}
              />
              <p className="mt-1 text-xs text-gray-500">残業時間を時間単位で入力してください（例: 2、1.5）</p>
            </div>
          </div>

          {/* 帯同作業員 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">帯同作業員</h3>
            <p className="text-sm text-gray-600 mb-3">一緒に作業した社員を選択してください（任意）</p>
            <div className="space-y-3">
              {accompaniedWorkers.map((worker, index) => {
                const searchTerm = workerSearchTerms[worker.id] || ''

                // すでに選択されているユーザーIDのリスト（現在編集中のworker以外）
                const selectedUserIds = accompaniedWorkers
                  .filter(w => w.id !== worker.id)
                  .map(w => w.userId)
                  .filter(id => id !== '')

                const filteredUsers = organizationUsers
                  .filter(user => user.id !== currentUserId)
                  .filter(user => !selectedUserIds.includes(user.id)) // すでに選択済みのユーザーを除外
                  .filter(user => {
                    if (!searchTerm) return false // 検索語がない場合は何も表示しない
                    const term = searchTerm.toLowerCase()
                    const termHiragana = toHiragana(term)
                    const termKatakana = toKatakana(term)

                    const userName = user.name.toLowerCase()
                    const userNameHiragana = toHiragana(userName)
                    const userNameKatakana = toKatakana(userName)
                    const userEmail = user.email.toLowerCase()

                    return (
                      userName.includes(term) ||
                      userName.includes(termHiragana) ||
                      userName.includes(termKatakana) ||
                      userNameHiragana.includes(term) ||
                      userNameHiragana.includes(termHiragana) ||
                      userNameHiragana.includes(termKatakana) ||
                      userNameKatakana.includes(term) ||
                      userNameKatakana.includes(termHiragana) ||
                      userNameKatakana.includes(termKatakana) ||
                      userEmail.includes(term)
                    )
                  })

                const selectedUser = organizationUsers.find(u => u.id === worker.userId)

                return (
                  <div key={worker.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        作業員 {index + 1}
                      </label>

                      {/* 選択されたユーザー表示（検索していない時のみ） */}
                      {selectedUser && !searchTerm && (
                        <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="text-sm font-medium text-blue-900">{selectedUser.name}</div>
                          <div className="text-xs text-blue-700">{selectedUser.email}</div>
                        </div>
                      )}

                      {/* 検索入力 */}
                      <input
                        type="text"
                        placeholder={selectedUser ? "別の作業員を検索..." : "名前またはメールアドレスで検索..."}
                        value={searchTerm}
                        onChange={(e) => {
                          setWorkerSearchTerms({
                            ...workerSearchTerms,
                            [worker.id]: e.target.value
                          })
                        }}
                        className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />

                      {/* 検索結果リスト（検索語がある時のみ表示） */}
                      {searchTerm && (
                        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md mb-2 bg-white shadow-sm">
                          {filteredUsers.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">検索結果なし</div>
                          ) : (
                            filteredUsers.map(user => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  const newWorkers = [...accompaniedWorkers]
                                  newWorkers[index] = { ...worker, userId: user.id }
                                  setAccompaniedWorkers(newWorkers)
                                  // 選択後、検索欄をクリア
                                  setWorkerSearchTerms({
                                    ...workerSearchTerms,
                                    [worker.id]: ''
                                  })
                                }}
                                className={`w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  user.id === worker.userId ? 'bg-blue-100' : 'bg-white'
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      <div className="mt-2">
                        <label htmlFor={`overtime_${worker.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                          時間外（残業時間）
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            id={`overtime_${worker.id}`}
                            value={overtimeHours[worker.userId] || ''}
                            onChange={(e) => setOvertimeHours({
                              ...overtimeHours,
                              [worker.userId]: e.target.value ? Number(e.target.value) : 0
                            })}
                            min="0"
                            step="0.5"
                            placeholder="0"
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-xs text-gray-500">時間</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccompaniedWorkers(accompaniedWorkers.filter((_, i) => i !== index))
                        const newOvertimeHours = { ...overtimeHours }
                        delete newOvertimeHours[worker.userId]
                        setOvertimeHours(newOvertimeHours)
                        const newSearchTerms = { ...workerSearchTerms }
                        delete newSearchTerms[worker.id]
                        setWorkerSearchTerms(newSearchTerms)
                      }}
                      className="mt-6 px-2 py-1 text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                )
              })}

              {/* 追加ボタン */}
              <button
                type="button"
                onClick={() => {
                  const newId = `worker_${Date.now()}_${Math.random()}`
                  // 初期値はnullにして、ユーザーに検索させる
                  setAccompaniedWorkers([...accompaniedWorkers, { id: newId, userId: '' }])
                }}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                + 作業員を追加
              </button>

              {accompaniedWorkers.length === 0 && (
                <p className="text-sm text-gray-500 text-center">「+ 作業員を追加」ボタンをクリックして作業員を追加してください</p>
              )}
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
            <div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 5000) {
                    setDescription(e.target.value)
                  }
                }}
                required
                rows={5}
                placeholder="実施した作業の内容を詳しく記入してください"
                className={textareaClassName}
              />
              <div className="text-right -mt-[7px]">
                <span className={`text-xs ${description.length > 5000 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {description.length} / 5000
                </span>
              </div>
            </div>
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
                      className={inputClassName}
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
                      className={inputClassName}
                    />
                  </div>
                )}

                {/* 使用資材 */}
                {settings.enable_materials && (
                  <div className="md:col-span-2">
                    <label htmlFor="materials" className="block text-sm font-medium text-gray-700 mb-1">
                      使用資材
                    </label>
                    <div>
                      <textarea
                        id="materials"
                        value={materials}
                        onChange={(e) => {
                          if (e.target.value.length <= 2000) {
                            setMaterials(e.target.value)
                          }
                        }}
                        rows={3}
                        placeholder="例: コンクリート 5m³、鉄筋 D13 100本"
                        className={textareaClassName}
                      />
                      <div className="text-right -mt-[7px]">
                        <span className={`text-xs ${materials.length > 2000 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {materials.length} / 2000
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 使用道具 */}
                {settings.enable_tools && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      使用道具
                    </label>
                    <p className="text-sm text-gray-600 mb-3">使用した道具を選択してください（任意）</p>
                    <div className="space-y-3">
                      {selectedTools.map((tool, index) => {
                        const searchTerm = toolSearchTerms[tool.id] || ''
                        const selectedToolIds = selectedTools
                          .filter(t => t.id !== tool.id)
                          .map(t => t.toolId)
                          .filter(id => id !== '')

                        const filteredTools = organizationTools
                          .filter(orgTool => !selectedToolIds.includes(orgTool.id))
                          .filter(orgTool => {
                            if (!searchTerm) return false
                            const term = searchTerm.toLowerCase()
                            const termHiragana = toHiragana(term)
                            const termKatakana = toKatakana(term)

                            const name = orgTool.name.toLowerCase()
                            const nameHiragana = toHiragana(name)
                            const nameKatakana = toKatakana(name)
                            const model = orgTool.model_number?.toLowerCase() || ''

                            return (
                              name.includes(term) ||
                              name.includes(termHiragana) ||
                              name.includes(termKatakana) ||
                              nameHiragana.includes(term) ||
                              nameHiragana.includes(termHiragana) ||
                              nameHiragana.includes(termKatakana) ||
                              nameKatakana.includes(term) ||
                              nameKatakana.includes(termHiragana) ||
                              nameKatakana.includes(termKatakana) ||
                              model.includes(term)
                            )
                          })

                        const selectedTool = organizationTools.find(t => t.id === tool.toolId)

                        return (
                          <div key={tool.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                道具 {index + 1}
                              </label>

                              {/* 選択された道具表示（検索していない時のみ） */}
                              {selectedTool && !searchTerm && (
                                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                  <div className="text-sm font-medium text-blue-900">{selectedTool.name}</div>
                                  {selectedTool.model_number && (
                                    <div className="text-xs text-blue-700">{selectedTool.model_number}</div>
                                  )}
                                </div>
                              )}

                              {/* 検索入力 */}
                              <input
                                type="text"
                                placeholder={selectedTool ? "別の道具を検索..." : "道具名または型番で検索..."}
                                value={searchTerm}
                                onChange={(e) => {
                                  setToolSearchTerms({
                                    ...toolSearchTerms,
                                    [tool.id]: e.target.value
                                  })
                                }}
                                className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />

                              {/* 検索結果リスト（検索語がある時のみ表示） */}
                              {searchTerm && (
                                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md mb-2 bg-white shadow-sm">
                                  {filteredTools.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500">検索結果なし</div>
                                  ) : (
                                    filteredTools.map(orgTool => (
                                      <button
                                        key={orgTool.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedTools(selectedTools.map(t =>
                                            t.id === tool.id ? { ...t, toolId: orgTool.id } : t
                                          ))
                                          setToolSearchTerms({
                                            ...toolSearchTerms,
                                            [tool.id]: ''
                                          })
                                        }}
                                        className={`w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                          orgTool.id === tool.toolId ? 'bg-blue-100' : 'bg-white'
                                        }`}
                                      >
                                        <div className="text-sm font-medium text-gray-900">{orgTool.name}</div>
                                        {orgTool.model_number && (
                                          <div className="text-xs text-gray-500">{orgTool.model_number}</div>
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newTools = selectedTools.filter(t => t.id !== tool.id)
                                setSelectedTools(newTools)
                                const newSearchTerms = { ...toolSearchTerms }
                                delete newSearchTerms[tool.id]
                                setToolSearchTerms(newSearchTerms)
                              }}
                              className="mt-6 px-3 py-2 text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              削除
                            </button>
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          const newId = `tool_${Date.now()}_${Math.random()}`
                          setSelectedTools([...selectedTools, { id: newId, toolId: '' }])
                        }}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                      >
                        + 道具を追加
                      </button>
                    </div>
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
                <div>
                  <textarea
                    id="special_notes"
                    value={specialNotes}
                    onChange={(e) => {
                      if (e.target.value.length <= 2000) {
                        setSpecialNotes(e.target.value)
                      }
                    }}
                    rows={3}
                    placeholder="特別な注意事項や重要な情報を記載してください"
                    className={textareaClassName}
                  />
                  <div className="text-right -mt-[7px]">
                    <span className={`text-xs ${specialNotes.length > 2000 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {specialNotes.length} / 2000
                    </span>
                  </div>
                </div>
              </div>

              {/* 備考 */}
              <div>
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                  備考
                </label>
                <div>
                  <textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => {
                      if (e.target.value.length <= 2000) {
                        setRemarks(e.target.value)
                      }
                    }}
                    rows={3}
                    placeholder="その他補足事項があれば記載してください"
                    className={textareaClassName}
                  />
                  <div className="text-right -mt-[7px]">
                    <span className={`text-xs ${remarks.length > 2000 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {remarks.length} / 2000
                    </span>
                  </div>
                </div>
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
                        className={inputClassName}
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
                        className={inputClassName}
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
                        className={selectClassName}
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
                        className={dateTimeClassName}
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
                        className={dateTimeClassName}
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
