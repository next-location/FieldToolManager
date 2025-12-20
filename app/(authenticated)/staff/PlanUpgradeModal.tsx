'use client'

import { useState } from 'react'

interface PlanUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: string
  currentUserCount: number
  maxUsers: number
}

const PLAN_LIMITS: Record<string, number> = {
  'start': 10,
  'standard': 30,
  'business': 50,
  'pro': 100,
}

const PLAN_LABELS: Record<string, string> = {
  'start': 'スタートプラン',
  'standard': 'スタンダードプラン',
  'business': 'ビジネスプラン',
  'pro': 'プロプラン',
}

const PLAN_PRICES: Record<string, string> = {
  'start': '¥18,000/月',
  'standard': '¥45,000/月',
  'business': '¥70,000/月',
  'pro': '¥120,000/月',
}

export function PlanUpgradeModal({
  isOpen,
  onClose,
  currentPlan,
  currentUserCount,
  maxUsers,
}: PlanUpgradeModalProps) {
  const [desiredPlan, setDesiredPlan] = useState('')
  const [reason, setReason] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // 現在のプランより上位のプランのみ選択可能
  const availablePlans = Object.keys(PLAN_LIMITS).filter(
    (plan) => PLAN_LIMITS[plan] > maxUsers
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/organization/plan-upgrade-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          desired_plan: desiredPlan,
          reason,
          contact_phone: contactPhone,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
          setSuccess(false)
          setDesiredPlan('')
          setReason('')
          setContactPhone('')
        }, 3000)
      } else {
        setError(data.error || 'プランアップグレード申込に失敗しました')
      }
    } catch (err) {
      console.error('Plan upgrade request error:', err)
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setError('')
      setSuccess(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景オーバーレイ */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        {/* モーダルパネル */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">申込完了</h3>
              <p className="mt-2 text-sm text-gray-500">
                プランアップグレードの申込を受け付けました。
                <br />
                担当者から連絡いたします。
              </p>
            </div>
          ) : (
            <>
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    プランアップグレード申込
                  </h3>

                  {/* 現在の状況 */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">現在の状況</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-blue-700">
                        プラン: <span className="font-semibold">{PLAN_LABELS[currentPlan] || currentPlan}</span>
                      </p>
                      <p className="text-sm text-blue-700">
                        利用者数: <span className="font-semibold">{currentUserCount} / {maxUsers}人</span>
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 希望プラン選択 */}
                    <div>
                      <label htmlFor="desired_plan" className="block text-sm font-medium text-gray-700 mb-2">
                        希望プラン <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="desired_plan"
                        value={desiredPlan}
                        onChange={(e) => setDesiredPlan(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">選択してください</option>
                        {availablePlans.map((plan) => (
                          <option key={plan} value={plan}>
                            {PLAN_LABELS[plan]} (上限: {PLAN_LIMITS[plan]}人 / {PLAN_PRICES[plan]})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 連絡先電話番号 */}
                    <div>
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                        連絡先電話番号
                      </label>
                      <input
                        type="tel"
                        id="contact_phone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="03-1234-5678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">担当者から連絡する際の電話番号をご入力ください</p>
                    </div>

                    {/* 申込理由 */}
                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                        申込理由・ご要望（任意）
                      </label>
                      <textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="例: スタッフ増員のため、急ぎでアップグレードしたい など"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* ボタン */}
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                      <button
                        type="submit"
                        disabled={loading || !desiredPlan}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? '送信中...' : '申込む'}
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        キャンセル
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
