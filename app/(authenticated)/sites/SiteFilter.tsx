'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { PREFECTURES } from '@/lib/prefectures'

interface SiteFilterProps {
  cities: string[] // サーバーから渡される実際の市区町村リスト
}

export function SiteFilter({ cities }: SiteFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentStatus, setCurrentStatus] = useState(searchParams.get('status') || 'active')
  const [selectedPrefecture, setSelectedPrefecture] = useState(searchParams.get('prefecture') || '')
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '')
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')

  // キーワードのみデバウンス（500ms）
  const debouncedKeyword = useDebounce(keyword, 500)

  // 選択された都道府県に該当する市区町村のみ表示
  const filteredCities = selectedPrefecture
    ? cities.filter((city) => city.startsWith(selectedPrefecture))
    : cities

  // フィルター自動適用
  useEffect(() => {
    const params = new URLSearchParams()

    if (currentStatus && currentStatus !== 'all') {
      params.set('status', currentStatus)
    }

    if (selectedPrefecture) {
      params.set('prefecture', selectedPrefecture)
    }

    if (selectedCity) {
      params.set('city', selectedCity)
    }

    if (debouncedKeyword.trim()) {
      params.set('keyword', debouncedKeyword.trim())
    }

    router.push(`/sites?${params.toString()}`)
  }, [currentStatus, selectedPrefecture, selectedCity, debouncedKeyword, router])

  // フィルタークリア
  const clearFilters = () => {
    setSelectedPrefecture('')
    setSelectedCity('')
    setKeyword('')
  }

  // 都道府県変更時は市区町村をクリア
  const handlePrefectureChange = (prefecture: string) => {
    setSelectedPrefecture(prefecture)
    setSelectedCity('') // 都道府県変更時は市区町村をリセット
  }

  return (
    <div className="mb-6 space-y-4">
      {/* ステータスフィルター */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentStatus('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentStatus === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            稼働中
          </button>
          <button
            onClick={() => setCurrentStatus('completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentStatus === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            完了
          </button>
          <button
            onClick={() => setCurrentStatus('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            すべて
          </button>
        </div>
      </div>

      {/* 住所検索フィルター */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">現場を検索</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 都道府県 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              都道府県
            </label>
            <select
              value={selectedPrefecture}
              onChange={(e) => handlePrefectureChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">すべて</option>
              {PREFECTURES.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </div>

          {/* 市区町村 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              市区町村
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedPrefecture}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">すべて</option>
              {filteredCities.map((city) => {
                // 都道府県部分を除いて表示（東京都新宿区 → 新宿区）
                const displayName = selectedPrefecture
                  ? city.replace(selectedPrefecture, '')
                  : city
                return (
                  <option key={city} value={city}>
                    {displayName}
                  </option>
                )
              })}
            </select>
            {!selectedPrefecture && (
              <p className="mt-1 text-xs text-gray-500">
                都道府県を選択してください
              </p>
            )}
            {selectedPrefecture && filteredCities.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                該当する市区町村がありません
              </p>
            )}
          </div>

          {/* フリーワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              フリーワード
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="現場名、住所で検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* クリアボタン */}
        {(selectedPrefecture || selectedCity || keyword) && (
          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              クリア
            </button>
          </div>
        )}

        {/* 現在の検索条件表示 */}
        {(selectedPrefecture || selectedCity || keyword) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">検索条件:</span>
            {selectedPrefecture && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                {selectedPrefecture}
                <button
                  onClick={() => handlePrefectureChange('')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedCity && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                {selectedPrefecture ? selectedCity.replace(selectedPrefecture, '') : selectedCity}
                <button
                  onClick={() => setSelectedCity('')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {keyword && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                「{keyword}」
                <button
                  onClick={() => setKeyword('')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
