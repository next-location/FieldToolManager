'use client'

import Link from 'next/link'
import { StatusCard } from './types'

interface StatusCardWidgetProps {
  cards: StatusCard[]
  className?: string
}

export function StatusCardWidget({ cards, className = '' }: StatusCardWidgetProps) {
  if (cards.length === 0) return null

  const getTrendIcon = (direction: 'up' | 'down') => {
    return direction === 'up' ? '↑' : '↓'
  }

  const getTrendColor = (direction: 'up' | 'down') => {
    // Note: The color depends on context - sometimes up is good, sometimes bad
    return direction === 'up' ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {cards.map((card) => {
        const cardContent = (
          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  {card.title}
                </p>
              </div>
              {card.icon && (
                <span className="text-xl sm:text-2xl ml-2" aria-hidden="true">
                  {card.icon}
                </span>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  {card.subtitle && (
                    <span className="ml-2 text-sm text-gray-500">
                      {card.subtitle}
                    </span>
                  )}
                </div>

                {card.trend && (
                  <div className={`flex items-center mt-2 text-sm ${getTrendColor(card.trend.direction)}`}>
                    <span className="mr-1">{getTrendIcon(card.trend.direction)}</span>
                    <span className="font-medium">{card.trend.value}%</span>
                    {card.trend.label && (
                      <span className="ml-1 text-gray-500">{card.trend.label}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {card.link && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs sm:text-sm text-blue-600 font-medium hover:underline">
                  詳細を見る →
                </span>
              </div>
            )}
          </div>
        )

        if (card.link) {
          return (
            <Link key={card.id} href={card.link} className="block">
              {cardContent}
            </Link>
          )
        }

        return <div key={card.id}>{cardContent}</div>
      })}
    </div>
  )
}