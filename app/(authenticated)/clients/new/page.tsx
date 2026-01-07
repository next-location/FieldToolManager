import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import ClientForm from '../ClientForm'

export default async function NewClientPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報取得

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">取引先新規登録</h1>
          <p className="mt-1 text-sm text-gray-600">
            顧客・仕入先・協力会社の情報を登録します
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ClientForm />
        </div>
      </div>
    </div>
  )
}
