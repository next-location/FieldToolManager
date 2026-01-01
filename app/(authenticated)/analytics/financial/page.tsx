import { Suspense } from 'react'
import SalesAnalytics from './SalesAnalytics'
import CashflowAnalytics from './CashflowAnalytics'
import FinancialTabs from './FinancialTabs'

export default function FinancialAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      }
    >
      <FinancialTabs
        salesContent={<SalesAnalytics />}
        cashflowContent={<CashflowAnalytics />}
      />
    </Suspense>
  )
}
