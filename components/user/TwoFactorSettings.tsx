'use client';

import { useState, useEffect } from 'react';
import { Shield, Smartphone, Copy, CheckCircle, AlertCircle, X, Mail } from 'lucide-react';

interface TwoFactorSettingsProps {
  userId: string;
  userEmail: string;
  initialEnabled?: boolean;
}

export default function TwoFactorSettings({ userId, userEmail, initialEnabled = false }: TwoFactorSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [setupMethod, setSetupMethod] = useState<'totp' | 'email'>('totp');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [tempToken, setTempToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCodes, setCopiedCodes] = useState<Set<number>>(new Set());

  // 2FA有効化の開始
  const startEnable2FA = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // メール方式の場合、メールアドレスのバリデーション
    if (setupMethod === 'email') {
      if (!twoFactorEmail) {
        setError('2FA用のメールアドレスを入力してください');
        setLoading(false);
        return;
      }
      if (twoFactorEmail === userEmail) {
        setError('ログインメールアドレスとは異なるメールアドレスを入力してください');
        setLoading(false);
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(twoFactorEmail)) {
        setError('有効なメールアドレスを入力してください');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          method: setupMethod,
          email: setupMethod === 'email' ? twoFactorEmail : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '2FA設定の開始に失敗しました');
      }

      const data = await response.json();

      if (setupMethod === 'totp') {
        setQrCode(data.qrCode);
        setBackupCodes(data.backupCodes);
      }

      setTempToken(data.tempToken);
      setShowSetup(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2FA有効化の確認
  const verify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('6桁の認証コードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: verificationCode,
          tempToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '認証に失敗しました');
      }

      setSuccess('2FAを有効化しました');
      setEnabled(true);
      setShowSetup(false);
      setVerificationCode('');
      setQrCode('');
      setBackupCodes([]);
      setTempToken('');

      // 2FA設定完了したのでリマインダーフラグをクリア
      localStorage.removeItem('should2FASetup');
      localStorage.removeItem('hide2FAReminder');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2FA無効化
  const disable2FA = async () => {
    if (!disableCode || disableCode.length < 6) {
      setError('認証コードまたはバックアップコードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isBackupCode = disableCode.length === 8;
      const response = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          isBackupCode
            ? { backupCode: disableCode }
            : { token: disableCode }
        ),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '2FA無効化に失敗しました');
      }

      setSuccess('2FAを無効化しました');
      setEnabled(false);
      setShowDisable(false);
      setDisableCode('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // バックアップコードのコピー
  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodes(new Set([...copiedCodes, index]));
    setTimeout(() => {
      setCopiedCodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 2000);
  };

  // すべてのバックアップコードをコピー
  const copyAllBackupCodes = () => {
    const allCodes = backupCodes.join('\n');
    navigator.clipboard.writeText(allCodes);
    setCopiedCodes(new Set(backupCodes.map((_, i) => i)));
    setTimeout(() => {
      setCopiedCodes(new Set());
    }, 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold">二要素認証（2FA）</h2>
        </div>
        {enabled ? (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            有効
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
            無効
          </span>
        )}
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
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* メイン画面 */}
      {!showSetup && !showDisable && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            二要素認証を有効にすると、ログイン時にパスワードに加えて追加の認証が必要になります。
          </p>
          {enabled ? (
            <button
              onClick={() => setShowDisable(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              2FAを無効化
            </button>
          ) : (
            <div className="space-y-4">
              {/* 認証方式の選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  認証方式を選択
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupMethod('totp')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      setupMethod === 'totp'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium">認証アプリ（TOTP）</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Google Authenticator等
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupMethod('email')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      setupMethod === 'email'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mail className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium">メール認証</div>
                    <div className="text-xs text-gray-500 mt-1">
                      別のメールアドレス
                    </div>
                  </button>
                </div>
              </div>

              {/* メール方式の場合、メールアドレス入力 */}
              {setupMethod === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    2FA用メールアドレス
                  </label>
                  <input
                    type="email"
                    value={twoFactorEmail}
                    onChange={(e) => setTwoFactorEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ※ ログインメールアドレス（{userEmail}）とは異なるメールアドレスを入力してください
                  </p>
                </div>
              )}

              <button
                onClick={startEnable2FA}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                2FAを有効化
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2FA設定画面 */}
      {showSetup && (
        <div className="space-y-4">
          {setupMethod === 'totp' ? (
            <>
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
                  <button
                    onClick={() => {
                      setShowSetup(false);
                      setQrCode('');
                      setBackupCodes([]);
                      setVerificationCode('');
                      setTempToken('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* メール方式のセットアップ */}
              <div className="border-b pb-4">
                <h3 className="font-medium mb-2">ステップ1: メール確認</h3>
                <p className="text-sm text-gray-600 mb-2">
                  登録したメールアドレスに確認コードを送信しました：
                </p>
                <p className="text-sm font-medium text-blue-600">{twoFactorEmail}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">ステップ2: 確認コードを入力</h3>
                <p className="text-sm text-gray-600 mb-3">
                  メールで受信した6桁のコードを入力してください：
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
                  <button
                    onClick={() => {
                      setShowSetup(false);
                      setVerificationCode('');
                      setTempToken('');
                      setTwoFactorEmail('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2FA無効化画面 */}
      {showDisable && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">2FAを無効化</h3>
            <p className="text-sm text-gray-600 mb-3">
              認証アプリの6桁のコード、またはバックアップコードを入力してください：
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="コードを入力"
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={disable2FA}
                disabled={loading || disableCode.length < 6}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                無効化
              </button>
              <button
                onClick={() => {
                  setShowDisable(false);
                  setDisableCode('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}