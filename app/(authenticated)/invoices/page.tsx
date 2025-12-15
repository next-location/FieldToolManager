import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'
import { InvoiceListClient } from '@/components/invoices/InvoiceListClient'

async function InvoiceList() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name),
      created_by_user:users!billing_invoices_created_by_fkey(name),
      approved_by_user:users!billing_invoices_manager_approved_by_fkey(name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false})

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link
          href="/invoices/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
        >
          新規請求書作成
        </Link>
      </div>

      <InvoiceListClient invoices={invoices || []} userRole={userData?.role || ''} />
    </>
  )
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  // パッケージチェック
  if (userData?.organization_id) {
    const features = await getOrganizationFeatures(userData?.organization_id)
    if (!hasPackage(features, 'dx')) {
      return <PackageRequired packageType="dx" featureName="請求書管理" userRole={userData.role} />
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">請求書管理</h1>
        <p className="text-gray-600">
          請求書の作成・管理を行います
        </p>
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
    </div>
  )
}