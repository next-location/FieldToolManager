import { redirect } from 'next/navigation'
import { ClientTabs } from './ClientTabs'
import { Client, ClientType } from '@/types/clients'
import { requireAuth } from '@/lib/auth/page-auth'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    client_type?: string
    is_active?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const clientType = (params.client_type || 'all') as 'all' | ClientType
  const search = params.search || ''

  const { organizationId, userRole, supabase } = await requireAuth()

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 取引先一覧を取得（有効なもののみ）
  let query = supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false})

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,name_kana.ilike.%${search}%,client_code.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data: clients } = await query

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        {/* タブ付き取引先一覧 */}
        <ClientTabs clients={clients || []} initialTab={clientType} />
      </div>
    </div>
  )
}
