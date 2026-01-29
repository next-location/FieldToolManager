import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import BusinessDashboard from './BusinessDashboard'

export default async function BusinessAnalyticsPage() {
  const { userId, organizationId, userRole } = await requireAuth()

  // 管理者またはマネージャーのみアクセス可能
  if (userRole !== 'admin' && userRole !== 'manager') {
    redirect('/')
  }

  return <BusinessDashboard userRole={userRole} />
}
