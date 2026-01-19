'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatures, hasFeature as checkHasFeature } from '@/hooks/useFeatures';
import { ReactNode } from 'react';
import { InfoIcon } from 'lucide-react';

interface PagePackageGateProps {
  requiredFeature?: string;
  requiredPackage?: 'asset' | 'dx' | 'full';
  children: ReactNode;
  fallbackMessage?: string;
  redirectTo?: string;
}

/**
 * ページレベルのパッケージ制御コンポーネント
 * 必要なパッケージを契約していない場合、メッセージ表示またはリダイレクト
 */
export function PagePackageGate({
  requiredFeature,
  requiredPackage,
  children,
  fallbackMessage = 'この機能を利用するには上位プランの契約が必要です。',
  redirectTo,
}: PagePackageGateProps) {
  const features = useFeatures();
  const router = useRouter();

  // ローディング中
  if (features.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // エラー
  if (features.error) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-bold text-red-800 mb-2">機能情報の取得に失敗しました</h2>
        <p className="text-sm text-red-600">{features.error}</p>
      </div>
    );
  }

  // 機能キーによるチェック
  if (requiredFeature) {
    const hasRequiredFeature = checkHasFeature(features, requiredFeature);

    if (!hasRequiredFeature) {
      if (redirectTo) {
        useEffect(() => {
          router.push(redirectTo);
        }, [router]);
        return null;
      }

      return <AccessDenied message={fallbackMessage} feature={requiredFeature} />;
    }
  }

  // パッケージタイプによるチェック
  if (requiredPackage) {
    const hasPackage = checkPackageAccess(features, requiredPackage);

    if (!hasPackage) {
      if (redirectTo) {
        useEffect(() => {
          router.push(redirectTo);
        }, [router]);
        return null;
      }

      return <AccessDenied message={fallbackMessage} packageType={requiredPackage} />;
    }
  }

  // アクセス許可
  return <>{children}</>;
}

/**
 * パッケージアクセス権限チェック
 */
function checkPackageAccess(features: any, packageType: 'asset' | 'dx' | 'full'): boolean {
  if (packageType === 'full') {
    return features.package_type === 'full';
  }
  if (packageType === 'asset') {
    return features.contract.packages.asset_management || features.package_type === 'full';
  }
  if (packageType === 'dx') {
    return features.contract.packages.dx_efficiency || features.package_type === 'full';
  }
  return false;
}

/**
 * アクセス拒否メッセージ
 */
function AccessDenied({
  message,
  feature,
  packageType,
}: {
  message: string;
  feature?: string;
  packageType?: string;
}) {
  const getRequiredPackageInfo = () => {
    if (feature) {
      if (feature.startsWith('asset.')) {
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
      if (feature.startsWith('dx.')) {
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
    }

    // デフォルト: フル機能パック
    return {
      name: 'フル機能統合パック',
      price: '¥32,000/月',
      benefits: [
        '全機能利用可能（資産管理 + DX効率化）',
        '消耗品発注管理 & 発注書PDF生成',
        '統合ダッシュボード',
        '高度な分析機能',
        'パッケージ割引適用',
      ],
    };
  };

  const packageInfo = getRequiredPackageInfo();

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <InfoIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-blue-900 mb-3">
              {packageInfo.name} が必要です
            </h2>
            <p className="text-base text-blue-800 mb-4">{message}</p>
            <p className="text-sm text-blue-800 mb-4">
              月額 <span className="font-bold text-lg">{packageInfo.price}</span> で以下の機能が利用可能になります：
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-2 mb-6">
              {packageInfo.benefits.map((benefit, idx) => (
                <li key={idx} className="pl-2">{benefit}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => (window.location.href = '/settings/billing')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                プランを確認・変更
              </button>
              <button
                onClick={() => (window.location.href = 'mailto:support@zairoku.com')}
                className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                お問い合わせ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
