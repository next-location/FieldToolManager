import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'
import { InvoiceListClient } from '@/components/invoices/InvoiceListClient'
import InvoicePageFAB from '@/components/invoices/InvoicePageFAB'

async function InvoiceList() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name),
      created_by_user:users!billing_invoices_created_by_fkey(name),
      approved_by_user:users!billing_invoices_manager_approved_by_fkey(name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false})

  return <InvoiceListClient invoices={invoices || []} userRole={userRole || ''} />
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
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">請求書管理</h1>
          <Link
            href="/invoices/new"
            className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + 新規請求書作成
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <InvoiceList />
        </Suspense>

        <InvoicePageFAB />
      </div>
    </div>
  )
}