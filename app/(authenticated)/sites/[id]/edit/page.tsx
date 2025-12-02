import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { updateSite } from '../../actions'
import Link from 'next/link'

export default async function EditSitePage({
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

  // 現場データを取得
  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !site) {
    notFound()
  }

  // 組織のユーザー一覧を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: organizationUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">現場編集</h1>
            <Link
              href={`/sites/${id}`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 詳細に戻る
            </Link>
          </div>

          <form action={updateSite.bind(null, id)}>
            <div className="space-y-6">
              {/* 現場名 */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  現場名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  defaultValue={site.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 住所 */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  住所
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  defaultValue={site.address || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 現場責任者 */}
              <div>
                <label
                  htmlFor="manager_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  現場責任者
                </label>
                <select
                  id="manager_id"
                  name="manager_id"
                  defaultValue={site.manager_id || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">未設定</option>
                  {organizationUsers?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* ステータス */}
              <div>
                <label
                  htmlFor="is_active"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ステータス
                </label>
                <select
                  id="is_active"
                  name="is_active"
                  defaultValue={site.is_active ? 'true' : 'false'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">稼働中</option>
                  <option value="false">停止中</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  ※完了済みの現場は「完了にする」ボタンから変更してください
                </p>
              </div>

              {/* ボタン */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  更新する
                </button>
                <Link
                  href={`/sites/${id}`}
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
