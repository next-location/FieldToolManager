import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaderQRGenerator from './LeaderQRGenerator'

/**
 * リーダー用QR発行ページ
 * リーダーが現場用QRコードを発行する
 */
export default async function LeaderQRPage() {
  const supabase = await createClient()

  // 認証確認
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('id, organization_id, role, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // リーダー以上の権限確認
  if (!['leader', 'manager', 'admin'].includes(userData.role)) {
    redirect('/')
  }

  // 現場リスト取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">リーダー用QR発行</h1>
          <p className="mt-2 text-sm text-gray-600">
            現場での出退勤用QRコードを発行します（当日のみ有効）
          </p>
        </div>

        <LeaderQRGenerator sites={sites || []} />
      </div>
    </div>
  )
}
