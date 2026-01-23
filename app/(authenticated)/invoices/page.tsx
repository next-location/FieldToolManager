import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'
import { InvoiceListClient } from '@/components/invoices/InvoiceListClient'
import InvoicePageFAB from '@/components/invoices/InvoicePageFAB'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ExportButton } from '@/components/export/ExportButton'

async function InvoiceList() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  return <InvoiceListClient userRole={userRole || ''} />
}

export default async function InvoicesPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userRole || '')) {
    redirect('/')
  }

  // パッケージチェック
  if (organizationId) {
    const features = await getOrganizationFeatures(organizationId)
    if (!hasPackage(features, 'dx')) {
      return <PackageRequired packageType="dx" featureName="請求書管理" userRole={userRole} />
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">請求書一覧</h1>
          <div className="hidden sm:flex gap-3">
            <ExportButton endpoint="/api/invoices/export" filename="invoices" />
            <Link
              href="/invoices/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + 新規請求書作成
            </Link>
          </div>
        </div>

        <Suspense fallback={<LoadingSpinner inline />}>
          <InvoiceList />
        </Suspense>

        <InvoicePageFAB />
      </div>
    </div>
  )
}