'use client'

import { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'リクエストの送信に失敗しました')
      }
    } catch (err) {
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                メール送信完了
              </h2>
              <p className="text-sm text-gray-600">
                パスワードリセットのリンクをメールで送信しました
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>📧 メールをご確認ください</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>メールに記載されたリンクをクリック</li>
                  <li>リンクの有効期限は1時間です</li>
                  <li>届かない場合は迷惑メールフォルダも確認してください</li>
                </ul>
              </div>
            </div>

            <div className="text-center pt-4 space-y-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                ログイン画面に戻る
              </Link>
              <p className="text-xs text-gray-500">
                メールが届かない場合は、再度お試しください
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* ロゴとヘッダー */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/images/zairoku-logo.png"
                alt="ザイロク"
                width={200}
                height={50}
                priority
                className="h-12 w-auto"
              />
            </div>
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              パスワードをお忘れですか？
            </h2>
            <p className="text-sm text-gray-600">
              登録されているメールアドレスを入力してください
            </p>
          </div>

          {/* フォーム */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="example@company.com"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? 'メール送信中...' : 'リセットリンクを送信'}
              </button>

              <Link
                href="/login"
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                ログイン画面に戻る
              </Link>
            </div>
          </form>

          {/* 説明テキスト */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>💡 ご注意：</strong><br />
              • パスワードリセットのリンクは1時間有効です<br />
              • メールが届かない場合は迷惑メールフォルダをご確認ください<br />
              • 登録されていないメールアドレスの場合、メールは送信されません
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
