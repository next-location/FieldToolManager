'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CustomField {
  name: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'time'
  options?: string[]
  required?: boolean
  unit?: string
}

interface Settings {
  enable_work_location: boolean
  enable_progress_rate: boolean
  enable_materials: boolean
  enable_tools: boolean
  custom_fields: CustomField[]
  require_approval: boolean
}

export function WorkReportSettingsForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [settings, setSettings] = useState<Settings>({
    enable_work_location: true,
    enable_progress_rate: true,
    enable_materials: true,
    enable_tools: true,
    custom_fields: [],
    require_approval: false,
  })

  const [newField, setNewField] = useState<CustomField>({
    name: '',
    type: 'text',
    required: false,
  })
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/work-reports/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('設定取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/work-reports/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '設定の保存に失敗しました')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const addCustomField = () => {
    if (!newField.name.trim()) {
      alert('フィールド名を入力してください')
      return
    }

    setSettings({
      ...settings,
      custom_fields: [...settings.custom_fields, { ...newField }],
    })

    setNewField({
      name: '',
      type: 'text',
      required: false,
    })
  }

  const removeCustomField = (index: number) => {
    setSettings({
      ...settings,
      custom_fields: settings.custom_fields.filter((_, i) => i !== index),
    })
  }

  const addOption = () => {
    if (!newOption.trim()) return

    setNewField({
      ...newField,
      options: [...(newField.options || []), newOption],
    })
    setNewOption('')
  }

  const removeOption = (index: number) => {
    setNewField({
      ...newField,
      options: (newField.options || []).filter((_, i) => i !== index),
    })
  }

  if (loading) {
    return <div className="text-center py-12">読み込み中...</div>
  }

  const fieldTypeLabels: Record<string, string> = {
    text: 'テキスト',
    number: '数値',
    select: '選択肢',
    checkbox: 'チェックボックス',
    date: '日付',
    time: '時刻',
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          設定を保存しました
        </div>
      )}

      {/* オプション項目の有効/無効 */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">オプション項目</h3>
          <p className="text-sm text-gray-600 mb-4">
            作業報告書で使用する項目を選択してください。
          </p>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_work_location}
                onChange={(e) =>
                  setSettings({ ...settings, enable_work_location: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">作業場所（詳細）</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_progress_rate}
                onChange={(e) =>
                  setSettings({ ...settings, enable_progress_rate: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">進捗率</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_materials}
                onChange={(e) =>
                  setSettings({ ...settings, enable_materials: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">使用資材</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enable_tools}
                onChange={(e) =>
                  setSettings({ ...settings, enable_tools: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">使用道具</span>
            </label>
          </div>
        </div>
      </div>

      {/* カスタムフィールド */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">カスタムフィールド</h3>
          <p className="text-sm text-gray-600 mb-4">
            業種固有の項目を自由に追加できます。
          </p>

          {/* 既存のカスタムフィールド */}
          {settings.custom_fields.length > 0 && (
            <div className="mb-6 space-y-2">
              {settings.custom_fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-900">{field.name}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({fieldTypeLabels[field.type]})
                    </span>
                    {field.required && (
                      <span className="ml-2 text-xs text-red-600">必須</span>
                    )}
                    {field.unit && (
                      <span className="ml-2 text-xs text-gray-500">単位: {field.unit}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeCustomField(index)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 新規フィールド追加フォーム */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">新規フィールド追加</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フィールド名
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="例: 気温"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  入力タイプ
                </label>
                <select
                  value={newField.type}
                  onChange={(e) =>
                    setNewField({ ...newField, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {newField.type === 'number' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    単位（オプション）
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={newField.unit || ''}
                    onChange={(e) => setNewField({ ...newField, unit: e.target.value })}
                    placeholder="例: ℃"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center pt-7">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) =>
                      setNewField({ ...newField, required: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">必須項目</span>
                </label>
              </div>
            </div>

            {/* 選択肢タイプの場合 */}
            {newField.type === 'select' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  選択肢
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    maxLength={50}
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="選択肢を入力"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    追加
                  </button>
                </div>
                {newField.options && newField.options.length > 0 && (
                  <div className="space-y-1">
                    {newField.options.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-white rounded"
                      >
                        <span className="text-sm text-gray-900">{option}</span>
                        <button
                          onClick={() => removeOption(index)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={addCustomField}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              フィールドを追加
            </button>
          </div>
        </div>
      </div>

      {/* 承認フロー */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">承認フロー</h3>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.require_approval}
              onChange={(e) =>
                setSettings({ ...settings, require_approval: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">
              作業報告書の承認を必須にする
            </span>
          </label>
          <p className="mt-2 text-sm text-gray-500">
            有効にすると、リーダーまたは管理者の承認が必要になります。
          </p>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  )
}
