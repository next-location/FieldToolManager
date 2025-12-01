import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createMovement } from '../actions'
import Link from 'next/link'

export default async function NewMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ tool_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 組織のユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // 道具一覧を取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, model_number, current_location, current_site_id')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // URLパラメータで指定された道具を取得
  const selectedTool = params.tool_id
    ? tools?.find((t) => t.id === params.tool_id)
    : null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">移動を登録</h1>
            <Link
              href="/movements"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 一覧に戻る
            </Link>
          </div>

          <form action={createMovement}>
            <div className="space-y-6">
              {/* 道具選択 */}
              <div>
                <label
                  htmlFor="tool_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  道具 <span className="text-red-500">*</span>
                </label>
                <select
                  id="tool_id"
                  name="tool_id"
                  required
                  defaultValue={selectedTool?.id || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  {tools?.map((tool) => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name} ({tool.model_number || '型番なし'}) - 現在地:{' '}
                      {tool.current_location === 'warehouse'
                        ? '倉庫'
                        : tool.current_location === 'site'
                        ? '現場'
                        : tool.current_location === 'repair'
                        ? '修理中'
                        : '不明'}
                    </option>
                  ))}
                </select>
              </div>

              {/* 移動種別 */}
              <div>
                <label
                  htmlFor="movement_type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  移動種別 <span className="text-red-500">*</span>
                </label>
                <select
                  id="movement_type"
                  name="movement_type"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  <option value="check_out">🔵 持ち出し（倉庫→現場）</option>
                  <option value="check_in">🟢 返却（現場→倉庫）</option>
                  <option value="transfer">🔄 移動（現場→現場）</option>
                  <option value="repair">🔧 修理に出す</option>
                  <option value="return_from_repair">✅ 修理から戻る</option>
                </select>
              </div>

              {/* 移動元現場 */}
              <div>
                <label
                  htmlFor="from_site_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  移動元現場
                </label>
                <select
                  id="from_site_id"
                  name="from_site_id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">倉庫</option>
                  {sites?.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  ※「返却」「移動」の場合は移動元を選択
                </p>
              </div>

              {/* 移動先現場 */}
              <div>
                <label
                  htmlFor="to_site_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  移動先現場
                </label>
                <select
                  id="to_site_id"
                  name="to_site_id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">倉庫</option>
                  {sites?.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  ※「持ち出し」「移動」の場合は移動先を選択
                </p>
              </div>

              {/* 数量 */}
              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  required
                  min="1"
                  defaultValue="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* メモ */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  メモ
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="移動の理由や特記事項があれば記入"
                />
              </div>

              {/* ボタン */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  登録する
                </button>
                <Link
                  href="/movements"
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium text-center"
                >
                  キャンセル
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
