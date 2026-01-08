'use client'

import { useDemo } from '@/hooks/useDemo'
import { AlertCircle, Clock } from 'lucide-react'

export default function DemoBanner() {
  const { isDemo, getDaysRemaining, getHoursRemaining } = useDemo()

  if (!isDemo) return null

  const daysRemaining = getDaysRemaining()
  const hoursRemaining = getHoursRemaining()

  return (
    <div className="bg-orange-100 border-b border-orange-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-900">
              デモ環境
            </p>
            <p className="text-xs text-orange-700">
              本環境はデモ用です。一部機能に制限があります。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-orange-800">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {daysRemaining > 0 ? `残り${daysRemaining}日` : `残り${hoursRemaining}時間`}
            </span>
          </div>
          <a
            href="/contact"
            className="px-4 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-full hover:bg-orange-700 transition-colors"
          >
            製品版を申し込む
          </a>
        </div>
      </div>
    </div>
  )
}
