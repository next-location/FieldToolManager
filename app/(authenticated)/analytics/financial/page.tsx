import { Suspense } from 'react'
import SalesAnalytics from './SalesAnalytics'
import CashflowAnalytics from './CashflowAnalytics'
import FinancialTabs from './FinancialTabs'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function FinancialAnalyticsPage() {
  return (
    <Suspense fallback={<LoadingSpinner inline />}>
      <FinancialTabs
        salesContent={<SalesAnalytics />}
        cashflowContent={<CashflowAnalytics />}
      />
    </Suspense>
  )
}
