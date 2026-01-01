import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { ConsumableRegistrationForm } from './ConsumableRegistrationForm'

export default async function NewConsumablePage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 「消耗品」カテゴリのIDを取得
  const { data: consumableCategory } = await supabase
    .from('tool_categories')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('name', '消耗品')
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            消耗品の新規登録
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            実際の消耗品（在庫）を登録します。在庫数量と単位を設定してください。
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>💡 ヒント：</strong>消耗品の種類（テンプレート）を事前に登録したい場合は、「道具・消耗品マスタ」ページから登録できます。
            </p>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <ConsumableRegistrationForm
              organizationId={organizationId}
              consumableCategoryId={consumableCategory?.id || null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
