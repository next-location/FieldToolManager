'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SettingsForm } from './SettingsForm';
import TwoFactorSettings from '@/components/user/TwoFactorSettings';
import { User, Shield } from 'lucide-react';

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
            <TwoFactorSettings
              userId={userId}
              userEmail={userEmail}
              initialEnabled={twoFactorEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}