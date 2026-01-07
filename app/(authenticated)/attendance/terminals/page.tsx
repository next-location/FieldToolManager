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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">タブレット端末管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            QRコード表示用のタブレット端末を管理します
          </p>
        </div>

        <TerminalsTable sitesList={sites || []} userRole={userRole} />
      </div>
    </div>
  )
}
