import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DeleteToolButton } from './DeleteToolButton'
import { QRCodeDisplay } from './QRCodeDisplay'

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 道具の詳細を取得
  const { data: tool, error } = await supabase
    .from('tools')
    .select(
      `
      *,
      tool_categories (
        name
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !tool) {
    redirect('/tools')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </Link>
              <Link
                href="/tools"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                道具管理
              </Link>
              <Link
                href="/scan"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                QRスキャン
              </Link>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user.email}</span>
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/tools"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← 道具一覧に戻る
            </Link>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  道具詳細
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  ID: {tool.id}
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/tools/${tool.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  編集
                </Link>
                <DeleteToolButton toolId={tool.id} toolName={tool.name} />
              </div>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">道具名</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.name}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">型番</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.model_number || '未設定'}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    メーカー
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.manufacturer || '未設定'}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">購入日</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.purchase_date || '未設定'}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    購入価格
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.purchase_price
                      ? `¥${tool.purchase_price.toLocaleString()}`
                      : '未設定'}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">数量</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.quantity}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    最小在庫数
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.minimum_stock}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    ステータス
                  </dt>
                  <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tool.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : tool.status === 'in_use'
                          ? 'bg-blue-100 text-blue-800'
                          : tool.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tool.status === 'available'
                        ? '利用可能'
                        : tool.status === 'in_use'
                        ? '使用中'
                        : tool.status === 'maintenance'
                        ? 'メンテナンス中'
                        : tool.status}
                    </span>
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    現在の所在
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {tool.current_location === 'warehouse'
                      ? '倉庫'
                      : tool.current_location === 'site'
                      ? '現場'
                      : tool.current_location === 'repair'
                      ? '修理中'
                      : tool.current_location}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">QRコード</dt>
                  <dd className="mt-1 sm:mt-0 sm:col-span-2">
                    <QRCodeDisplay value={tool.qr_code} size={200} />
                    <p className="mt-2 text-xs text-gray-500">
                      UUID: {tool.qr_code}
                    </p>
                  </dd>
                </div>
                {tool.notes && (
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">備考</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {tool.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
