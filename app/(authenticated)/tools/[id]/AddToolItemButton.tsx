'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AddToolItemButtonProps {
  toolId: string
  toolName: string
}

export function AddToolItemButton({ toolId, toolName }: AddToolItemButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [serialNumber, setSerialNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // ユーザー情報と組織IDを取得
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('ログインしてください')
        setIsSubmitting(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        setError('ユーザー情報が取得できませんでした')
        setIsSubmitting(false)
        return
      }

      // UUIDベースのQRコードを生成
      const { data: qrData } = await supabase.rpc('gen_random_uuid')
      const qrCode = qrData || crypto.randomUUID()

      // tool_itemsテーブルに挿入
      const { data: newItem, error: insertError } = await supabase
        .from('tool_items')
        .insert({
          tool_id: toolId,
          organization_id: userData?.organization_id,
          serial_number: serialNumber,
          qr_code: qrCode,
          current_location: 'warehouse',
          status: 'available',
          notes: notes || null,
        })
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      // 在庫調整履歴を記録
      const { error: movementError } = await supabase
        .from('tool_movements')
        .insert({
          organization_id: userData?.organization_id,
          tool_id: toolId,
          movement_type: 'adjustment',
          quantity: 1,
          performed_by: user.id,
          notes: `個別アイテム追加: ${serialNumber}`,
        })

      if (movementError) {
        console.error('Failed to record movement:', movementError)
      }

      // 成功したらモーダルを閉じてページをリフレッシュ
      setIsModalOpen(false)
      setSerialNumber('')
      setNotes('')
      router.refresh()

      // 新しいアイテムにスクロール
      if (newItem?.id) {
        setTimeout(() => {
          const element = document.getElementById(`item-${newItem.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    } catch (err: any) {
      console.error('Error adding tool item:', err)
      setError(err.message || '登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
      >
        + 個別アイテムを追加
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                個別アイテムを追加
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{toolName}</span> の個別アイテムを追加します
              </p>
              <p className="text-xs text-gray-500 mt-1">
                QRコードは自動生成されます
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="serial_number"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  シリアル番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="serial_number"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 001, A-001, など"
                />
                <p className="text-xs text-gray-500 mt-1">
                  一意の識別番号を入力してください
                </p>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  備考
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="メモや特記事項があれば入力"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
