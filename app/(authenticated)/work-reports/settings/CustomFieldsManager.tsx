'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CustomField {
  id: string
  field_key: string
  field_label: string
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
  field_options?: string[]
  display_order: number
  is_required: boolean
  placeholder?: string
  help_text?: string
}

interface CustomFieldsManagerProps {
  initialFields: CustomField[]
}

export function CustomFieldsManager({ initialFields }: CustomFieldsManagerProps) {
  const router = useRouter()
  const [fields, setFields] = useState<CustomField[]>(initialFields)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 新規フィールドフォーム用state
  const [newField, setNewField] = useState({
    field_key: '',
    field_label: '',
    field_type: 'text' as CustomField['field_type'],
    field_options: '',
    is_required: false,
    placeholder: '',
    help_text: '',
  })

  const fieldTypeLabels: Record<CustomField['field_type'], string> = {
    text: 'テキスト（1行）',
    textarea: 'テキスト（複数行）',
    number: '数値',
    date: '日付',
    select: '選択肢（ドロップダウン）',
    checkbox: 'チェックボックス',
  }

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/work-reports/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newField,
          field_options: ['select', 'checkbox'].includes(newField.field_type)
            ? newField.field_options.split(',').map((s) => s.trim()).filter(Boolean)
            : null,
          display_order: fields.length,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'カスタムフィールドの追加に失敗しました')
      }

      setMessage({ type: 'success', text: 'カスタムフィールドを追加しました' })
      setIsAdding(false)
      setNewField({
        field_key: '',
        field_label: '',
        field_type: 'text',
        field_options: '',
        is_required: false,
        placeholder: '',
        help_text: '',
      })
      router.refresh()

      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このカスタムフィールドを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/work-reports/custom-fields/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'カスタムフィールドの削除に失敗しました')
      }

      setMessage({ type: 'success', text: 'カスタムフィールドを削除しました' })
      router.refresh()

      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">カスタムフィールド</h3>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + フィールドを追加
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 既存フィールド一覧 */}
      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">カスタムフィールドはまだ登録されていません</p>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{field.field_label}</h4>
                    {field.is_required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        必須
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    タイプ: {fieldTypeLabels[field.field_type]} / キー: {field.field_key}
                  </p>
                  {field.field_options && field.field_options.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      選択肢: {field.field_options.join(', ')}
                    </p>
                  )}
                  {field.help_text && (
                    <p className="text-sm text-gray-500 mt-1">ヘルプ: {field.help_text}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(field.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新規フィールド追加フォーム */}
      {isAdding && (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-3">新しいカスタムフィールド</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フィールド名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.field_label}
                  onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="例: 天気"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  フィールドキー <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.field_key}
                  onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="例: custom_weather"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                フィールドタイプ <span className="text-red-500">*</span>
              </label>
              <select
                value={newField.field_type}
                onChange={(e) =>
                  setNewField({ ...newField, field_type: e.target.value as CustomField['field_type'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {Object.entries(fieldTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {['select', 'checkbox'].includes(newField.field_type) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  選択肢（カンマ区切り） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.field_options}
                  onChange={(e) => setNewField({ ...newField, field_options: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="例: 晴れ,曇り,雨"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">プレースホルダー</label>
              <input
                type="text"
                value={newField.placeholder}
                onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="例: 天気を選択してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ヘルプテキスト</label>
              <input
                type="text"
                value={newField.help_text}
                onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="例: 作業時の天候を記録してください"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_required"
                checked={newField.is_required}
                onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_required" className="text-sm text-gray-700">
                必須フィールドにする
              </label>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newField.field_key || !newField.field_label}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setNewField({
                    field_key: '',
                    field_label: '',
                    field_type: 'text',
                    field_options: '',
                    is_required: false,
                    placeholder: '',
                    help_text: '',
                  })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
