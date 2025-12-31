'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Lock, ArrowLeft, Mail, Key, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function PasswordChangePage() {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'verify' | 'complete'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: 現在のパスワード入力
  const [currentPassword, setCurrentPassword] = useState('');

  // Step 2: 確認コードと新しいパスワード入力
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // パスワード表示切り替え
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: 確認コード送信リクエスト
  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // CSRFトークンを取得
      const csrfResponse = await fetch('/api/admin/csrf');
      const { token: csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/admin/password/request-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'リクエストに失敗しました');
      }

      setSuccess('確認コードをメールで送信しました');
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: パスワード変更実行
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // パスワード一致確認
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      setLoading(false);
      return;
    }

    try {
      // CSRFトークンを取得
      const csrfResponse = await fetch('/api/admin/csrf');
      const { token: csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/admin/password/verify-and-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          verificationCode,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'パスワード変更に失敗しました');
      }

      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName="管理者" />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-2xl mx-auto">
            {/* ヘッダー */}
            <div className="mb-6">
              <Link
                href="/admin/settings/security"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                セキュリティ設定に戻る
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="w-6 h-6" />
                パスワード変更
              </h1>
            </div>

            {/* Step 1: 現在のパスワード入力 */}
            {step === 'input' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">ステップ1: 本人確認</h2>
                  <p className="text-sm text-gray-600">
                    現在のパスワードを入力してください。確認コードをメールで送信します。
                  </p>
                </div>

                <form onSubmit={handleRequestChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      現在のパスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full border rounded px-3 py-2 pr-10"
                        placeholder="現在のパスワードを入力"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !currentPassword}
                    className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '送信中...' : '確認コードを送信'}
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: 確認コードと新しいパスワード入力 */}
            {step === 'verify' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">ステップ2: パスワード変更</h2>
                  <p className="text-sm text-gray-600">
                    メールで送信された6桁の確認コードと新しいパスワードを入力してください。
                  </p>
                </div>

                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800">
                        確認コードを記載したメールを送信しました。
                        メールが届かない場合は、迷惑メールフォルダをご確認ください。
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      確認コード（6桁）
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full border rounded px-3 py-2 text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="w-full border rounded px-3 py-2 pr-10"
                        placeholder="8文字以上、大小英数字記号を含む"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      8文字以上、大文字・小文字・数字・記号を含めてください
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      新しいパスワード（確認）
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="w-full border rounded px-3 py-2 pr-10"
                        placeholder="もう一度入力してください"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="flex-1 px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      戻る
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !verificationCode || !newPassword || !confirmPassword}
                      className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? '変更中...' : 'パスワードを変更'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: 完了 */}
            {step === 'complete' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Key className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    パスワードを変更しました
                  </h2>

                  <p className="text-gray-600 mb-6">
                    パスワードが正常に変更されました。
                    確認メールを送信しましたので、ご確認ください。
                  </p>

                  <Link
                    href="/admin/settings/security"
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    セキュリティ設定に戻る
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
