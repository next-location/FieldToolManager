'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Template = {
  id: string
  level: number
  label: string
  is_active: boolean
}

type LocationFormProps = {
  templates: Template[]
  action: (formData: FormData) => Promise<void>
}

export function LocationForm({ templates, action }: LocationFormProps) {
  const [levelValues, setLevelValues] = useState<Record<number, string>>({})
  const [generatedCode, setGeneratedCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [generateQR, setGenerateQR] = useState(true)

  // 位置コードを自動生成
  useEffect(() => {
    const parts: string[] = []

    templates.forEach((template) => {
      const value = levelValues[template.level] || ''
      if (value.trim()) {
        parts.push(value.trim())
      }
    })

    const code = parts.join('-')
    setGeneratedCode(code)

    // 表示名も自動生成
    const names = templates
      .map((template) => {
        const value = levelValues[template.level]
        return value?.trim() ? `${template.label}${value.trim()}` : ''
      })
      .filter(Boolean)

    if (names.length > 0) {
      setDisplayName(names.join(' '))
    }
  }, [levelValues, templates])

  const handleLevelChange = (level: number, value: string) => {
    setLevelValues((prev) => ({
      ...prev,
      [level]: value,
    }))
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">新しい倉庫位置を登録</h1>
        <p className="mt-1 text-sm text-gray-600">
          倉庫内の位置情報を登録します
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">

      <form action={action}>
        <div className="space-y-6">
          {/* 階層入力フィールド */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              階層別コード入力
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              各階層の値を入力してください。入力した値が自動的にハイフン（-）でつながれて位置コードになります。
            </p>
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id}>
                  <label
                    htmlFor={`level-${template.level}`}
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {template.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id={`level-${template.level}`}
                    value={levelValues[template.level] || ''}
                    onChange={(e) => handleLevelChange(template.level, e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`例: ${template.level === 1 ? 'A' : template.level === 2 ? '1' : '上'}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 自動生成された位置コード */}
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              位置コード（自動生成）
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={generatedCode}
              readOnly
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              上記の階層入力から自動的に生成されます（例: A-1-上）
            </p>
          </div>

          {/* 表示名 */}
          <div>
            <label
              htmlFor="display_name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="display_name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: エリアA 棚1 上段"
            />
            <p className="mt-1 text-xs text-gray-500">
              位置を識別しやすい名前を入力してください（自動入力を編集可能）
            </p>
          </div>

          {/* 説明 */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              説明
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="この位置の詳細や特徴を入力（任意）"
            />
          </div>

          {/* QRコード生成オプション */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="generate_qr"
              name="generate_qr"
              checked={generateQR}
              onChange={(e) => setGenerateQR(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="generate_qr" className="ml-2 block text-sm text-gray-900">
              QRコードを自動生成する（推奨）
            </label>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4">
            <Link
              href="/warehouse-locations"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={!generatedCode || !displayName}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              登録する
            </button>
          </div>
        </div>
      </form>
        </div>
      </div>
    </div>
  )
}
