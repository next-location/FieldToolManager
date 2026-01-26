import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { WorkPatternsWrapper } from './WorkPatternsWrapper'

export default async function WorkPatternsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 権限チェック: manager, adminのみアクセス可能
  if (!['manager', 'admin'].includes(userRole)) {
    redirect('/attendance/my-records')
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
        <WorkPatternsWrapper
          userRole={userRole}
          organizationName={organization?.name || ''}
        />
      </div>
    </div>
  )
}
