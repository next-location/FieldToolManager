'use client';

import { useState } from 'react';

interface ImpersonationBannerProps {
  superAdminName: string;
  organizationName: string;
}

export default function ImpersonationBanner({
  superAdminName,
  organizationName,
}: ImpersonationBannerProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!confirm('なりすましログインを終了しますか？')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/impersonate/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('ログアウトに失敗しました');
      }

      // スーパー管理画面にリダイレクト
      const isDevelopment = process.env.NODE_ENV === 'development';
      window.location.href = isDevelopment
        ? 'http://localhost:3000/admin/dashboard'
        : `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard`;
    } catch (err) {
      console.error('Logout error:', err);
      alert('ログアウトに失敗しました');
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-600 text-white py-2 px-4 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <span className="font-bold">🔓 なりすましログイン中</span>
        <span className="text-sm">
          管理者: {superAdminName} → 組織: {organizationName}
        </span>
      </div>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="px-4 py-1 bg-white text-red-600 rounded hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
      >
        {loading ? 'ログアウト中...' : 'ログアウト'}
      </button>
    </div>
  );
}
