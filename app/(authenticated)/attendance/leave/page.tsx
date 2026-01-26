import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { LeaveWrapper } from './LeaveWrapper'

export default async function LeavePage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 権限チェック: 管理者・マネージャーのみアクセス可能
  if (!['admin', 'manager'].includes(userRole)) {
    redirect('/dashboard')
  }

  // 組織情報取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <LeaveWrapper
          userRole={userRole}
          userId={userId}
          organizationName={organization?.name || ''}
        />
      </div>
    </div>
  )
}
