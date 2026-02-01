import { DashboardContainer } from '@/components/dashboard/DashboardContainer'
import { requireAuth } from '@/lib/auth/page-auth'
import { UserRole, PackageType } from '@/components/dashboard/types'

export default async function NewDashboard() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // Get organization details
  const { data: orgData } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // Get contract information to determine package type
  const { data: contractData } = await supabase
    .from('contracts')
    .select('has_asset_package, has_dx_efficiency_package')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  // Determine package type
  let packageType: PackageType = 'none'
  if (contractData) {
    if (contractData.has_asset_package && contractData.has_dx_efficiency_package) {
      packageType = 'full'
    } else if (contractData.has_asset_package) {
      packageType = 'asset'
    } else if (contractData.has_dx_efficiency_package) {
      packageType = 'dx'
    }
  }

  // Map user role to the correct type
  const mappedRole = userRole as UserRole

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <DashboardContainer
        userRole={mappedRole}
        packageType={packageType}
        organizationId={organizationId}
        userId={userId}
        organizationName={orgData?.name}
      />
    </div>
  )
}