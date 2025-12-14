'use client'

import { useState } from 'react'
import { login } from './actions'
import { Shield, Mail, ArrowRight, HelpCircle, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [tempCredentials, setTempCredentials] = useState<{ email: string; password: string }>({ email: '', password: '' })
  const [twoFAMethod, setTwoFAMethod] = useState<'totp' | 'email'>('totp')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // 一時的に認証情報を保存（2FA用）
    setTempCredentials({ email, password })

    try {
      // まずはログインAPIを呼び出す
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      console.log('[LOGIN PAGE] Response status:', response.status)
      console.log('[LOGIN PAGE] Response data:', data)

      if (!response.ok) {
        console.log('[LOGIN PAGE] Setting error:', data.error || 'ログインに失敗しました')
        setError(data.error || 'ログインに失敗しました')
        setLoading(false)
        return
      }

      // 2FAが必要な場合
      if (data.requires2FA) {
        setUserId(data.userId)
        // 2FA方式を設定（メール方式の場合は自動的にemailに切り替え）
        if (data.twoFactorMethod === 'email') {
          setTwoFAMethod('email')
        }
        setShow2FA(true)
        setLoading(false)
      } else if (data.should2FASetup) {
        // 2FA必須だが未設定の場合、ログインは成功
        // リマインダー表示のためにフラグを保存
        localStorage.setItem('should2FASetup', 'true')
        localStorage.setItem('userId', data.userId)
        window.location.href = '/'
      } else {
        // 2FA不要の場合は認証完了、ダッシュボードにリダイレクト
        localStorage.removeItem('should2FASetup')
        localStorage.removeItem('userId')
        window.location.href = '/'
      }
    } catch (err: any) {
      console.error('[LOGIN] Error:', err)
      setError(err.message || 'ログインに失敗しました')
      setLoading(false)
    }
  }

  async function handle2FASubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string

    try {
      // 2FA検証
      const response = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          code,
          method: twoFAMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '認証に失敗しました')
        setLoading(false)
        return
      }

      // 2FA成功後、ダッシュボードにリダイレクト
      // 2FA設定済みなのでリマインダーフラグをクリア
      localStorage.removeItem('should2FASetup')
      localStorage.removeItem('userId')
      localStorage.removeItem('hide2FAReminder')
      window.location.href = '/'
    } catch (err: any) {
      console.error('[2FA] Error:', err)
      setError(err.message || '認証に失敗しました')
      setLoading(false)
    }
  }

  async function requestEmailCode() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/2fa/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'メール送信に失敗しました')
      } else {
        setError(null)
        alert('認証コードをメールで送信しました')
      }
    } catch (err: any) {
      setError('メール送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 p-4 rounded-full">
                  <Shield className="w-10 h-10 text-blue-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                二要素認証
              </h2>
              <p className="text-sm text-gray-600">
                セキュリティコードを入力してください
              </p>
            </div>

            {/* 認証方法の選択 */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTwoFAMethod('totp')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  twoFAMethod === 'totp'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                認証アプリ
              </button>
              <button
                type="button"
                onClick={() => {
                  setTwoFAMethod('email')
                  requestEmailCode()
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  twoFAMethod === 'email'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                メール
              </button>
            </div>

            <form className="space-y-6" onSubmit={handle2FASubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  {twoFAMethod === 'totp'
                    ? '認証コード'
                    : 'メール認証コード'}
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg tracking-widest text-center"
                  placeholder={twoFAMethod === 'totp' ? "000000" : "000000"}
                  autoComplete="one-time-code"
                  maxLength={8}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {twoFAMethod === 'totp'
                    ? '認証アプリの6桁のコード、またはバックアップコード（8桁）を入力'
                    : 'メールで受信した6桁のコードを入力'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false)
                    setError(null)
                  }}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? '確認中...' : (
                    <>
                      認証
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <a
                  href="/auth/reset-2fa"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  2FAでログインできない場合
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* 左側：ログインフォーム */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* ロゴ */}
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <Image
                src="/images/zairoku-logo.png"
                alt="ザイロク"
                width={240}
                height={60}
                priority
                className="h-16 w-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ようこそ
            </h2>
            <p className="text-sm text-gray-600">
              アカウントにログインしてください
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="example@company.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                パスワードをお忘れですか？
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                'ログイン中...'
              ) : (
                <>
                  ログイン
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* フッターリンク */}
          <div className="text-center space-y-4 pt-6 border-t border-gray-200">
            <Link
              href="mailto:support@zairoku.com"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              運営への問い合わせ
            </Link>
          </div>
        </div>
      </div>

      {/* 右側：装飾エリア（デスクトップのみ表示） */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12">
        <div className="max-w-md text-white space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            現場の業務を<br />
            スマートに管理
          </h2>
          <p className="text-lg text-blue-100">
            ザイロクは建設・塗装などの現場業務を効率化するクラウド型管理システムです
          </p>
          <div className="space-y-3 text-blue-100">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-1 mt-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>QRコードで簡単に工具・資産を追跡</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-1 mt-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>リアルタイムで在庫・位置を把握</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-1 mt-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>スマートフォンから簡単に入出庫管理</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
