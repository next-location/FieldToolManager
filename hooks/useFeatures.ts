import { useEffect, useState } from 'react';

export interface FeaturePackages {
  asset_management: boolean;
  dx_efficiency: boolean;
}

export interface ContractInfo {
  plan_type: string;
  user_limit: number;
  packages: FeaturePackages;
  status: string;
  contract_start_date?: string;
  contract_end_date?: string;
  trial_end_date?: string;
}

export interface OrganizationFeatures {
  organization_id: string;
  organization_name?: string;
  contract: ContractInfo;
  features: string[];
  package_type: 'full' | 'asset' | 'dx' | 'none';
  isLoading: boolean;
  error?: string;
}

/**
 * 組織の契約パッケージと機能フラグを取得するHook
 */
export function useFeatures(): OrganizationFeatures {
  const [featuresData, setFeaturesData] = useState<OrganizationFeatures>({
    organization_id: '',
    contract: {
      plan_type: 'trial',
      user_limit: 10,
      packages: {
        asset_management: false,
        dx_efficiency: false,
      },
      status: 'trial',
    },
    features: [],
    package_type: 'none',
    isLoading: true,
  });

  useEffect(() => {
    // 開発環境でのモック機能
    if (process.env.NODE_ENV === 'development') {
      // URLパラメータからモックパッケージタイプを取得
      const params = new URLSearchParams(window.location.search);
      const mockPackage = params.get('mock_package');

      if (mockPackage) {
        const mockFeatures = getMockFeatures(mockPackage);
        setFeaturesData(mockFeatures);
        return;
      }

      // LocalStorageからモックパッケージタイプを取得
      const localMockPackage = localStorage.getItem('mock_package_type');
      if (localMockPackage) {
        const mockFeatures = getMockFeatures(localMockPackage);
        setFeaturesData(mockFeatures);
        return;
      }
    }

    // 本番環境: APIから取得
    fetch('/api/organization/features')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setFeaturesData({
          ...data,
          isLoading: false,
        });
      })
      .catch(error => {
        console.error('Error fetching features:', error);
        setFeaturesData(prev => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
      });
  }, []);

  return featuresData;
}

/**
 * 特定の機能が利用可能かチェックする
 */
export function hasFeature(features: OrganizationFeatures, featureKey: string): boolean {
  // パッケージレベルのチェック
  if (featureKey.startsWith('asset.')) {
    return features.contract.packages.asset_management;
  }
  if (featureKey.startsWith('dx.')) {
    return features.contract.packages.dx_efficiency;
  }
  if (featureKey === 'analytics.integrated') {
    return features.package_type === 'full';
  }

  // 個別機能フラグのチェック
  return features.features.includes(featureKey);
}

/**
 * パッケージタイプを確認する
 */
export function hasPackage(features: OrganizationFeatures, packageType: 'asset' | 'dx' | 'full'): boolean {
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
}

/**
 * 開発環境用のモックデータ
 */
export function getMockFeatures(packageType: string): OrganizationFeatures {
  const mockData: Record<string, OrganizationFeatures> = {
    asset: {
      organization_id: 'mock-org-id',
      organization_name: 'テスト組織（現場資産パック）',
      contract: {
        plan_type: 'standard',
        user_limit: 30,
        packages: {
          asset_management: true,
          dx_efficiency: false,
        },
        status: 'active',
      },
      features: [],
      package_type: 'asset',
      isLoading: false,
    },
    dx: {
      organization_id: 'mock-org-id',
      organization_name: 'テスト組織（現場DXパック）',
      contract: {
        plan_type: 'standard',
        user_limit: 30,
        packages: {
          asset_management: false,
          dx_efficiency: true,
        },
        status: 'active',
      },
      features: [],
      package_type: 'dx',
      isLoading: false,
    },
    full: {
      organization_id: 'mock-org-id',
      organization_name: 'テスト組織（フル機能）',
      contract: {
        plan_type: 'business',
        user_limit: 50,
        packages: {
          asset_management: true,
          dx_efficiency: true,
        },
        status: 'active',
      },
      features: ['premium_analytics', 'ai_predictions'],
      package_type: 'full',
      isLoading: false,
    },
    none: {
      organization_id: 'mock-org-id',
      organization_name: 'テスト組織（トライアル）',
      contract: {
        plan_type: 'trial',
        user_limit: 10,
        packages: {
          asset_management: false,
          dx_efficiency: false,
        },
        status: 'trial',
      },
      features: [],
      package_type: 'none',
      isLoading: false,
    },
  };

  return mockData[packageType] || mockData.none;
}

/**
 * 機能キーの定数定義
 */
export const FEATURE_KEYS = {
  // 現場資産パック
  ASSET: {
    TOOL_MANAGEMENT: 'asset.tool_management',
    CONSUMABLES: 'asset.consumables',
    EQUIPMENT: 'asset.equipment',
    QR_CODE: 'asset.qr_code',
    INVENTORY: 'asset.inventory',
  },
  // 現場DX業務効率化パック
  DX: {
    ATTENDANCE: 'dx.attendance',
    WORK_REPORTS: 'dx.work_reports',
    ESTIMATES: 'dx.estimates',
    INVOICES: 'dx.invoices',
    REVENUE: 'dx.revenue',
  },
  // フル機能パック限定
  ANALYTICS: {
    INTEGRATED: 'analytics.integrated',
  },
  // オプション機能
  AI: {
    PREDICTIONS: 'ai.predictions',
  },
} as const;
