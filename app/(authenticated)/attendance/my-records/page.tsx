import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { MyAttendanceRecordsTable } from './MyAttendanceRecordsTable'
import { MyRecordsWrapper } from './MyRecordsWrapper'

interface PageProps {
  searchParams: Promise<{
    user_id?: string
  }>
}

export default async function MyAttendanceRecordsPage({ searchParams }: PageProps) {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // URLパラメータからuser_idを取得（なければ自分のID）
  const params = await searchParams
  const targetUserId = params?.user_id || userId

  // 権限チェック
  const isAdminOrManager = ['admin', 'manager'].includes(userRole)
  const isViewingOtherUser = targetUserId !== userId

  // 他人のデータを見ようとしている場合
  if (isViewingOtherUser) {
    // admin/manager以外は自分のページへリダイレクト
    if (!isAdminOrManager) {
      redirect('/attendance/my-records')
    }

    // 対象ユーザーが同じ組織かチェック
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, name, organization_id')
      .eq('id', targetUserId)
      .is('deleted_at', null)
      .single()

    // 対象ユーザーが存在しない、または他社のスタッフの場合
    if (!targetUser || targetUser.organization_id !== organizationId) {
      redirect('/attendance/my-records')
    }

    // 対象ユーザーの情報を使用
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 pb-6 sm:px-0 sm:py-6">
          <MyRecordsWrapper
            userName={targetUser.name}
            userId={targetUserId}
            isViewingOtherUser={true}
          />
        </div>
      </div>
    )
  }

  // 自分のデータを見る場合（通常フロー）
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <MyRecordsWrapper
          userName={userData?.name || ''}
          userId={userId}
          isViewingOtherUser={false}
        />
      </div>
    </div>
  )
}
