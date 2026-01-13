'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type WarehouseLocation = {
  id: string
  code: string
  display_name: string
  description: string | null
}

type EditLocationFormProps = {
  location: WarehouseLocation
  action: (formData: FormData) => Promise<void>
}

export function EditLocationForm({ location, action }: EditLocationFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(location.display_name)
  const [description, setDescription] = useState(location.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      await action(formData)
      router.push(`/warehouse-locations/${location.id}`)
      router.refresh()
    } catch (error: any) {
      alert(`更新に失敗しました: ${error.message}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">倉庫位置を編集</h1>
        <p className="mt-1 text-sm text-gray-600">
          倉庫位置の情報を編集します
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={location.id} />

            <div className="space-y-6">
              {/* 位置コード（変更不可） */}
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  位置コード（変更不可）
                </label>
                <input
                  type="text"
                  id="code"
                  value={location.code}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  位置コードは変更できません
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
                  位置を識別しやすい名前を入力してください
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

              {/* ボタン */}
              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href={`/warehouse-locations/${location.id}`}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !displayName}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '更新中...' : '更新する'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
