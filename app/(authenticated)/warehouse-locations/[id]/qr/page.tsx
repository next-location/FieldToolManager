import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { QRCodePrint } from '@/components/qr/QRCodePrint'

export default async function WarehouseLocationQRPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userRole)) {
    redirect('/')
  }

  // 倉庫位置情報を取得
  const { data: location, error } = await supabase
    .from('warehouse_locations')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !location || !location.qr_code) {
    redirect('/warehouse-locations')
  }

  return (
    <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href={`/warehouse-locations/${id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 詳細に戻る
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              倉庫位置QRコード
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {location.code} - {location.display_name}
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex justify-center">
              <QRCodePrint
                value={location.qr_code}
                itemName={location.display_name}
                itemCode={`倉庫位置: ${location.code}`}
                itemType="倉庫位置"
                size={300}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                QRコードの使い方
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>印刷ボタンをクリックして印刷してください</li>
                  <li>印刷したQRコードを倉庫の対応する位置に貼り付けてください</li>
                  <li>スタッフはスマートフォンでこのQRコードをスキャンして位置を特定できます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
