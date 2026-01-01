import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { StaffListClient } from './StaffListClient'

export default async function StaffPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase.from('users').select('organization_id, role').eq('id', userId).single()

  if (!userData) {
    redirect('/login')
  }

  // 契約情報取得（プラン上限確認用）
  const { data: contract } = await supabase
    .from('contracts')
    .select('plan, user_limit')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  // 現在のスタッフ数取得
  const { count: currentStaffCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('is_active', true)

  // 部署一覧取得（フィルタ用）
  const { data: departments } = await supabase
    .from('users')
    .select('department')
    .eq('organization_id', organizationId)
    .not('department', 'is', null)
    .is('deleted_at', null)

  const uniqueDepartments = Array.from(new Set(departments?.map((d) => d.department).filter(Boolean)))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <StaffListClient
          userRole={userRole}
          organization={
            contract
              ? {
                  max_users: contract.user_limit,
                  plan: contract.plan,
                  current_count: currentStaffCount || 0,
                }
              : null
          }
          departments={uniqueDepartments}
        />
      </div>
    </div>
  )
}
