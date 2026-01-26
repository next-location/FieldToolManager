import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { NotificationList } from './NotificationList'

export default async function NotificationsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }


  // 通知一覧を取得（最新30件、削除されていないもの）
  // related_user_idが指定されている場合はそのユーザー宛、なければ組織全体の通知
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .or(`related_user_id.eq.${userId},related_user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">通知一覧</h1>
          <p className="mt-2 text-sm text-gray-600">
            システムからの通知を確認できます
          </p>
        </div>

        <NotificationList initialNotifications={notifications || []} />
      </div>
    </div>
  )
}
