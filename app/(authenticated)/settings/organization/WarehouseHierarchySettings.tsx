'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveWarehouseHierarchyTemplates,
  deleteWarehouseHierarchyTemplate,
} from './actions'

type WarehouseTemplate = {
  id: string
  level: number
  label: string
  is_active: boolean
  display_order: number
}

type TemplateInput = {
  level: number
  label: string
  is_active: boolean
}

export function WarehouseHierarchySettings({
  organizationId,
  initialTemplates,
}: {
  organizationId: string
  initialTemplates: WarehouseTemplate[]
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateInput[]>(() => {
    // 常に5階層分のテンプレートを用意
    const allLevels = [1, 2, 3, 4, 5]

    if (initialTemplates.length > 0) {
      // 既存のテンプレートをマージ
      return allLevels.map((level) => {
        const existing = initialTemplates.find((t) => t.level === level)
        if (existing) {
          return {
            level: existing.level,
            label: existing.label,
            is_active: existing.is_active,
          }
        }
        return { level, label: '', is_active: false }
      })
    }

    // デフォルト: 3階層（残り2階層は無効）
    return [
      { level: 1, label: 'エリア', is_active: true },
      { level: 2, label: '棚', is_active: true },
      { level: 3, label: '段', is_active: true },
      { level: 4, label: '', is_active: false },
      { level: 5, label: '', is_active: false },
    ]
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleLabelChange = (level: number, label: string) => {
    setTemplates(
      templates.map((t) => (t.level === level ? { ...t, label } : t))
    )
  }

  const handleActiveChange = (level: number, is_active: boolean) => {
    setTemplates(
      templates.map((t) => (t.level === level ? { ...t, is_active } : t))
    )
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // アクティブなテンプレートでラベルが空のものをチェック
      const activeTemplatesWithoutLabel = templates.filter(
        (t) => t.is_active && !t.label.trim()
      )

      if (activeTemplatesWithoutLabel.length > 0) {
        setMessage({
          type: 'error',
          text: '有効な階層にはラベルを入力してください',
        })
        setLoading(false)
        return
      }

      await saveWarehouseHierarchyTemplates(organizationId, templates)
      setMessage({ type: 'success', text: '倉庫階層設定を保存しました' })
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const getLevelExamples = (level: number) => {
    switch (level) {
      case 1:
        return '例: エリア, フロア, 倉庫'
      case 2:
        return '例: 棚, 区画, エリア'
      case 3:
        return '例: 段, 保管方法, 棚'
      case 4:
        return '例: 番号, 段, 列'
      case 5:
        return '例: 番号, 詳細位置'
      default:
        return ''
    }
  }

  return (
    <div className="border-t border-gray-200 pt-6" id="warehouse-hierarchy">
      <h3 className="text-base font-medium text-gray-900 mb-2">
        倉庫階層設定
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        倉庫内の位置管理に使用する階層構造を設定します。1～5階層まで設定可能です。
      </p>

      {message && (
        <div
          className={`rounded-md p-4 mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          📘 設定例
        </h4>
        <div className="text-sm text-blue-800 space-y-2">
          <div>
            <strong>3階層の例:</strong> エリア → 棚 → 段
            <br />
            <span className="text-xs text-blue-600">
              位置コード例: A-1-上
            </span>
          </div>
          <div>
            <strong>1階層の例:</strong> 場所
            <br />
            <span className="text-xs text-blue-600">
              位置コード例: 北側
            </span>
          </div>
          <div>
            <strong>4階層の例:</strong> フロア → エリア → 保管方法 → 番号
            <br />
            <span className="text-xs text-blue-600">
              位置コード例: 1F-工具-壁掛け-3
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.level}
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={template.is_active}
                onChange={(e) =>
                  handleActiveChange(template.level, e.target.checked)
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700 w-16">
                レベル{template.level}
              </label>
            </div>
            <input
              type="text"
              maxLength={50}
              value={template.label}
              onChange={(e) =>
                handleLabelChange(template.level, e.target.value)
              }
              disabled={!template.is_active}
              placeholder={getLevelExamples(template.level)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ 注意:</strong>{' '}
          階層設定を変更すると、既存の倉庫位置データに影響する可能性があります。変更は慎重に行ってください。
        </p>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '階層設定を保存'}
        </button>
      </div>
    </div>
  )
}
