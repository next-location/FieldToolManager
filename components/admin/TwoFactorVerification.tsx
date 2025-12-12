/**
 * 2FA 検証コンポーネント（ログイン時）
 * ログインページで使用
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TwoFactorVerificationProps {
  userId: string;
  email: string;
}

export default function TwoFactorVerification({ userId, email }: TwoFactorVerificationProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleVerify = async () => {
    // バリデーション
    if (mode === 'totp' && token.length !== 6) {
      setError('6桁のコードを入力してください');
      return;
    }

    if (mode === 'backup' && !/^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(token)) {
      setError('バックアップコードの形式が正しくありません（例: XXXX-XXXX）');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token,
          isBackupCode: mode === 'backup',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '検証に失敗しました');
      }

      // バックアップコード使用時は警告を表示
      if (data.usedBackupCode) {
        alert('バックアップコードを使用しました。残りのバックアップコードを確認してください。');
      }

      // ログイン成功
      router.push(data.redirect || '/admin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleVerify();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            2要素認証
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {email}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* モード切り替えタブ */}
          <div className="flex border-b">
            <button
              onClick={() => {
                setMode('totp');
                setToken('');
                setError('');
              }}
              className={`flex-1 py-2 px-4 text-center font-medium border-b-2 transition-colors ${
                mode === 'totp'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              認証アプリ
            </button>
            <button
              onClick={() => {
                setMode('backup');
                setToken('');
                setError('');
              }}
              className={`flex-1 py-2 px-4 text-center font-medium border-b-2 transition-colors ${
                mode === 'backup'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              バックアップコード
            </button>
          </div>

          {/* TOTPモード */}
          {mode === 'totp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  認証コード
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  認証アプリ（Google Authenticator / Authy）に表示されている6桁のコードを入力してください
                </p>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={handleKeyPress}
                  className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* バックアップコードモード */}
          {mode === 'backup' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  バックアップコード
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  2FA設定時に保存したバックアップコードを入力してください（形式: XXXX-XXXX）
                </p>
                <input
                  type="text"
                  maxLength={9}
                  placeholder="XXXX-XXXX"
                  value={token}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, '');
                    // 自動的にハイフンを挿入
                    if (value.length > 4 && !value.includes('-')) {
                      value = value.slice(0, 4) + '-' + value.slice(4);
                    }
                    setToken(value);
                  }}
                  onKeyPress={handleKeyPress}
                  className="w-full border rounded-lg px-4 py-3 text-center text-xl tracking-wider font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  バックアップコードは1回のみ使用できます。使用後は新しいコードを生成することをお勧めします。
                </p>
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 検証ボタン */}
          <button
            onClick={handleVerify}
            disabled={loading || token.length === 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '検証中...' : '確認'}
          </button>

          {/* ログインに戻る */}
          <div className="text-center">
            <button
              onClick={() => window.location.href = '/admin/login'}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
