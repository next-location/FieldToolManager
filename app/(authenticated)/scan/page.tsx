import { requireAuth } from '@/lib/auth/page-auth'
import { redirect } from 'next/navigation'
import { QRScanTabs } from './QRScanTabs'

export default async function ScanPage() {
  const { organizationId, supabase } = await requireAuth()

  // 組織の契約パッケージを取得
  const { data: contract } = await supabase
    .from('contracts')
    .select('asset_management_package, dx_efficiency_package, full_features_package')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  // 現場資産パックまたはフル機能統合パックがない場合はアクセス拒否
  if (!contract?.asset_management_package && !contract?.full_features_package) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            QRコードスキャン
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            道具や重機のQRコードをスキャンして、移動ページへ移動できます
          </p>
        </div>

        <QRScanTabs />
      </div>
    </div>
  )
}
