import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { PurchaseOrderListView } from './PurchaseOrderListView'

export default async function PurchaseOrdersPage() {
  const { organizationId, userRole, supabase } = await requireAuth()

  // 発注先一覧取得
  const { data: suppliers } = await supabase
    .from('clients')
    .select('id, name, client_code')
    .eq('organization_id', organizationId)
    .in('client_type', ['supplier', 'both'])
    .eq('is_active', true)
    .order('name')

  // プロジェクト一覧取得
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('organization_id', organizationId)
    .order('project_name')

  // スタッフ一覧取得（作成者フィルタ用）
  const { data: staffList } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <PurchaseOrderListView
          suppliers={suppliers || []}
          projects={projects || []}
          currentUserRole={userRole}
          staffList={staffList || []}
        />
      </div>
    </div>
  )
}