import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryForm } from '../CategoryForm'

export default async function NewCategoryPage() {
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
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (userData.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            カテゴリの新規登録
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            新しい道具カテゴリを登録します
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <CategoryForm organizationId={userData?.organization_id} />
          </div>
        </div>
      </div>
    </div>
  )
}
