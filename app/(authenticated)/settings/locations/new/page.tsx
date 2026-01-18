import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { createLocation } from '../actions'
import Link from 'next/link'
import { OWN_LOCATION_TYPES, SITE_TYPE_LABELS } from '@/types/site'

export default async function NewLocationPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin権限がない場合はリダイレクト
  if (userRole !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">自社拠点新規登録</h1>
          <p className="mt-1 text-sm text-gray-600">
            新しい自社拠点（倉庫、支店、資材置き場等）を登録します
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form action={createLocation}>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  {OWN_LOCATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SITE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  拠点の種類を選択してください（顧客現場は現場マスタで管理します）
                </p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 本社倉庫、大阪支店、第2資材置き場"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 東京都渋谷区〇〇1-2-3"
                />
              </div>

              {/* ボタン */}
              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href="/settings/locations"
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
