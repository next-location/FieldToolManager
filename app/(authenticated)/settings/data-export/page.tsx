import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { DataExportClient } from './DataExportClient'

export default async function DataExportPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 各データの件数を取得
  const [
    { count: toolsCount },
    { count: consumablesCount },
    { count: staffCount },
    { count: sitesCount },
    { count: movementsCount },
    { count: equipmentCount },
  ] = await Promise.all([
    supabase
      .from('tools')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('consumables')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('tool_movements')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .limit(1000),
    supabase
      .from('equipment')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
  ])

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">データエクスポート</h1>
          <p className="mt-1 text-sm text-gray-600">
            組織のデータをエクスポートして、バックアップや外部ツールでの利用が可能です。
          </p>
        </div>

        <DataExportClient
          counts={{
            tools: toolsCount || 0,
            consumables: consumablesCount || 0,
            staff: staffCount || 0,
            sites: sitesCount || 0,
            movements: movementsCount || 0,
            equipment: equipmentCount || 0,
          }}
        />
      </div>
    </div>
  )
}
