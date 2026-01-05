'use client'

import { X } from 'lucide-react'
import { PREFECTURES } from '@/lib/prefectures'

interface SiteFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPrefecture: string
  selectedCity: string
  filteredCities: string[]
  onPrefectureChange: (value: string) => void
  onCityChange: (value: string) => void
  onReset: () => void
  onApply: () => void
}

export default function SiteFiltersModal({
  isOpen,
  onClose,
  selectedPrefecture,
  selectedCity,
  filteredCities,
  onPrefectureChange,
  onCityChange,
  onReset,
  onApply,
}: SiteFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onApply()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-50 max-h-[80vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4">
          {/* 都道府県フィルター */}
          <div>
            <label
              htmlFor="modal-prefecture"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              都道府県
            </label>
            <select
              id="modal-prefecture"
              value={selectedPrefecture}
              onChange={(e) => onPrefectureChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              {PREFECTURES.map((pref) => (
                <option key={pref} value={pref}>
                  {pref}
                </option>
              ))}
            </select>
          </div>

          {/* 市区町村フィルター */}
          <div>
            <label
              htmlFor="modal-city"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              市区町村
            </label>
            <select
              id="modal-city"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              disabled={!selectedPrefecture}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">すべて</option>
              {filteredCities.map((city) => {
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
              <p className="mt-1 text-[10px] sm:text-xs text-gray-500">
                都道府県を選択してください
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
