import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConsumableRegistrationForm } from './ConsumableRegistrationForm'

export default async function NewConsumablePage() {
  const supabase = await createClient()

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
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 「消耗品」カテゴリのIDを取得
  const { data: consumableCategory } = await supabase
    .from('tool_categories')
    .select('id')
    .eq('organization_id', userData?.organization_id)
    .eq('name', '消耗品')
    .single()

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            消耗品の新規登録
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            新しい消耗品を登録します。在庫数量と単位を設定してください。
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <ConsumableRegistrationForm
              organizationId={userData?.organization_id}
              consumableCategoryId={consumableCategory?.id || null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
