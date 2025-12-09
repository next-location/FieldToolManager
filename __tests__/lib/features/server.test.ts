import { hasFeature, hasPackage } from '@/lib/features/server'
import type { OrganizationFeatures } from '@/lib/features/server'

describe('server features utilities', () => {
  describe('hasFeature', () => {
    it('should return true for asset features when asset package is enabled', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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
      }

      expect(hasFeature(features, 'asset.tools')).toBe(true)
      expect(hasFeature(features, 'asset.equipment')).toBe(true)
      expect(hasFeature(features, 'asset.consumables')).toBe(true)
      expect(hasFeature(features, 'asset.movement')).toBe(true)
    })

    it('should return true for dx features when dx package is enabled', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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
      }

      expect(hasFeature(features, 'dx.work_reports')).toBe(true)
      expect(hasFeature(features, 'dx.attendance')).toBe(true)
      expect(hasFeature(features, 'dx.invoices')).toBe(true)
      expect(hasFeature(features, 'dx.estimates')).toBe(true)
    })

    it('should return false for features when package is not enabled', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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

      expect(hasFeature(features, 'asset.tools')).toBe(false)
      expect(hasFeature(features, 'dx.work_reports')).toBe(false)
    })

    it('should check individual feature flags', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
        contract: {
          plan_type: 'standard',
          user_limit: 30,
          packages: {
            asset_management: false,
            dx_efficiency: false,
          },
          status: 'active',
        },
        features: ['beta_feature_1', 'beta_feature_2'],
        package_type: 'none',
      }

      expect(hasFeature(features, 'beta_feature_1')).toBe(true)
      expect(hasFeature(features, 'beta_feature_2')).toBe(true)
      expect(hasFeature(features, 'non_existent')).toBe(false)
    })
  })

  describe('hasPackage', () => {
    it('should return true for asset package', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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
      }

      expect(hasPackage(features, 'asset')).toBe(true)
      expect(hasPackage(features, 'dx')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })

    it('should return true for dx package', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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
      }

      expect(hasPackage(features, 'dx')).toBe(true)
      expect(hasPackage(features, 'asset')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })

    it('should return true for full package when both are enabled', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
        contract: {
          plan_type: 'business',
          user_limit: 100,
          packages: {
            asset_management: true,
            dx_efficiency: true,
          },
          status: 'active',
        },
        features: [],
        package_type: 'full',
      }

      expect(hasPackage(features, 'full')).toBe(true)
      expect(hasPackage(features, 'asset')).toBe(true)
      expect(hasPackage(features, 'dx')).toBe(true)
    })

    it('should return false when package_type is full but only checking for full', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
        contract: {
          plan_type: 'business',
          user_limit: 100,
          packages: {
            asset_management: true,
            dx_efficiency: true,
          },
          status: 'active',
        },
        features: [],
        package_type: 'full',
      }

      expect(hasPackage(features, 'full')).toBe(true)
    })

    it('should handle trial status correctly', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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

      expect(hasPackage(features, 'asset')).toBe(false)
      expect(hasPackage(features, 'dx')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })
  })

  describe('package type determination', () => {
    it('should correctly identify asset package type', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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
      }

      expect(features.package_type).toBe('asset')
      expect(hasPackage(features, 'asset')).toBe(true)
    })

    it('should correctly identify dx package type', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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
      }

      expect(features.package_type).toBe('dx')
      expect(hasPackage(features, 'dx')).toBe(true)
    })

    it('should correctly identify full package type', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
        contract: {
          plan_type: 'business',
          user_limit: 100,
          packages: {
            asset_management: true,
            dx_efficiency: true,
          },
          status: 'active',
        },
        features: [],
        package_type: 'full',
      }

      expect(features.package_type).toBe('full')
      expect(hasPackage(features, 'full')).toBe(true)
      expect(hasPackage(features, 'asset')).toBe(true)
      expect(hasPackage(features, 'dx')).toBe(true)
    })

    it('should correctly identify none package type', () => {
      const features: OrganizationFeatures = {
        organization_id: 'org-123',
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

      expect(features.package_type).toBe('none')
      expect(hasPackage(features, 'asset')).toBe(false)
      expect(hasPackage(features, 'dx')).toBe(false)
      expect(hasPackage(features, 'full')).toBe(false)
    })
  })
})
