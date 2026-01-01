import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { SupplierListClient } from './SupplierListClient'

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{
    is_active?: string
    search?: string
  }>
}) {
  const params = await searchParams
  const search = params.search || ''


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
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者・リーダー権限チェック
  if (!['admin', 'leader'].includes(userRole)) {
    redirect('/')
  }

  // 仕入先一覧を取得（有効なもののみ）
  let query = supabase
    .from('suppliers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,name_kana.ilike.%${search}%,supplier_code.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data: suppliers } = await query

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">仕入先マスタ</h1>
          <p className="mt-2 text-sm text-gray-600">
            外部業者（サプライヤー）の情報を管理します
          </p>
        </div>

        {/* 仕入先一覧 */}
        <SupplierListClient suppliers={suppliers || []} />
      </div>
    </div>
  )
}
