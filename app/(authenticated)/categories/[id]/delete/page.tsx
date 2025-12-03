import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeleteCategoryForm } from './DeleteCategoryForm'

export default async function DeleteCategoryPage({
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
    .eq('organization_id', userData.organization_id)
    .single()

  if (!category) {
    redirect('/categories')
  }

  // このカテゴリを使用している道具の数を確認
  const { count } = await supabase
    .from('tools')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)
    .is('deleted_at', null)

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
              カテゴリの削除
            </h2>

            {count && count > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      このカテゴリは使用されています
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        {count}件の道具/消耗品がこのカテゴリを使用しています。削除すると、これらのアイテムのカテゴリがクリアされます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                削除するカテゴリ
              </h3>
              <p className="text-base font-semibold text-gray-900">
                {category.name}
              </p>
              {category.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {category.description}
                </p>
              )}
            </div>

            <DeleteCategoryForm categoryId={id} usageCount={count || 0} />
          </div>
        </div>
      </div>
    </div>
  )
}
