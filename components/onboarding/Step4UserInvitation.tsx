'use client'

import { useState } from 'react'
import type { OnboardingFormData } from '@/types/organization'

interface Step4Props {
  formData: OnboardingFormData
  updateFormData: (updates: Partial<OnboardingFormData>) => void
  onBack: () => void
  onComplete: () => void
  isLoading: boolean
}

export default function Step4UserInvitation({
  formData,
  updateFormData,
  onBack,
  onComplete,
  isLoading,
}: Step4Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'leader' | 'staff'>('staff')

  const addUser = () => {
    if (email.trim()) {
      updateFormData({
        inviteUsers: [...formData.inviteUsers, { email: email.trim(), role }],
      })
      setEmail('')
      setRole('staff')
    }
  }

  const removeUser = (index: number) => {
    updateFormData({
      inviteUsers: formData.inviteUsers.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete()
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-gray-800">ステップ 4/4: ユーザー招待</h2>
      <p className="mb-6 text-gray-600">
        チームメンバーを招待してください（後から追加することも可能です）
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ユーザー追加フォーム */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-lg font-semibold text-gray-700">メンバーを追加</h3>

          <div className="mb-3 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス"
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'leader' | 'staff')}
              className="rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="staff">スタッフ</option>
              <option value="leader">リーダー</option>
              <option value="admin">管理者</option>
            </select>
            <button
              type="button"
              onClick={addUser}
              className="rounded-md bg-gray-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-700"
            >
              追加
            </button>
          </div>

          {/* 権限説明 */}
          <div className="text-xs text-gray-600">
            <p className="mb-1">
              <strong>スタッフ:</strong> 道具の貸出・返却、在庫確認
            </p>
            <p className="mb-1">
              <strong>リーダー:</strong> スタッフ権限 + 承認、レポート閲覧
            </p>
            <p>
              <strong>管理者:</strong> 全権限（設定変更、ユーザー管理など）
            </p>
          </div>
        </div>

        {/* 招待リスト */}
        {formData.inviteUsers.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              招待するメンバー ({formData.inviteUsers.length}名)
            </h3>
            <div className="space-y-2">
              {formData.inviteUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      権限:{' '}
                      {user.role === 'admin'
                        ? '管理者'
                        : user.role === 'leader'
                          ? 'リーダー'
                          : 'スタッフ'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUser(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 注意事項 */}
        <div className="rounded-lg bg-green-50 p-4">
          <p className="mb-2 text-sm font-semibold text-green-800">
            ✅ セットアップの最終ステップです
          </p>
          <p className="text-sm text-green-700">
            招待したメンバーにはメールで通知が送信されます。メンバーは後からいつでも追加できます。
          </p>
        </div>

        {/* ボタン */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="rounded-md border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-green-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'セットアップ中...' : 'セットアップ完了'}
          </button>
        </div>
      </form>
    </div>
  )
}
