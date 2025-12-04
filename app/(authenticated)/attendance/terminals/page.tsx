import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TerminalsTable } from './TerminalsTable'

export default async function TerminalsPage() {
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
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // 権限チェック（admin または manager のみ）
  if (!userData || !['admin', 'manager'].includes(userData.role)) {
    redirect('/')
  }

  // 現場一覧取得（現場端末登録時に使用）
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">タブレット端末管理</h1>
        <p className="text-gray-600 mt-1">
          QRコード表示用のタブレット端末を管理します
        </p>
      </div>

      <TerminalsTable sitesList={sites || []} userRole={userData.role} />
    </div>
  )
}
