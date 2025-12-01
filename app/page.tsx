import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ダッシュボード
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* 道具管理 */}
            <Link
              href="/tools"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">🔧</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        道具管理
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        道具の登録・編集・削除
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            {/* 現場管理 */}
            <Link
              href="/sites"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">🏗️</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        現場管理
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        現場の登録・編集・削除
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            {/* 移動履歴 */}
            <Link
              href="/movements"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📦</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        出入庫履歴
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        道具の移動履歴
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            {/* 道具セット */}
            <Link
              href="/tool-sets"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📋</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        道具セット
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        よく使う道具の組み合わせ
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            {/* QRスキャン */}
            <Link
              href="/scan"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📱</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        QRスキャン
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        QRコードで道具を検索
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>

            {/* 倉庫位置管理（管理者のみ） */}
            {userData?.role === 'admin' && (
              <Link
                href="/warehouse-locations"
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">📍</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          倉庫位置管理
                        </dt>
                        <dd className="mt-1 text-xs text-gray-400">
                          倉庫内の位置を管理
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* 組織設定（管理者のみ） */}
            {userData?.role === 'admin' && (
              <Link
                href="/settings/organization"
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border-2 border-blue-200"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="text-3xl">⚙️</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          組織設定
                        </dt>
                        <dd className="mt-1 text-xs text-gray-400">
                          運用方法のカスタマイズ
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
