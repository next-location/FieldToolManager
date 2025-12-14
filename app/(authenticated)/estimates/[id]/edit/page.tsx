import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EstimateEditForm } from '@/components/estimates/EstimateEditForm'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EditEstimatePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
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
    .eq('organization_id', userData?.organization_id)
    .single()

  if (!estimate) {
    redirect('/estimates')
  }

  // 取引先一覧を取得
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, client_code')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .order('name')

  // 工事一覧を取得
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name, project_code')
    .eq('organization_id', userData?.organization_id)
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">見積書編集</h1>
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
  )
}
