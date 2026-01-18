import { redirect, notFound } from 'next/navigation'
import { updateLocation, deleteLocation } from '../../actions'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/page-auth'
import { OWN_LOCATION_TYPES, SITE_TYPE_LABELS } from '@/types/site'

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin権限がない場合はリダイレクト
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 拠点データを取得
  const { data: location, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .neq('type', 'customer_site')
    .is('deleted_at', null)
    .single()

  if (error || !location) {
    console.error('[Location Edit] Error fetching location:', { id, organizationId, error })
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">自社拠点編集</h1>
          <p className="mt-1 text-sm text-gray-600">
            拠点情報を編集します
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form action={updateLocation.bind(null, id)}>
            <div className="space-y-6">
              {/* 拠点タイプ */}
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  拠点タイプ <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  required
                  defaultValue={location.type}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {OWN_LOCATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SITE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 拠点名 */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  拠点名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={location.name}
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
                  maxLength={200}
                  defaultValue={location.address || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* ボタン */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Link
                  href="/settings/locations"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  更新する
                </button>
              </div>
            </div>
          </form>

          {/* 削除ボタン */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-sm font-medium text-gray-900 mb-2">危険操作</h2>
            <p className="text-sm text-gray-600 mb-4">
              この拠点を削除します。削除した拠点は復元できません。
            </p>
            <form action={deleteLocation.bind(null, id)}>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                onClick={(e) => {
                  if (!confirm('本当にこの拠点を削除しますか？この操作は取り消せません。')) {
                    e.preventDefault()
                  }
                }}
              >
                拠点を削除
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
