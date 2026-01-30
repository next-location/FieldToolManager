/**
 * 2FA セットアップコンポーネント
 * スーパーアドミン設定画面で使用
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onComplete?: () => void;
}

export default function TwoFactorSetup({ isEnabled, onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'complete'>('initial');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [disableToken, setDisableToken] = useState<string>('');
  const [disableBackupCode, setDisableBackupCode] = useState<string>('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // 2FA有効化を開始
  const handleEnable = async () => {
    setLoading(true);
    setError('');

    try {
      // CSRFトークンを取得

      const response = await fetch('/api/admin/2fa/enable', {
        method: 'POST',
        headers: {
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '2FAの有効化に失敗しました');
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // TOTPトークンを検証
  const handleVerify = async () => {
    if (token.length !== 6) {
      setError('6桁のトークンを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // CSRFトークンを取得

      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'トークンの検証に失敗しました');
      }

      setStep('complete');
      if (onComplete) onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2FA無効化
  const handleDisable = async () => {
    if (!useBackupCode && disableToken.length !== 6) {
      setError('6桁のトークンを入力してください');
      return;
    }

    if (useBackupCode && !disableBackupCode) {
      setError('バックアップコードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // CSRFトークンを取得

      const body = useBackupCode
        ? { backupCode: disableBackupCode }
        : { token: disableToken };

      const response = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '2FAの無効化に失敗しました');
      }

      alert('2FAが無効化されました');
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // バックアップコードをダウンロード
  const downloadBackupCodes = () => {
    const content = `ザイロク 2FA バックアップコード\n生成日時: ${new Date().toLocaleString('ja-JP')}\n\n${backupCodes.join('\n')}\n\n※ これらのコードは大切に保管してください\n※ 各コードは1回のみ使用できます`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isEnabled && step === 'initial') {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">2要素認証（2FA）</h3>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ 2FAは有効になっています</p>
            <p className="text-sm text-green-600 mt-1">
              アカウントは2要素認証で保護されています
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">2FAを再設定</h4>
            <p className="text-sm text-gray-600 mb-3">
              認証アプリを変更した場合や、QRコードを再度読み込む必要がある場合は、2FAを一旦無効化してから再度有効化してください。
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ 注意: 2FAを無効化すると、再度有効化するまでアカウントのセキュリティが低下します。
              </p>
            </div>

            <h5 className="font-medium mb-2 text-sm">2FAを無効化するには:</h5>

            <div className="mb-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={useBackupCode}
                  onChange={(e) => {
                    setUseBackupCode(e.target.checked);
                    setError('');
                    setDisableToken('');
                    setDisableBackupCode('');
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">
                  バックアップコードを使用する（認証アプリが使用できない場合）
                </span>
              </label>
            </div>

            {!useBackupCode ? (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  認証アプリから6桁のコードを入力してください
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 border rounded px-3 py-2 text-center text-2xl tracking-widest font-mono"
                  />
                  <button
                    onClick={handleDisable}
                    disabled={loading || disableToken.length !== 6}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '処理中...' : '無効化'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  バックアップコードを入力してください（例: ABCD-1234）
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={disableBackupCode}
                    onChange={(e) => setDisableBackupCode(e.target.value.toUpperCase())}
                    className="flex-1 border rounded px-3 py-2 text-center text-lg tracking-widest font-mono"
                  />
                  <button
                    onClick={handleDisable}
                    disabled={loading || !disableBackupCode}
                    className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '処理中...' : '無効化'}
                  </button>
                </div>
              </>
            )}
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">2要素認証（2FA）を設定</h3>

      {step === 'initial' && (
        <div className="space-y-4">
          <p className="text-gray-700">
            2要素認証（2FA）を有効にすることで、アカウントのセキュリティを強化できます。
            Google Authenticator や Authy などの認証アプリが必要です。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">認証アプリをダウンロード</h4>
            <p className="text-sm text-blue-700 mb-3">
              スマートフォンに以下のいずれかのアプリをインストールしてください：
            </p>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-blue-800">Google Authenticator</span>
                <div className="flex gap-3 text-sm mt-1">
                  <a
                    href="https://apps.apple.com/jp/app/google-authenticator/id388497605"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    📱 iOS版
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    🤖 Android版
                  </a>
                </div>
              </div>
              <div>
                <span className="font-medium text-blue-800">Microsoft Authenticator</span>
                <div className="flex gap-3 text-sm mt-1">
                  <a
                    href="https://apps.apple.com/jp/app/microsoft-authenticator/id983156458"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    📱 iOS版
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.azure.authenticator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    🤖 Android版
                  </a>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '処理中...' : '2FAを有効化'}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">ステップ1: QRコードをスキャン</h4>
            <p className="text-sm text-gray-600 mb-4">
              認証アプリ（Google Authenticator / Authy）でQRコードをスキャンしてください
            </p>
            {qrCode && (
              <div className="flex justify-center">
                <Image src={qrCode} alt="QR Code" width={200} height={200} />
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">手動入力する場合</h4>
            <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
              {secret}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">ステップ2: バックアップコードを保存 【重要】</h4>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ これらのバックアップコードは必ず保存してください
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>認証アプリを削除・紛失した場合、これらのコードだけが復旧手段です</li>
                <li>各コードは1回のみ使用可能です</li>
                <li>安全な場所に保管してください（パスワードマネージャー推奨）</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded mb-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-2 rounded border flex items-center justify-between">
                    <span>{code}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(code);
                        alert(`コード ${index + 1} をコピーしました`);
                      }}
                      className="text-gray-500 hover:text-gray-700 ml-2"
                      title="コピー"
                    >
                      📋
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                onClick={downloadBackupCodes}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                📥 バックアップコードをダウンロード
              </button>
              <button
                onClick={() => {
                  const allCodes = backupCodes.join('\n');
                  navigator.clipboard.writeText(allCodes);
                  alert('すべてのバックアップコードをコピーしました');
                }}
                className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
              >
                📋 すべてコピー
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                💡 保存方法の例：
              </p>
              <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                <li>パスワードマネージャーに保存</li>
                <li>印刷して金庫に保管</li>
                <li>暗号化されたメモアプリに保存</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            次へ
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">ステップ3: 認証コードを入力</h4>
            <p className="text-sm text-gray-600 mb-4">
              認証アプリに表示されている6桁のコードを入力してください
            </p>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="w-full border rounded px-3 py-3 text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setStep('setup')}
              className="flex-1 px-6 py-2 border rounded hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || token.length !== 6}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '検証中...' : '確認'}
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">2FAが有効になりました</h4>
            <p className="text-sm text-green-700">
              次回ログイン時から、パスワードに加えて認証コードの入力が必要になります。
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            完了
          </button>
        </div>
      )}
    </div>
  );
}
