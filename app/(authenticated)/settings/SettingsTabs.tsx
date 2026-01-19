'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsForm } from './SettingsForm';
import TwoFactorSettings from '@/components/user/TwoFactorSettings';
import PasswordChangeModal from '@/components/user/PasswordChangeModal';
import { User, Shield, Lock } from 'lucide-react';

interface SettingsTabsProps {
  userId: string;
  userEmail: string;
  userName: string;
  userDepartment: string;
  userSealData: string;
  twoFactorEnabled: boolean;
}

export function SettingsTabs({
  userId,
  userEmail,
  userName,
  userDepartment,
  userSealData,
  twoFactorEnabled
}: SettingsTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  useEffect(() => {
    // URLパラメータからタブを設定
    if (tabParam === 'security') {
      setActiveTab('security');
    }
  }, [tabParam]);

  const tabs = [
    {
      id: 'profile' as const,
      name: 'プロフィール',
      icon: User,
    },
    {
      id: 'security' as const,
      name: 'セキュリティ',
      icon: Shield,
    },
  ];

  return (
    <div>
      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              プロフィール設定
            </h2>
            <SettingsForm
              userId={userId}
              currentName={userName}
              currentEmail={userEmail}
              currentDepartment={userDepartment}
              currentSealData={userSealData}
            />
          </div>
        </div>
      </div>

      <div className={activeTab === 'security' ? 'block' : 'hidden'}>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              セキュリティ設定
            </h2>

            {/* パスワード変更セクション */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-900">
                      パスワード変更
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    定期的にパスワードを変更してセキュリティを強化しましょう
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordChangeModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  パスワードを変更
                </button>
              </div>
            </div>

            {/* 二要素認証セクション */}
            <TwoFactorSettings
              userId={userId}
              userEmail={userEmail}
              initialEnabled={twoFactorEnabled}
            />
          </div>
        </div>
      </div>

      {/* パスワード変更モーダル */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onClose={() => setShowPasswordChangeModal(false)}
        userId={userId}
        userEmail={userEmail}
      />
    </div>
  );
}