import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { Building2, Warehouse, MapPin, Plus } from 'lucide-react'
import { SITE_TYPE_LABELS } from '@/types/site'
import type { SiteType } from '@/types/site'

export default async function LocationsSettingsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin権限がない場合はリダイレクト
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 自社拠点を取得（type が customer_site 以外）
  const { data: locations, error } = await supabase
    .from('sites')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('type', 'customer_site')
    .is('deleted_at', null)
    .order('type')
    .order('name')

  // 拠点タイプ別にグループ化
  const locationsByType: Record<SiteType, any[]> = {
    customer_site: [],
    own_warehouse: [],
    branch: [],
    storage_yard: [],
    other: [],
  }

  locations?.forEach((location) => {
    const type = location.type as SiteType
    if (locationsByType[type]) {
      locationsByType[type].push(location)
    }
  })

  // アイコンマッピング
  const getIcon = (type: SiteType) => {
    switch (type) {
      case 'own_warehouse':
        return <Warehouse className="w-5 h-5" />
      case 'branch':
        return <Building2 className="w-5 h-5" />
      case 'storage_yard':
        return <MapPin className="w-5 h-5" />
      default:
        return <MapPin className="w-5 h-5" />
    }
  }

  const totalLocations = locations?.length || 0

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">自社拠点管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            本社倉庫、支店、資材置き場などの自社拠点を管理します
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            登録拠点数: <span className="font-semibold">{totalLocations}</span>
          </div>
          <Link
            href="/settings/locations/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規登録
          </Link>
        </div>

        {totalLocations === 0 ? (
          <div className="bg-white shadow sm:rounded-lg p-8 text-center">
            <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">まだ自社拠点が登録されていません</p>
            <Link
              href="/settings/locations/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              最初の拠点を登録
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {(['own_warehouse', 'branch', 'storage_yard', 'other'] as SiteType[]).map((type) => {
              const typeLocations = locationsByType[type]
              if (typeLocations.length === 0) return null

              return (
                <div key={type} className="bg-white shadow sm:rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 sm:px-6">
                    <div className="flex items-center">
                      <div className="text-blue-600 mr-2">{getIcon(type)}</div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {SITE_TYPE_LABELS[type]}
                      </h2>
                      <span className="ml-2 text-sm text-gray-500">
                        ({typeLocations.length})
                      </span>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-200">
                    {typeLocations.map((location) => (
                      <li key={location.id}>
                        <Link
                          href={`/settings/locations/${location.id}/edit`}
                          className="block hover:bg-gray-50 transition-colors"
                        >
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {location.name}
                                </p>
                                {location.address && (
                                  <p className="mt-1 text-sm text-gray-500 truncate">
                                    {location.address}
                                  </p>
                                )}
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                <svg
                                  className="w-5 h-5 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/settings/organization"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← 運用設定に戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
