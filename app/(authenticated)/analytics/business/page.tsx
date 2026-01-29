import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import BusinessDashboardTabs from './BusinessDashboardTabs'

export default async function BusinessAnalyticsPage() {
  const { userId, organizationId, userRole } = await requireAuth()

  // 管理者またはマネージャーのみアクセス可能
  if (userRole !== 'admin' && userRole !== 'manager') {
    redirect('/')
  }

  return <BusinessDashboardTabs userRole={userRole} />
}
