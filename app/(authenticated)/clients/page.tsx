import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientTabs } from './ClientTabs'
import { Client, ClientType } from '@/types/clients'

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

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (userData.role !== 'admin') {
    redirect('/')
  }

  // 取引先一覧を取得（有効なもののみ）
  let query = supabase
    .from('clients')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false})

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,client_code.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data: clients } = await query

  return (
    <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">取引先マスタ</h1>
          <p className="mt-2 text-sm text-gray-600">
            顧客・仕入先・協力会社などの取引先情報を管理します
          </p>
        </div>

        {/* タブ付き取引先一覧 */}
        <ClientTabs clients={clients || []} initialTab={clientType} />
      </div>
    </div>
  )
}
