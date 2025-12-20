'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  approval_threshold_level1: number
  approval_threshold_level2: number
  require_project: boolean
  auto_numbering_prefix: string
}

export function PurchaseOrderSettingsClient() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>({
    approval_threshold_level1: 100000,
    approval_threshold_level2: 1000000,
    require_project: false,
    auto_numbering_prefix: 'PO',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/purchase-orders/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const result = await response.json()
      setSettings(result.data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      alert('設定の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/purchase-orders/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '設定の保存に失敗しました')
      }

      alert('設定を保存しました')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert(error.message || '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* 承認金額閾値設定 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">承認金額閾値</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                レベル1閾値（リーダー以上が承認可能）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.approval_threshold_level1}
                  onChange={(e) =>
                    setSettings({ ...settings, approval_threshold_level1: Number(e.target.value) })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="1000"
                />
                <span className="text-sm text-gray-500">円</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                この金額未満の発注はリーダー以上が承認できます（デフォルト: 100,000円）
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                レベル2閾値（管理者のみ承認可能）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.approval_threshold_level2}
                  onChange={(e) =>
                    setSettings({ ...settings, approval_threshold_level2: Number(e.target.value) })
                  }
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="10000"
                />
                <span className="text-sm text-gray-500">円</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                この金額以上の発注は管理者の承認が必須です（デフォルト: 1,000,000円）
              </p>
            </div>
          </div>
        </div>

        {/* 発注書番号プレフィックス */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">発注書番号設定</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              発注番号プレフィックス
            </label>
            <input
              type="text"
              value={settings.auto_numbering_prefix}
              onChange={(e) =>
                setSettings({ ...settings, auto_numbering_prefix: e.target.value })
              }
              className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="PO"
              maxLength={10}
            />
            <p className="mt-1 text-xs text-gray-500">
              発注番号の先頭に付けるプレフィックス（例: PO → PO-20231215-001）
            </p>
          </div>
        </div>

        {/* 工事紐づけ必須設定 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">その他設定</h2>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="require_project"
              checked={settings.require_project}
              onChange={(e) =>
                setSettings({ ...settings, require_project: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="require_project" className="ml-2 block text-sm text-gray-900">
              発注書に工事の紐づけを必須にする
            </label>
          </div>
          <p className="mt-1 ml-6 text-xs text-gray-500">
            有効にすると、発注書作成時に必ず工事を選択する必要があります
          </p>
        </div>

        {/* 保存ボタン */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
