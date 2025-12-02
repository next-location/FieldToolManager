'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function SiteFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFilter = searchParams.get('status') || 'active'

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/sites?${params.toString()}`)
  }

  return (
    <div className="flex space-x-2 mb-6">
      <button
        onClick={() => handleFilterChange('active')}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          currentFilter === 'active'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        稼働中
      </button>
      <button
        onClick={() => handleFilterChange('completed')}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          currentFilter === 'completed'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        完了
      </button>
      <button
        onClick={() => handleFilterChange('all')}
        className={`px-4 py-2 rounded-md text-sm font-medium ${
          currentFilter === 'all'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        すべて
      </button>
    </div>
  )
}
