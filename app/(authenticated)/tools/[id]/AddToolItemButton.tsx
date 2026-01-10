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
  const [mode, setMode] = useState<'single' | 'bulk'>('single') // 単一 or 一括
  const [serialNumber, setSerialNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [bulkCount, setBulkCount] = useState(5) // 一括登録数
  const [startNumber, setStartNumber] = useState('001') // 開始番号
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // モーダルを開く際に既存のシリアル番号を取得して次の番号を提案
  const handleOpenModal = async () => {
    setIsModalOpen(true)

    try {
      const supabase = createClient()

      // 既存のアイテムのシリアル番号を取得（削除済みを除く）
      const { data: items } = await supabase
        .from('tool_items')
        .select('serial_number')
        .eq('tool_id', toolId)
        .is('deleted_at', null)
        .order('serial_number', { ascending: false })
        .limit(1)

      if (items && items.length > 0) {
        const lastSerial = items[0].serial_number
        // 数字部分を抽出して+1
        const match = lastSerial.match(/(\d+)/)
        if (match) {
          const nextNum = parseInt(match[1]) + 1
          const paddedNum = String(nextNum).padStart(3, '0')
          setStartNumber(paddedNum)
        }
      }
    } catch (err) {
      console.error('Failed to fetch serial numbers:', err)
    }
  }

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

      if (mode === 'single') {
        // 単一登録
        await createSingleItem(supabase, userData.organization_id, user.id)
      } else {
        // 一括登録
        await createBulkItems(supabase, userData.organization_id, user.id)
      }

      // 成功したらモーダルを閉じてページをリフレッシュ
      setIsModalOpen(false)
      setSerialNumber('')
      setNotes('')
      setMode('single')
      router.refresh()
    } catch (err: any) {
      console.error('Error adding tool item:', err)
      setError(err.message || '登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 単一アイテム作成
  const createSingleItem = async (supabase: any, organizationId: string, userId: string) => {
    const { data: qrData } = await supabase.rpc('gen_random_uuid')
    const qrCode = qrData || crypto.randomUUID()

    const { data: newItem, error: insertError } = await supabase
      .from('tool_items')
      .insert({
        tool_id: toolId,
        organization_id: organizationId,
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
    await supabase.from('tool_movements').insert({
      organization_id: organizationId,
      tool_id: toolId,
      movement_type: 'adjustment',
      quantity: 1,
      performed_by: userId,
      notes: `個別アイテム追加: ${serialNumber}`,
    })

    // 新しいアイテムにスクロール
    if (newItem?.id) {
      setTimeout(() => {
        const element = document.getElementById(`item-${newItem.id}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  // 一括アイテム作成
  const createBulkItems = async (supabase: any, organizationId: string, userId: string) => {
    const items = []
    const baseNum = parseInt(startNumber)

    for (let i = 0; i < bulkCount; i++) {
      const serialNum = String(baseNum + i).padStart(3, '0')
      const { data: qrData } = await supabase.rpc('gen_random_uuid')
      const qrCode = qrData || crypto.randomUUID()

      items.push({
        tool_id: toolId,
        organization_id: organizationId,
        serial_number: serialNum,
        qr_code: qrCode,
        current_location: 'warehouse',
        status: 'available',
        notes: null,
      })
    }

    // 一括挿入
    const { error: insertError } = await supabase.from('tool_items').insert(items)

    if (insertError) {
      throw insertError
    }

    // 在庫調整履歴を記録
    await supabase.from('tool_movements').insert({
      organization_id: organizationId,
      tool_id: toolId,
      movement_type: 'adjustment',
      quantity: bulkCount,
      performed_by: userId,
      notes: `個別アイテム一括追加: ${startNumber}～${String(baseNum + bulkCount - 1).padStart(3, '0')} (${bulkCount}個)`,
    })
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
      >
        + 個別アイテムを追加
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">個別アイテムを追加</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setMode('single')
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{toolName}</span> の個別アイテムを追加します
              </p>
              <p className="text-xs text-gray-500 mt-1">QRコードは自動生成されます</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            {/* モード選択 */}
            <div className="mb-4 flex space-x-2">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                単一登録
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'bulk'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                一括登録
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'single' ? (
                // 単一登録モード
                <>
                  <div className="mb-4">
                    <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-1">
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
                    <p className="text-xs text-gray-500 mt-1">一意の識別番号を入力してください</p>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
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
                </>
              ) : (
                // 一括登録モード
                <>
                  <div className="mb-4">
                    <label htmlFor="bulk_count" className="block text-sm font-medium text-gray-700 mb-1">
                      追加する個数 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="bulk_count"
                      value={bulkCount}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          setBulkCount('' as any) // 空入力を許可
                        } else {
                          setBulkCount(Math.max(1, Math.min(100, parseInt(val) || 1)))
                        }
                      }}
                      onBlur={(e) => {
                        // フォーカスが外れた時に空なら1に戻す
                        if (e.target.value === '') {
                          setBulkCount(1)
                        }
                      }}
                      min="1"
                      max="100"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">1～100個まで指定できます</p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="start_number" className="block text-sm font-medium text-gray-700 mb-1">
                      開始番号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="start_number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: 001"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {startNumber} ～{' '}
                      {String(parseInt(startNumber) + bulkCount - 1).padStart(3, '0')} の{bulkCount}
                      個が登録されます
                    </p>
                  </div>

                  <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      ℹ️ 一括登録後、個別に備考を追加したい場合は各アイテムの編集画面から行えます
                    </p>
                  </div>
                </>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setMode('single')
                  }}
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
                  {isSubmitting
                    ? '登録中...'
                    : mode === 'single'
                      ? '登録'
                      : `${bulkCount}個を一括登録`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
