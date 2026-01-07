import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { WorkReportSettingsForm } from './WorkReportSettingsForm'
import { CustomFieldsManager } from './CustomFieldsManager'

export default async function WorkReportSettingsPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報取得

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // カスタムフィールド取得
  const { data: customFields } = await supabase
    .from('work_report_custom_fields')
    .select('*')
    .eq('organization_id', organizationId)
    .is('site_id', null)
    .order('display_order', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">作業報告書 設定</h1>
          <p className="mt-1 text-sm text-gray-600">
            組織全体の作業報告書の設定を管理します。
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white sm:rounded-lg">
            <WorkReportSettingsForm />
          </div>

          <div className="bg-white sm:rounded-lg">
            <CustomFieldsManager initialFields={customFields || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
