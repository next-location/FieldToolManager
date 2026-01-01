import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { AuditLogList } from './AuditLogList'

export default async function AuditLogsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 監査ログを取得（最新100件）
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

  const { data: auditLogs } = await supabaseService
    .from('audit_logs')
    .select(`
      *,
      users:user_id (
        full_name,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">監査ログ</h1>
            <p className="mt-2 text-sm text-gray-600">
              システム内の操作履歴を確認できます（管理者専用）
            </p>
          </div>

        <AuditLogList initialAuditLogs={auditLogs || []} />
      </div>
    </div>
  )
}
