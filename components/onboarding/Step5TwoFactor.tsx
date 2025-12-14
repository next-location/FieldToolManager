'use client'

import { useState } from 'react'
import { Shield, Smartphone, Copy, CheckCircle, AlertCircle } from 'lucide-react'

interface Step5TwoFactorProps {
  formData: any
  updateFormData: (updates: any) => void
  onNext: () => void
  onBack: () => void
  isLoading: boolean
  userId: string
}

export default function Step5TwoFactor({
  formData,
  updateFormData,
  onNext,
  onBack,
  isLoading,
  userId
}: Step5TwoFactorProps) {
  const [qrCode, setQrCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [tempToken, setTempToken] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState<Set<number>>(new Set())
  const [skip2FA, setSkip2FA] = useState(false)
  const [method, setMethod] = useState<'app' | 'email'>('app')
  const [alternateEmail, setAlternateEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // 2FA有効化の開始
  const start2FASetup = async () => {
    setLoading(true)
    setError('')

    try {
      if (method === 'app') {
        // アプリベースの2FA
        const response = await fetch('/api/user/2fa/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '2FA設定の開始に失敗しました')
        }

        const data = await response.json()
        setQrCode(data.qrCode)
        setBackupCodes(data.backupCodes)
        setTempToken(data.tempToken)
      } else {
        // メールベースの2FA
        const emailToUse = alternateEmail || formData.email || ''

        const response = await fetch('/api/auth/2fa/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: formData.email || '',
            alternateEmail: emailToUse,
            purpose: 'setup',
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'メールの送信に失敗しました')
        }

        setEmailSent(true)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 2FA有効化の確認
  const verify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('6桁の認証コードを入力してください')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: verificationCode,
          tempToken,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '認証に失敗しました')
      }

      setSuccess(true)
      updateFormData({ twoFactorEnabled: true })

      // 2秒後に次のステップへ
      setTimeout(() => {
        onNext()
      }, 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // バックアップコードのコピー
  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedCodes(new Set([...copiedCodes, index]))
    setTimeout(() => {
      setCopiedCodes(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }, 2000)
  }

  // すべてのバックアップコードをコピー
  const copyAllBackupCodes = () => {
    const allCodes = backupCodes.join('\n')
    navigator.clipboard.writeText(allCodes)
    setCopiedCodes(new Set(backupCodes.map((_, i) => i)))
    setTimeout(() => {
      setCopiedCodes(new Set())
    }, 2000)
  }

  // 2FAをスキップ
  const handleSkip = () => {
    setSkip2FA(true)
    updateFormData({ twoFactorEnabled: false })
    onNext()
  }

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold">二要素認証の設定</h2>
        </div>
        <p className="text-gray-600">
          セキュリティ強化のため、二要素認証（2FA）の設定を強く推奨します
        </p>
      </div>

      {/* エラー/成功メッセージ */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800">2FAを有効化しました！</p>
        </div>
      )}

      {!qrCode && !emailSent && !success && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">二要素認証とは？</h3>
            <p className="text-sm text-gray-700">
              パスワードに加えて、追加の認証方法を使用してログインする仕組みです。
              不正アクセスから組織のデータを守る重要なセキュリティ機能です。
            </p>
          </div>

          {/* 認証方法の選択 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">認証方法を選択</h3>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="2fa-method"
                  value="app"
                  checked={method === 'app'}
                  onChange={(e) => setMethod('app')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">認証アプリ（推奨）</div>
                  <div className="text-sm text-gray-600">
                    Google Authenticator、Microsoft Authenticator、Authyなどのアプリを使用
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="2fa-method"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod('email')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">メール認証</div>
                  <div className="text-sm text-gray-600">
                    登録メールアドレスまたは別のメールアドレスに認証コードを送信
                  </div>
                </div>
              </label>
            </div>

            {method === 'email' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  認証コードを受信するメールアドレス（任意）
                </label>
                <input
                  type="email"
                  value={alternateEmail}
                  onChange={(e) => setAlternateEmail(e.target.value)}
                  placeholder="別のメールアドレスを使用する場合は入力"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  空欄の場合、登録メールアドレスに送信されます
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={start2FASetup}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              2FAを設定する（推奨）
            </button>
            <button
              onClick={handleSkip}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              後で設定する
            </button>
          </div>
        </div>
      )}

      {emailSent && !success && (
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">認証コードを確認</h3>
            <p className="text-sm text-gray-600">
              {alternateEmail || formData.email}に6桁の認証コードを送信しました。
              メールをご確認ください。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              認証コード
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 px-3 py-2 border rounded text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
              <button
                onClick={verify2FA}
                disabled={loading || verificationCode.length !== 6}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                確認して有効化
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              コードは10分間有効です
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setEmailSent(false)
                setVerificationCode('')
                setMethod('app')
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={start2FASetup}
              disabled={loading}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              コードを再送信
            </button>
          </div>
        </div>
      )}

      {qrCode && !success && (
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">ステップ1: 認証アプリをインストール</h3>
            <p className="text-sm text-gray-600 mb-2">
              以下のいずれかのアプリをスマートフォンにインストールしてください：
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
            </ul>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">ステップ2: QRコードをスキャン</h3>
            {qrCode && (
              <div className="flex justify-center my-4">
                <img src={qrCode} alt="2FA QR Code" className="border p-2" />
              </div>
            )}
            <p className="text-xs text-gray-500 text-center">
              QRコードをスキャンできない場合は、アプリで手動入力してください
            </p>
          </div>

          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">ステップ3: バックアップコードを保存</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ これらのバックアップコードは必ず保存してください
              </p>
              <p className="text-xs text-red-700">
                スマートフォンを紛失した場合、これらのコードがアカウントへアクセスする唯一の方法となります。
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">バックアップコード</p>
                <button
                  onClick={copyAllBackupCodes}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  すべてコピー
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between bg-white px-2 py-1 rounded border">
                    <code className="text-xs font-mono">{code}</code>
                    <button
                      onClick={() => copyBackupCode(code, index)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      {copiedCodes.has(index) ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">ステップ4: 確認コードを入力</h3>
            <p className="text-sm text-gray-600 mb-3">
              認証アプリに表示されている6桁のコードを入力してください：
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
              <button
                onClick={verify2FA}
                disabled={loading || verificationCode.length !== 6}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                確認して有効化
              </button>
            </div>
          </div>
        </div>
      )}

      {!qrCode && !success && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            戻る
          </button>
        </div>
      )}
    </div>
  )
}