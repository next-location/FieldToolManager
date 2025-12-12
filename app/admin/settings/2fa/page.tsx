'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import TwoFactorSetup from '@/components/admin/TwoFactorSetup';

export default function TwoFactorSettingsPage() {
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2FAの状態を取得
    const checkTwoFactorStatus = async () => {
      try {
        const response = await fetch('/api/admin/me');
        if (response.ok) {
          const data = await response.json();
          setTwoFactorEnabled(data.twoFactorEnabled || false);
        }
      } catch (error) {
        console.error('2FA状態の取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTwoFactorStatus();
  }, []);

  const handleStatusChange = () => {
    // 2FA状態が変更されたら再度取得
    setLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <AdminHeader userName="管理者" />

      {/* サイドバーとメインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">二要素認証（2FA）設定</h1>
              <p className="mt-2 text-sm text-gray-600">
                アカウントのセキュリティを強化するために、2FAを設定してください。
              </p>
            </div>

            {loading ? (
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : (
              <TwoFactorSetup
                isEnabled={twoFactorEnabled}
                onComplete={handleStatusChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}