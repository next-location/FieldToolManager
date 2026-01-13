'use client';

import { useFeatures, hasFeature, type OrganizationFeatures } from '@/hooks/useFeatures';
import { ReactNode } from 'react';
import { InfoIcon } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

/**
 * 機能ゲートコンポーネント
 * 契約パッケージに応じて機能の表示を制御
 */
export function FeatureGate({ feature, children, fallback, showUpgrade = true }: FeatureGateProps) {
  const features = useFeatures();

  if (features.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (features.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">機能情報の取得に失敗しました</p>
        <p className="text-sm text-red-600 mt-1">{features.error}</p>
      </div>
    );
  }

  if (hasFeature(features, feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return <UpgradePrompt feature={feature} currentPackage={features.package_type} />;
  }

  return null;
}

/**
 * アップグレード促進メッセージ
 */
function UpgradePrompt({ feature, currentPackage }: { feature: string; currentPackage: string }) {
  const getPackageInfo = (featureKey: string) => {
    if (featureKey.startsWith('asset.')) {
      return {
        name: '現場資産パック',
        price: '¥18,000/月',
        benefits: [
          '道具・重機・消耗品管理',
          'QRコードによる簡単入出庫',
          '在庫最適化アラート',
          '棚卸し機能',
        ],
      };
    }
    if (featureKey.startsWith('dx.')) {
      return {
        name: '現場DX業務効率化パック',
        price: '¥22,000/月',
        benefits: [
          '出退勤管理',
          '作業報告書作成',
          '見積・請求書発行',
          '売上管理・分析',
        ],
      };
    }
    if (featureKey.startsWith('analytics.')) {
      return {
        name: 'フル機能統合パック',
        price: '¥32,000/月',
        benefits: [
          '全機能利用可能',
          '統合ダッシュボード',
          '高度な分析機能',
          'パッケージ割引適用',
        ],
      };
    }
    return {
      name: '有料プラン',
      price: 'お問い合わせください',
      benefits: ['この機能を利用するには有料プランが必要です'],
    };
  };

  const packageInfo = getPackageInfo(feature);

  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <InfoIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-blue-900 mb-2">
            この機能を利用するには {packageInfo.name} が必要です
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            月額 {packageInfo.price} で以下の機能が利用可能になります：
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 mb-4">
            {packageInfo.benefits.map((benefit, idx) => (
              <li key={idx}>{benefit}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/settings/billing'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              プランを確認
            </button>
            <button
              onClick={() => window.location.href = 'mailto:support@example.com'}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              お問い合わせ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * パッケージタイプによる表示制御コンポーネント
 */
interface PackageGateProps {
  packageType: 'asset' | 'dx' | 'full';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PackageGate({ packageType, children, fallback }: PackageGateProps) {
  const features = useFeatures();

  if (features.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const hasRequiredPackage = () => {
    if (packageType === 'full') {
      return features.package_type === 'full';
    }
    if (packageType === 'asset') {
      return features.contract.packages.asset_management;
    }
    if (packageType === 'dx') {
      return features.contract.packages.dx_efficiency;
    }
    return false;
  };

  if (hasRequiredPackage()) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
