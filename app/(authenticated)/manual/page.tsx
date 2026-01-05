import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'

export default async function ManualPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">操作マニュアル</h1>
          <p className="mt-2 text-sm text-gray-600">
            役割に応じたマニュアルをご確認ください
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 現場スタッフ向けマニュアル */}
          <Link
            href="/manual/staff"
            className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center space-x-4">
                <div className="text-5xl">📱</div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">現場スタッフ向け</h2>
                  <p className="text-blue-100 text-sm">スマートフォンでの操作方法</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">主な内容</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>一括移動機能（道具の持ち出し・返却）</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>QRコードスキャン方法</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>消耗品の在庫確認・移動</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>通知の確認方法</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>よくある質問（FAQ）</span>
                </li>
              </ul>
              <div className="mt-6 text-center">
                <span className="inline-flex items-center text-blue-600 font-medium">
                  マニュアルを見る
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* 管理者・リーダー向けマニュアル */}
          <Link
            href="/manual/admin"
            className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
              <div className="flex items-center space-x-4">
                <div className="text-5xl">🖥️</div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">管理者・リーダー向け</h2>
                  <p className="text-green-100 text-sm">PCでの管理方法</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">主な内容</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>初回セットアップウィザード</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>道具・現場・倉庫位置の管理</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>消耗品管理と在庫アラート設定</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>組織設定と監査ログ</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>効率的な運用のコツ</span>
                </li>
              </ul>
              <div className="mt-6 text-center">
                <span className="inline-flex items-center text-green-600 font-medium">
                  マニュアルを見る
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* 追加情報 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">お困りの際は</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  マニュアルをご覧になっても解決しない場合は、管理者またはシステムサポートにお問い合わせください。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 印刷用リンク（管理者のみ） */}
        {isAdmin && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">印刷用ドキュメント</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="/docs/USER_MANUAL_STAFF.md"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                スタッフ向けマニュアル（MD）
              </a>
              <a
                href="/docs/USER_MANUAL_ADMIN.md"
                download
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                管理者向けマニュアル（MD）
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
