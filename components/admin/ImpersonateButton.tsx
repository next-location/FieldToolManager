'use client';

import { useState } from 'react';

interface ImpersonateButtonProps {
  organizationId: string;
  organizationName: string;
}

// Client Component用のCSRFトークン取得関数
async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf');
  if (!response.ok) {
    throw new Error('CSRF token取得に失敗しました');
  }
  const data = await response.json();
  return data.token;
}

export default function ImpersonateButton({
  organizationId,
  organizationName,
}: ImpersonateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImpersonate = async () => {
    if (!confirm(`「${organizationName}」の管理画面にログインします。よろしいですか？`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`/api/admin/organizations/${organizationId}/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ログインURLの生成に失敗しました');
      }

      const data = await response.json();

      // デバッグ: 生成されたログインURLを確認
      console.log('[ImpersonateButton] Generated loginUrl:', data.loginUrl);
      alert(`生成されたURL: ${data.loginUrl}`);

      // 同じタブでリダイレクト（ポップアップブロック回避）
      window.location.href = data.loginUrl;
    } catch (err) {
      console.error('Impersonation error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleImpersonate}
        disabled={loading}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'ログイン中...' : '🔓 ログイン'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
