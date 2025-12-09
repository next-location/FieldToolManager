import { createClient } from '@/lib/supabase/server'

export interface OrganizationFeatures {
  organization_id: string
  contract: {
    plan_type: string
    user_limit: number
    packages: {
      asset_management: boolean
      dx_efficiency: boolean
    }
    status: string
  }
  features: string[]
  package_type: 'asset' | 'dx' | 'full' | 'none'
}

/**
 * サーバーサイドで組織の契約パッケージ情報を取得
 */
export async function getOrganizationFeatures(organizationId: string): Promise<OrganizationFeatures> {
  const supabase = await createClient()

  const { data: features } = await supabase
    .from('organization_features')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (!features) {
    // デフォルト（トライアル）を返す
    return {
      organization_id: organizationId,
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
    }
  }

  return {
    organization_id: organizationId,
    contract: {
      plan_type: features.plan_type || 'trial',
      user_limit: features.user_limit || 10,
      packages: {
        asset_management: features.has_asset_package || false,
        dx_efficiency: features.has_dx_efficiency_package || false,
      },
      status: features.contract_status || 'trial',
    },
    features: features.enabled_features || [],
    package_type: features.package_type || 'none',
  }
}

/**
 * 指定された機能が利用可能かチェック
 */
export function hasFeature(features: OrganizationFeatures, featureKey: string): boolean {
  // パッケージベースの機能チェック
  if (featureKey.startsWith('asset.')) {
    return features.contract.packages.asset_management
  }
  if (featureKey.startsWith('dx.')) {
    return features.contract.packages.dx_efficiency
  }

  // 個別の機能フラグチェック
  return features.features.includes(featureKey)
}

/**
 * 指定されたパッケージを契約しているかチェック
 */
export function hasPackage(features: OrganizationFeatures, packageType: 'asset' | 'dx' | 'full'): boolean {
  if (packageType === 'full') {
    return features.package_type === 'full'
  }
  if (packageType === 'asset') {
    return features.contract.packages.asset_management
  }
  if (packageType === 'dx') {
    return features.contract.packages.dx_efficiency
  }
  return false
}
