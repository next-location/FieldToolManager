import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PendingReportsList } from './PendingReportsList'

export default async function PendingWorkReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // leader または admin のみアクセス可能
  if (userData.role !== 'leader' && userData.role !== 'admin') {
    redirect('/work-reports')
  }

  // 提出済み（承認待ち）の作業報告書を取得
  const { data: pendingReports } = await supabase
    .from('work_reports')
    .select(
      `
      id,
      report_date,
      description,
      created_at,
      site:sites(id, name),
      created_by_user:users!work_reports_created_by_fkey(id, name, email),
      workers
    `
    )
    .eq('organization_id', userData?.organization_id)
    .eq('status', 'submitted')
    .is('deleted_at', null)
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">承認待ち作業報告書</h1>
          <p className="mt-1 text-sm text-gray-600">
            提出された作業報告書の承認・却下を行います。
          </p>
        </div>

        <PendingReportsList reports={pendingReports || []} />
      </div>
    </div>
  )
}
