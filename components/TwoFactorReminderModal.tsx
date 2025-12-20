'use client'

import { useState, useEffect } from 'react'
import { Shield, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TwoFactorReminderModal() {
  const [show, setShow] = useState(false)
  const [dontShowToday, setDontShowToday] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // localStorage から2FA設定フラグを確認
    const should2FASetup = localStorage.getItem('should2FASetup')

    if (should2FASetup === 'true') {
      // 今日の日付を取得
      const today = new Date().toISOString().split('T')[0]
      const hiddenUntil = localStorage.getItem('hide2FAReminder')

      // 今日は表示しない設定がされているか確認
      if (hiddenUntil !== today) {
        setShow(true)
      }
    }
  }, [])

  const handleClose = () => {
    if (dontShowToday) {
      // 今日の日付を保存（翌日には再度表示される）
      const today = new Date().toISOString().split('T')[0]
      localStorage.setItem('hide2FAReminder', today)
    }
    setShow(false)
  }

  const handleGoToSettings = () => {
    // 2FA設定ページに遷移
    router.push('/settings?tab=security')
    setShow(false)
  }

  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              二要素認証の設定をおすすめします
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* メッセージ */}
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              あなたの権限では、二要素認証（2FA）の設定が推奨されています。
              アカウントのセキュリティを強化するため、できるだけ早く設定してください。
            </p>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">2FAを設定すると：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>不正アクセスからアカウントを保護</li>
              <li>認証アプリまたはメールで二段階認証</li>
              <li>より安全なログインプロセス</li>
            </ul>
          </div>
        </div>

        {/* 今日は表示しないチェックボックス */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              今日はこのメッセージを表示しない
            </span>
          </label>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <button
            onClick={handleGoToSettings}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            今すぐ設定する
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            後で設定する
          </button>
        </div>

        {/* 注意事項 */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          ※ このメッセージは毎回ログイン時に表示されます
        </p>
      </div>
    </div>
  )
}
