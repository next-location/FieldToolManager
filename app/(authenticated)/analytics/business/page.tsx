import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import BusinessDashboardTabs from './BusinessDashboardTabs'
import SalesAnalytics from '../financial/SalesAnalytics'
import CashflowAnalytics from '../financial/CashflowAnalytics'
import FinancialTabs from '../financial/FinancialTabs'
import ClientsStats from '@/app/(authenticated)/clients/ClientsStats'
import MonthlyReport from '@/app/(authenticated)/attendance/reports/monthly/MonthlyReport'

export default async function BusinessAnalyticsPage() {
  const { userId, organizationId, userRole } = await requireAuth()

  // 管理者またはマネージャーのみアクセス可能
  if (userRole !== 'admin' && userRole !== 'manager') {
    redirect('/')
  }

  // DXパッケージチェック
  const features = await getOrganizationFeatures(organizationId)
  const hasDxPackage = hasPackage(features, 'dx')

  return (
    <BusinessDashboardTabs
      userRole={userRole}
      hasDxPackage={hasDxPackage}
      financialContent={
        <FinancialTabs salesContent={<SalesAnalytics />} cashflowContent={<CashflowAnalytics />} />
      }
      clientsContent={<ClientsStats />}
      attendanceContent={<MonthlyReport />}
    />
  )
}
