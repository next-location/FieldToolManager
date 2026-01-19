import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 工事詳細取得
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(id, name, client_code),
      project_manager:users!project_manager_id(id, name, role),
      site:sites(id, name, address, client:clients(id, name))
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (!project) {
    redirect('/projects')
  }

  // 発注書集計情報取得
  const { data: purchaseOrderSummary } = await supabase
    .from('purchase_orders')
    .select('id, status, total_amount')
    .eq('project_id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 発注書統計計算
  const purchaseStats = {
    total_count: purchaseOrderSummary?.length || 0,
    total_amount: purchaseOrderSummary?.reduce((sum, po) => sum + Number(po.total_amount || 0), 0) || 0,
    approved_count: purchaseOrderSummary?.filter(po => ['approved', 'ordered', 'partially_received', 'received', 'paid'].includes(po.status)).length || 0,
    approved_amount: purchaseOrderSummary?.filter(po => ['approved', 'ordered', 'partially_received', 'received', 'paid'].includes(po.status)).reduce((sum, po) => sum + Number(po.total_amount || 0), 0) || 0,
  }

  // ステータス表示
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">計画中</span>
      case 'in_progress':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">進行中</span>
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">完了</span>
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">キャンセル</span>
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">{status}</span>
    }
  }

  // 役割表示
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者'
      case 'leader': return 'リーダー'
      case 'manager': return 'マネージャー'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  // 金額フォーマット
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return `¥${amount.toLocaleString()}`
  }

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ja-JP')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{project.project_name}</h1>
          <p className="text-gray-600">工事番号: {project.project_code}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/projects"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            一覧に戻る
          </Link>
          {['admin', 'leader'].includes(userRole) && (
            <Link
              href={`/projects/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              編集
            </Link>
          )}
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">基本情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">ステータス</label>
            <div>{getStatusBadge(project.status)}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">工事番号</label>
            <p className="text-gray-900 font-mono">{project.project_code}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">工事名</label>
            <p className="text-gray-900">{project.project_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">発注者（取引先）</label>
            <p className="text-gray-900">
              {project.client ? (
                <>
                  {project.client.name}
                  <span className="text-sm text-gray-500 ml-2">({project.client.client_code})</span>
                </>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">工事責任者</label>
            <p className="text-gray-900">
              {project.project_manager ? (
                <>
                  {project.project_manager.name}
                  <span className="text-xs ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {getRoleLabel(project.project_manager.role)}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </p>
          </div>

          {/* 現場情報 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">関連現場</label>
            <p className="text-gray-900">
              {project.site ? (
                <span className="inline-flex items-center gap-2">
                  <Link
                    href={`/sites/${project.site.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {project.site.name}
                  </Link>
                  {project.site.address && (
                    <span className="text-sm text-gray-600 ml-2">📍 {project.site.address}</span>
                  )}
                  {project.site.client && (
                    <span className="text-xs ml-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {project.site.client.name}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 工期・金額 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">工期・金額</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">工事開始日</label>
            <p className="text-gray-900">{formatDate(project.start_date)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">工事完了予定日</label>
            <p className="text-gray-900">{formatDate(project.end_date)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">契約金額</label>
            <p className="text-gray-900 text-xl font-semibold">{formatCurrency(project.contract_amount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">予算金額</label>
            <p className="text-gray-900 text-xl font-semibold">{formatCurrency(project.budget_amount)}</p>
          </div>
        </div>
      </div>

      {/* 発注情報 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold">発注情報</h2>
          <Link
            href={`/purchase-orders?project=${id}`}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            発注書一覧を見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">発注書件数</label>
            <p className="text-gray-900 text-2xl font-semibold">{purchaseStats.total_count}件</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">発注総額</label>
            <p className="text-gray-900 text-2xl font-semibold">{formatCurrency(purchaseStats.total_amount)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">承認済件数</label>
            <p className="text-blue-600 text-2xl font-semibold">{purchaseStats.approved_count}件</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">承認済金額</label>
            <p className="text-blue-600 text-2xl font-semibold">{formatCurrency(purchaseStats.approved_amount)}</p>
          </div>

          {project.budget_amount && purchaseStats.approved_amount > 0 && (
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-500 mb-2">予算消化率</label>
              <div className="relative w-full bg-gray-200 rounded-full h-6">
                <div
                  className={`h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white ${
                    (purchaseStats.approved_amount / Number(project.budget_amount)) * 100 > 100
                      ? 'bg-red-500'
                      : (purchaseStats.approved_amount / Number(project.budget_amount)) * 100 > 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((purchaseStats.approved_amount / Number(project.budget_amount)) * 100, 100)}%` }}
                >
                  {((purchaseStats.approved_amount / Number(project.budget_amount)) * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                予算残: {formatCurrency(Number(project.budget_amount) - purchaseStats.approved_amount)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* システム情報 */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">システム情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">作成日時</label>
            <p className="text-gray-900 text-sm">{new Date(project.created_at).toLocaleString('ja-JP')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">更新日時</label>
            <p className="text-gray-900 text-sm">{new Date(project.updated_at).toLocaleString('ja-JP')}</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
