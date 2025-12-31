'use client';

import { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';

interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'sales';
  created_at: string;
  last_login_at: string | null;
}

interface SuperAdminListProps {
  admins: SuperAdmin[];
  currentUserId: string;
  currentUserRole?: string;
}

const ROLE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  owner: {
    label: 'オーナー',
    description: '全権限（パッケージ・契約管理、アカウント追加可）',
    color: 'bg-purple-100 text-purple-800',
  },
  sales: {
    label: '営業',
    description: '閲覧のみ（パッケージ・契約は変更不可）',
    color: 'bg-blue-100 text-blue-800',
  },
};

export default function SuperAdminList({ admins, currentUserId, currentUserRole }: SuperAdminListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales' as 'owner' | 'sales',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await fetch('/api/admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Super Adminを作成しました');
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'sales' });
        setShowPassword(false);
        window.location.reload();
      } else {
        setError(data.error || 'エラーが発生しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (adminId: string, adminName: string) => {
    if (!confirm(`${adminName} のパスワードをリセットしますか？\n仮パスワードがメールで送信されます。`)) {
      return;
    }

    setResettingId(adminId);

    try {
      // CSRFトークンを取得
      const csrfResponse = await fetch('/api/admin/csrf');
      const { token: csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/admin/super-admins/${adminId}/reset-password`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || 'パスワードをリセットしました');
      } else {
        alert(data.error || 'エラーが発生しました');
      }
    } catch (err: any) {
      alert(err.message || 'エラーが発生しました');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 追加ボタン */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // フォームを初期化してモーダルを開く
            setFormData({ name: '', email: '', password: '', role: 'sales' });
            setShowPassword(false);
            setError('');
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          + 新規アカウント追加
        </button>
      </div>

      {/* 権限説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">権限レベルについて</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div>
            <span className="font-semibold">オーナー:</span> 全ての機能にアクセス可能（あなた専用）
          </div>
          <div>
            <span className="font-semibold">営業:</span> 閲覧のみ（パッケージ設定・契約の作成/編集/削除は不可）
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                名前
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                メールアドレス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                権限
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                最終ログイン
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                作成日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => {
              const roleInfo = ROLE_LABELS[admin.role];
              const isCurrentUser = admin.id === currentUserId;

              return (
                <tr key={admin.id} className={isCurrentUser ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {admin.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-yellow-600">(あなた)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{admin.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{roleInfo.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.last_login_at
                      ? new Date(admin.last_login_at).toLocaleString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!isCurrentUser && admin.role === 'sales' && currentUserRole === 'owner' && (
                      <button
                        onClick={() => handleResetPassword(admin.id, admin.name)}
                        disabled={resettingId === admin.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium disabled:opacity-50"
                      >
                        <Key className="w-3 h-3" />
                        {resettingId === admin.id ? 'リセット中...' : 'パスワードリセット'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">新規Super Admin作成</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  autoComplete="off"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">8文字以上</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  権限レベル *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'owner' | 'sales' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="sales">営業（閲覧のみ）</option>
                  <option value="owner">オーナー（全権限）</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {ROLE_LABELS[formData.role].description}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setShowPassword(false);
                    setError('');
                    setFormData({ name: '', email: '', password: '', role: 'sales' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {saving ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
