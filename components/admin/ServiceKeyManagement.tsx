'use client';

import { useState } from 'react';
import { AlertTriangle, Key, RefreshCw, Shield, Copy, Eye, EyeOff } from 'lucide-react';

export default function ServiceKeyManagement() {
  const [newKey, setNewKey] = useState('');
  const [encryptedKey, setEncryptedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showEncrypted, setShowEncrypted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [instructions, setInstructions] = useState<string[]>([]);

  const handleRotateKey = async () => {
    if (!newKey) {
      setError('新しいサービスキーを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/admin/keys/rotate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newServiceKey: newKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'キーローテーションに失敗しました');
      }

      setEncryptedKey(data.encryptedKey);
      setInstructions(data.instructions || []);
      setSuccess(true);
      setNewKey(''); // セキュリティのため入力をクリア
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('クリップボードにコピーしました');
    } catch (err) {
      alert('コピーに失敗しました');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900">
          Supabaseサービスキー管理
        </h2>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">重要なセキュリティ機能</p>
            <p>
              サービスロールキーは最高レベルの権限を持つため、暗号化して管理することが重要です。
              キーローテーションは定期的に実施してください。
            </p>
          </div>
        </div>
      </div>

      {/* キーローテーションフォーム */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            新しいサービスロールキー
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="service_role_key_..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              disabled={loading}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Supabaseダッシュボードから新しいサービスロールキーをコピーして貼り付けてください
          </p>
        </div>

        <button
          onClick={handleRotateKey}
          disabled={loading || !newKey}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              処理中...
            </>
          ) : (
            <>
              <Key className="h-5 w-5" />
              キーを暗号化
            </>
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 成功時の表示 */}
      {success && encryptedKey && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 mb-2">
              ✅ キーの暗号化に成功しました
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              暗号化されたキー（安全に保管してください）
            </label>
            <div className="relative">
              <textarea
                value={showEncrypted ? encryptedKey : '••••••••••••••••••••'}
                readOnly
                rows={3}
                className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs"
              />
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  onClick={() => setShowEncrypted(!showEncrypted)}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  {showEncrypted ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => copyToClipboard(encryptedKey)}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 実施手順 */}
          {instructions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">次の手順</h4>
              <ol className="list-decimal list-inside space-y-1">
                {instructions.map((instruction, index) => (
                  <li key={index} className="text-sm text-blue-800">
                    {instruction}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* キーローテーションのベストプラクティス */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">ベストプラクティス</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>サービスキーは3ヶ月ごとにローテーションを推奨</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>暗号化されたキーは環境変数またはSecret Managerに保管</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>平文のサービスキーをコードにハードコードしない</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>キーアクセスログを定期的に監査</span>
          </li>
        </ul>
      </div>
    </div>
  );
}