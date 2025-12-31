'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { AlertTriangle, Shield, Lock, Globe, Key, Users } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState({
    // パスワードポリシー（取引先用）
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    passwordExpirationDays: 90,

    // ログイン制限（取引先用）
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,

    // セッション設定（取引先用）
    sessionTimeoutMinutes: 60,

    // IP制限（取引先用）
    enableIpRestriction: false,
    allowedIpAddresses: [] as string[],

    // 2FA設定（権限別）
    require2FAForOrganizationAdmin: false,  // 組織管理者（admin）
    require2FAForManager: false,            // マネージャー（manager）
    require2FAForLeader: false,             // リーダー（実装保留：DBにroleなし）
    require2FAForStaff: false,              // スタッフ（user）

    // 監査ログ（取引先用）
    auditLogRetentionDays: 365,
  });

  const [newIpAddress, setNewIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // 現在の設定を取得
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      const response = await fetch('/api/admin/security/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings({
          ...settings,
          ...data,
          allowedIpAddresses: data.allowedIpAddresses || [],
        });
      }
    } catch (error) {
      console.error('設定の取得に失敗:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'セキュリティ設定を保存しました' });
      } else {
        setMessage({ type: 'error', text: '設定の保存に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddIpAddress = () => {
    if (newIpAddress && /^(\d{1,3}\.){3}\d{1,3}$/.test(newIpAddress)) {
      setSettings({
        ...settings,
        allowedIpAddresses: [...settings.allowedIpAddresses, newIpAddress],
      });
      setNewIpAddress('');
    }
  };

  const handleRemoveIpAddress = (ip: string) => {
    setSettings({
      ...settings,
      allowedIpAddresses: settings.allowedIpAddresses.filter(addr => addr !== ip),
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName="管理者" />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                取引先セキュリティ設定
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                取引先組織のセキュリティポリシーを一括管理します
              </p>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-6">

              {/* ログイン制限 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  ログイン制限
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大ログイン試行回数
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setSettings({ ...settings, maxLoginAttempts: '' as any });
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num)) {
                            setSettings({ ...settings, maxLoginAttempts: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          setSettings({ ...settings, maxLoginAttempts: 5 });
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      アカウントロック時間（分）
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={settings.lockoutDurationMinutes}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setSettings({ ...settings, lockoutDurationMinutes: '' as any });
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num)) {
                            setSettings({ ...settings, lockoutDurationMinutes: num });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          setSettings({ ...settings, lockoutDurationMinutes: 30 });
                        }
                      }}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    セッションタイムアウト（分）
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        // 空の場合は一旦空文字を許可（入力中）
                        setSettings({
                          ...settings,
                          sessionTimeoutMinutes: '' as any
                        });
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num)) {
                          setSettings({
                            ...settings,
                            sessionTimeoutMinutes: num
                          });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // フォーカスが外れた時に空なら60に戻す
                      if (e.target.value === '') {
                        setSettings({
                          ...settings,
                          sessionTimeoutMinutes: 60
                        });
                      }
                    }}
                    className="w-full border rounded px-3 py-2 max-w-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    無操作時に自動ログアウトするまでの時間（15分〜480分推奨）
                  </p>
                </div>
              </div>


              {/* 2FA設定 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  二要素認証（2FA）設定
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.require2FAForOrganizationAdmin}
                      onChange={(e) => setSettings({
                        ...settings,
                        require2FAForOrganizationAdmin: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">組織管理者（admin）に2FAを必須にする</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.require2FAForManager}
                      onChange={(e) => setSettings({
                        ...settings,
                        require2FAForManager: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">マネージャー（manager）に2FAを必須にする</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.require2FAForLeader}
                      onChange={(e) => setSettings({
                        ...settings,
                        require2FAForLeader: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">リーダー（leader）に2FAを必須にする</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.require2FAForStaff}
                      onChange={(e) => setSettings({
                        ...settings,
                        require2FAForStaff: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm">スタッフ（user）に2FAを必須にする</span>
                  </label>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ 2FA推奨設定について
                  </h3>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p>• 2FA未設定のユーザーは、次回ログイン時に設定を推奨するポップアップが表示されます</p>
                    <p>• ユーザーは「後で設定する」を選択してログインを続行できます</p>
                    <p>• ログインをブロックする機能は現在実装されていません</p>
                  </div>
                </div>
              </div>

              {/* 監査ログ */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  監査ログ
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ログ保持期間（日）
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="3650"
                    value={settings.auditLogRetentionDays}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setSettings({ ...settings, auditLogRetentionDays: '' as any });
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num)) {
                          setSettings({ ...settings, auditLogRetentionDays: num });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        setSettings({ ...settings, auditLogRetentionDays: 365 });
                      }
                    }}
                    className="w-full border rounded px-3 py-2 max-w-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    古いログは自動的に削除されます
                  </p>
                </div>
              </div>

              {/* 保存ボタン */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '保存中...' : '設定を保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}