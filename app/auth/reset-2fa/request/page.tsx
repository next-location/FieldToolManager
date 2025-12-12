/**
 * 2FAリセット要求画面
 * ユーザーがメールアドレスを入力してリセットリンクを要求する
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Request2FAResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/request-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'リクエストの送信に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                リセットリンクを送信しました
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800">
                  入力されたメールアドレスが登録されている場合、2FAリセットリンクを送信しました。
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                メールをご確認ください。リンクの有効期限は1時間です。
              </p>
              <p className="text-sm text-gray-600 mb-6">
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </p>
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ログインページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            2FAリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            認証アプリが使用できなくなった場合
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                リセット前にご確認ください
              </h3>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>バックアップコードをお持ちの場合は、それを使用してログインできます</li>
                <li>リセットすると、現在の2FA設定が削除されます</li>
                <li>再度2FAを設定する必要があります</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                登録メールアドレス
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                アカウントに登録されているメールアドレスを入力してください
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '送信中...' : 'リセットリンクを送信'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ログインページに戻る
            </Link>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              管理者にお問い合わせが必要な場合は、組織の管理者までご連絡ください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}