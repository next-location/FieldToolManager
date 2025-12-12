import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationList } from './NotificationList'

export default async function NotificationsPage() {
  const supabase = await createClient()

  // 認証チェック
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

  // 通知一覧を取得（最新30件、削除されていないもの）
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">通知一覧</h1>
            <p className="mt-2 text-sm text-gray-600">
              システムからの通知を確認できます
            </p>
          </div>

        <NotificationList initialNotifications={notifications || []} />
      </div>
    </div>
  )
}
