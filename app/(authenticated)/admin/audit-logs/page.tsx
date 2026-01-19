import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { AuditLogList } from './AuditLogList'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string; entity?: string; search?: string }
}) {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // ページネーション設定
  const page = parseInt(searchParams.page || '1')
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
  if (searchParams.action && searchParams.action !== 'all') {
    query = query.eq('action', searchParams.action)
  }
  if (searchParams.entity && searchParams.entity !== 'all') {
    query = query.eq('entity_type', searchParams.entity)
  }
  if (searchParams.search) {
    // 検索: entity_idまたはuser email/nameで部分一致
    // Note: JOINしたテーブルでの検索は複雑なので、クライアント側でフィルタリング
  }

  // ページネーションとソート
  const { data: auditLogs, error: auditLogsError, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (auditLogsError) {
    console.error('[AuditLogsPage] Error fetching audit logs:', auditLogsError)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <AuditLogList
          initialAuditLogs={auditLogs || []}
          currentPage={page}
          totalPages={totalPages}
          totalCount={count || 0}
        />
      </div>
    </div>
  )
}
