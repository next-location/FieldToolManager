import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { TerminalsTable } from './TerminalsTable'

export default async function TerminalsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 権限チェック（admin または manager のみ）
  if (!['admin', 'manager'].includes(userRole)) {
    redirect('/')
  }

  // 現場一覧取得（現場端末登録時に使用）
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', organizationId)
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

      <TerminalsTable sitesList={sites || []} userRole={userRole} />
    </div>
  )
}
