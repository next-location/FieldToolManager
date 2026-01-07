import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { createSite } from '../actions'
import Link from 'next/link'

export default async function NewSitePage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // 組織のユーザー一覧を取得（現場責任者選択用）
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  const { data: organizationUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  // 取引先一覧を取得
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, code')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">現場新規登録</h1>
          <p className="mt-1 text-sm text-gray-600">
            新しい現場情報を登録します
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form action={createSite}>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 〇〇ビル建設工事"
                />
              </div>

              {/* 取引先 */}
              <div>
                <label
                  htmlFor="client_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  取引先
                </label>
                <select
                  id="client_id"
                  name="client_id"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  {clients?.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  取引先が未登録の場合は、先に<Link href="/clients/new" className="text-blue-600 hover:text-blue-800">取引先マスタ</Link>から登録してください
                </p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 東京都渋谷区〇〇1-2-3"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">未設定</option>
                  {organizationUsers?.map((user) => (
                    <option key={userId} value={userId}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* ボタン */}
              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href="/sites"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  登録する
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
