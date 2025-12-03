import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CategoriesPage() {
  const supabase = await createClient()

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

  // カテゴリ一覧を取得
  const { data: categories, error } = await supabase
    .from('tool_categories')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">カテゴリ管理</h1>
          <Link
            href="/categories/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + 新規登録
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">
              エラーが発生しました: {error.message}
            </p>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {categories && categories.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {categories.map((category) => {
                const isSystemCategory = category.name === '消耗品'
                return (
                  <li key={category.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {category.name}
                            </p>
                            {isSystemCategory && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                システム
                              </span>
                            )}
                          </div>
                          {category.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                        {!isSystemCategory && (
                          <div className="ml-4 flex space-x-2">
                            <Link
                              href={`/categories/${category.id}/edit`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              編集
                            </Link>
                            <Link
                              href={`/categories/${category.id}/delete`}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              削除
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-4 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                カテゴリが登録されていません
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                消耗品や道具を分類するためのカテゴリを登録してください
              </p>
              <div className="mt-6">
                <Link
                  href="/categories/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  + 新規登録
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
