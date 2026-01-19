import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { AuditLogList } from './AuditLogList'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    action?: string
    entity?: string
    user_id?: string
    start_date?: string
    end_date?: string
  }>
}) {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // searchParamsをawait
  const params = await searchParams

  // ページネーション設定
  const page = parseInt(params.page || '1')
  const pageSize = 50 // 1ページあたり50件
  const offset = (page - 1) * pageSize

  // サービスロールキーを使用してRLSをバイパス
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // クエリビルダー
  let query = supabaseService
    .from('audit_logs')
    .select(
      `
      *,
      users:user_id (
        name,
        email
      )
    `,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)

  // フィルター適用
  if (params.action && params.action !== 'all') {
    query = query.eq('action', params.action)
  }
  if (params.entity && params.entity !== 'all') {
    query = query.eq('entity_type', params.entity)
  }
  if (params.user_id && params.user_id !== 'all') {
    query = query.eq('user_id', params.user_id)
  }

  // 期間検索（空文字列をチェック）
  if (params.start_date && params.start_date.trim() !== '') {
    // YYYY-MM-DDをJST (UTC+9) の00:00:00として扱い、UTCに変換
    const startDateTime = `${params.start_date}T00:00:00+09:00`
    console.log('[AUDIT LOGS] Start date filter:', params.start_date, '→', startDateTime)
    query = query.gte('created_at', startDateTime)
  }
  if (params.end_date && params.end_date.trim() !== '') {
    // YYYY-MM-DDをJST (UTC+9) の23:59:59として扱い、UTCに変換
    const endDateTime = `${params.end_date}T23:59:59.999+09:00`
    console.log('[AUDIT LOGS] End date filter:', params.end_date, '→', endDateTime)
    query = query.lte('created_at', endDateTime)
  }

  // ページネーションとソート
  const { data: auditLogs, error: auditLogsError, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (auditLogsError) {
    console.error('[AuditLogsPage] Error fetching audit logs:', auditLogsError)
  }

  console.log('[AUDIT LOGS] Query result:', {
    totalCount: count,
    returnedCount: auditLogs?.length || 0,
    filters: {
      action: params.action,
      entity: params.entity,
      user_id: params.user_id,
      start_date: params.start_date,
      end_date: params.end_date,
    },
    firstLogDate: auditLogs?.[0]?.created_at,
    lastLogDate: auditLogs?.[auditLogs.length - 1]?.created_at,
  })

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  // フィルター用の全データを取得（ユニーク値用）
  const { data: allLogsForFilters } = await supabaseService
    .from('audit_logs')
    .select(
      `
      action,
      entity_type,
      user_id,
      users:user_id (
        name,
        email
      )
    `
    )
    .eq('organization_id', organizationId)

  // ユニークな値を抽出
  const uniqueActions = Array.from(
    new Set((allLogsForFilters || []).map((log) => log.action).filter(Boolean))
  )
  const uniqueEntities = Array.from(
    new Set((allLogsForFilters || []).map((log) => log.entity_type).filter(Boolean))
  )
  const uniqueUsers = Array.from(
    new Map(
      (allLogsForFilters || [])
        .filter((log) => log.user_id && log.users)
        .map((log) => [
          log.user_id,
          {
            id: log.user_id,
            name: (log.users as any)?.name || (log.users as any)?.email || '不明',
          },
        ])
    ).values()
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <AuditLogList
          initialAuditLogs={auditLogs || []}
          currentPage={page}
          totalPages={totalPages}
          totalCount={count || 0}
          uniqueActions={uniqueActions}
          uniqueEntities={uniqueEntities}
          uniqueUsers={uniqueUsers}
        />
      </div>
    </div>
  )
}
