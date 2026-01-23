import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { SupplierListClient } from './SupplierListClient'

export default async function SuppliersPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 管理者・リーダー権限チェック
  if (!['admin', 'leader'].includes(userRole)) {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">仕入先マスタ</h1>
          <p className="mt-2 text-sm text-gray-600">
            外部業者（サプライヤー）の情報を管理します
          </p>
        </div>

        {/* 仕入先一覧 */}
        <SupplierListClient />
      </div>
    </div>
  )
}
