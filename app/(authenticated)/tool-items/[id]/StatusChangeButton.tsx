'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateToolItemStatus } from '../actions'

type StatusChangeType = 'lost' | 'disposed' | 'maintenance'

interface StatusChangeButtonProps {
  toolItemId: string
  currentStatus: string
}

export function StatusChangeButton({ toolItemId, currentStatus }: StatusChangeButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [changeType, setChangeType] = useState<StatusChangeType | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openModal = (type: StatusChangeType) => {
    setChangeType(type)
    setNotes('')
    setError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setChangeType(null)
    setNotes('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeType) return

    setLoading(true)
    setError(null)

    try {
      const result = await updateToolItemStatus(toolItemId, changeType, notes)

      if (result.success) {
        closeModal()
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const getModalTitle = () => {
    switch (changeType) {
      case 'lost':
        return '🚨 紛失報告'
      case 'disposed':
        return '🗑️ 廃棄登録'
      case 'maintenance':
        return '🔧 メンテナンス登録'
      default:
        return ''
    }
  }

  const getModalDescription = () => {
    switch (changeType) {
      case 'lost':
        return 'この道具を紛失として登録します。紛失の経緯や状況を記入してください。'
      case 'disposed':
        return 'この道具を廃棄済みとして登録します。廃棄の理由を記入してください。'
      case 'maintenance':
        return 'この道具をメンテナンス中として登録します。メンテナンス内容を記入してください。'
      default:
        return ''
    }
  }

  const getPlaceholder = () => {
    switch (changeType) {
      case 'lost':
        return '紛失した状況や最後に見た場所などを記入してください...'
      case 'disposed':
        return '廃棄の理由（故障、老朽化など）を記入してください...'
      case 'maintenance':
        return 'メンテナンス内容や実施予定日などを記入してください...'
      default:
        return ''
    }
  }

  // 現在のステータスによって表示するボタンを制限
  const canReportLost = currentStatus !== 'lost' && currentStatus !== 'disposed'
  const canDispose = currentStatus !== 'disposed'
  const canMaintenance = currentStatus !== 'lost' && currentStatus !== 'disposed'

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        {canReportLost && (
          <button
            onClick={() => openModal('lost')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            🚨 紛失報告
          </button>
        )}
        {canDispose && (
          <button
            onClick={() => openModal('disposed')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            🗑️ 廃棄登録
          </button>
        )}
        {canMaintenance && (
          <button
            onClick={() => openModal('maintenance')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
          >
            🔧 メンテナンス
          </button>
        )}
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{getModalTitle()}</h2>
            <p className="text-sm text-gray-600 mb-4">{getModalDescription()}</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  詳細 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={getPlaceholder()}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !notes.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '登録中...' : '登録する'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
