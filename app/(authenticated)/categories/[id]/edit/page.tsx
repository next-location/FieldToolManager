import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryForm } from '../../CategoryForm'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // カテゴリ情報取得
  const { data: category } = await supabase
    .from('tool_categories')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .single()

  if (!category) {
    redirect('/categories')
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <a
            href="/categories"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← カテゴリ一覧に戻る
          </a>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              カテゴリの編集
            </h2>

            <CategoryForm
              organizationId={userData?.organization_id}
              initialData={category}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
