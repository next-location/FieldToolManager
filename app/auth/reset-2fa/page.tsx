/**
 * 2FAリセット実行画面
 * メールのリンクから遷移してリセットを実行
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Reset2FAPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('リセットトークンが見つかりません');
    }
  }, [token]);

  const handleReset = async () => {
    if (!token) {
      setError('リセットトークンが必要です');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // 5秒後にログインページへリダイレクト
        setTimeout(() => {
          router.push('/login');
        }, 5000);
      } else {
        setError(data.error || '2FAのリセットに失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                2FAをリセットしました
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800">
                  2FA（二要素認証）が正常にリセットされました。
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                ログイン後、設定画面から再度2FAを設定してください。
              </p>
              <p className="text-sm text-gray-500 mb-6">
                5秒後にログインページへ移動します...
              </p>
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                今すぐログインページへ
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
            2FAリセットの確認
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            二要素認証をリセットします
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          {!token ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">
                  無効なリセットリンクです
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                リセットトークンが見つかりません。メールのリンクから再度アクセスしてください。
              </p>
              <Link
                href="/auth/reset-2fa/request"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                リセットを再度要求する
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">
                    リセットを実行すると
                  </h3>
                  <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                    <li>現在の2FA設定が完全に削除されます</li>
                    <li>認証アプリの設定も無効になります</li>
                    <li>バックアップコードも使用できなくなります</li>
                    <li>再度2FAを設定する必要があります</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'リセット中...' : '2FAをリセット'}
                </button>

                <Link
                  href="/login"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  キャンセル
                </Link>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  このリンクの有効期限は1時間です
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}