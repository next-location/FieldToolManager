import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { EstimateEditForm } from '@/components/estimates/EstimateEditForm'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EditEstimatePage({
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userRole || '')) {
    redirect('/')
  }

  // 見積書データを取得
  const { data: estimate } = await supabase
    .from('estimates')
    .select(`
      *,
      estimate_items(*)
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (!estimate) {
    redirect('/estimates')
  }

  // 下書き以外は編集不可（expiredを含む）
  if (estimate.status !== 'draft') {
    redirect(`/estimates/${id}`)
  }

  // 取引先一覧を取得
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, client_code')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  // 工事一覧を取得
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name, project_code')
    .eq('organization_id', organizationId)
    .in('status', ['planning', 'in_progress'])
    .order('project_name')

  const initialData = {
    estimate_number: estimate.estimate_number,
    client_id: estimate.client_id || '',
    project_id: estimate.project_id || '',
    estimate_date: estimate.estimate_date,
    valid_until: estimate.valid_until || '',
    title: estimate.title,
    notes: estimate.notes || '',
    internal_notes: estimate.internal_notes || '',
    status: estimate.status
  }

  const initialItems = estimate.estimate_items
    ? estimate.estimate_items
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((item: any) => ({
          ...item,
          description: item.description || '',
          custom_type: item.custom_type || '',
          custom_unit: item.custom_unit || '',
        }))
    : []

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">見積書編集</h1>
        <p className="text-gray-600">{estimate.estimate_number}</p>
      </div>

      <EstimateEditForm
        estimateId={id}
        initialData={initialData}
        initialItems={initialItems}
        clients={clients || []}
        projects={projects || []}
      />
      </div>
    </div>
  )
}
