import { hasFeature, hasPackage, getMockFeatures } from '@/hooks/useFeatures'
import type { OrganizationFeatures } from '@/hooks/useFeatures'

describe('useFeatures utilities', () => {
  describe('hasFeature', () => {
    it('should return true for asset package features when asset_management is true', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
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
      }

      expect(hasFeature(features, 'asset.tools')).toBe(true)
      expect(hasFeature(features, 'asset.equipment')).toBe(true)
      expect(hasFeature(features, 'asset.consumables')).toBe(true)
    })

    it('should return true for dx package features when dx_efficiency is true', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
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
      }

      expect(hasFeature(features, 'dx.work_reports')).toBe(true)
      expect(hasFeature(features, 'dx.attendance')).toBe(true)
      expect(hasFeature(features, 'dx.invoices')).toBe(true)
    })

    it('should return false for asset features when asset_management is false', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
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
      }

      expect(hasFeature(features, 'asset.tools')).toBe(false)
      expect(hasFeature(features, 'dx.work_reports')).toBe(false)
    })

    it('should check individual feature flags', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
        contract: {
          plan_type: 'standard',
          user_limit: 30,
          packages: {
            asset_management: false,
            dx_efficiency: false,
          },
          status: 'active',
        },
        features: ['special_feature_1', 'special_feature_2'],
        package_type: 'none',
        isLoading: false,
      }

      expect(hasFeature(features, 'special_feature_1')).toBe(true)
      expect(hasFeature(features, 'special_feature_2')).toBe(true)
      expect(hasFeature(features, 'non_existent_feature')).toBe(false)
    })
  })

  describe('hasPackage', () => {
    it('should return true for asset package when asset_management is true', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
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
      }

      expect(hasPackage(features, 'asset')).toBe(true)
      expect(hasPackage(features, 'dx')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })

    it('should return true for dx package when dx_efficiency is true', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
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
      }

      expect(hasPackage(features, 'dx')).toBe(true)
      expect(hasPackage(features, 'asset')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })

    it('should return true for full package when both packages are true', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
        contract: {
          plan_type: 'standard',
          user_limit: 30,
          packages: {
            asset_management: true,
            dx_efficiency: true,
          },
          status: 'active',
        },
        features: [],
        package_type: 'full',
        isLoading: false,
      }

      expect(hasPackage(features, 'full')).toBe(true)
      expect(hasPackage(features, 'asset')).toBe(true)
      expect(hasPackage(features, 'dx')).toBe(true)
    })

    it('should return false for all packages in trial mode', () => {
      const features: OrganizationFeatures = {
        organization_id: 'test-org-id',
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
      }

      expect(hasPackage(features, 'asset')).toBe(false)
      expect(hasPackage(features, 'dx')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })
  })

  describe('getMockFeatures', () => {
    it('should return asset package features for "asset"', () => {
      const features = getMockFeatures('asset')

      expect(features.package_type).toBe('asset')
      expect(features.contract.packages.asset_management).toBe(true)
      expect(features.contract.packages.dx_efficiency).toBe(false)
    })

    it('should return dx package features for "dx"', () => {
      const features = getMockFeatures('dx')

      expect(features.package_type).toBe('dx')
      expect(features.contract.packages.asset_management).toBe(false)
      expect(features.contract.packages.dx_efficiency).toBe(true)
    })

    it('should return full package features for "full"', () => {
      const features = getMockFeatures('full')

      expect(features.package_type).toBe('full')
      expect(features.contract.packages.asset_management).toBe(true)
      expect(features.contract.packages.dx_efficiency).toBe(true)
    })

    it('should return none package features for "none"', () => {
      const features = getMockFeatures('none')

      expect(features.package_type).toBe('none')
      expect(features.contract.packages.asset_management).toBe(false)
      expect(features.contract.packages.dx_efficiency).toBe(false)
      expect(features.contract.status).toBe('trial')
    })

    it('should default to none for unknown package type', () => {
      const features = getMockFeatures('unknown')

      expect(features.package_type).toBe('none')
      expect(features.contract.packages.asset_management).toBe(false)
      expect(features.contract.packages.dx_efficiency).toBe(false)
    })
  })
})
