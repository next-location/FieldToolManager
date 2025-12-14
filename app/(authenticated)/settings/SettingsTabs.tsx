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
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="タブ">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id
                      ? 'text-blue-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="px-4 py-5 sm:px-6">
        {activeTab === 'profile' && (
          <div>
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
        )}

        {activeTab === 'security' && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              セキュリティ設定
            </h2>
            <TwoFactorSettings
              userId={userId}
              userEmail={userEmail}
              initialEnabled={twoFactorEnabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}