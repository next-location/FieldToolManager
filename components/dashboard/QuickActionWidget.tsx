'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { QuickAction } from './types'

// Dynamic import for attendance actions to avoid SSR issues
const AttendanceQuickAction = dynamic(
  () => import('./AttendanceQuickAction').then(mod => mod.AttendanceQuickAction),
  { ssr: false }
)

interface QuickActionWidgetProps {
  actions: QuickAction[]
  className?: string
}

export function QuickActionWidget({ actions, className = '' }: QuickActionWidgetProps) {
  if (actions.length === 0) return null

  const handleAction = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick()
    }
  }

  const getButtonStyles = (variant: QuickAction['variant'] = 'primary', size: QuickAction['size'] = 'medium') => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all transform active:scale-95'

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
    }

    const sizeStyles = {
      small: 'px-3 py-2 text-sm min-h-[44px]',
      medium: 'px-4 py-3 text-base min-h-[52px]',
      large: 'px-6 py-4 text-lg min-h-[60px] sm:min-h-[56px]'
    }

    return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`
  }

  // Determine grid columns based on number of actions and screen size
  const getGridClass = () => {
    const count = actions.length
    if (count <= 2) return 'grid-cols-2'
    if (count <= 4) return 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4'
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
  }

  return (
    <div className={`grid ${getGridClass()} gap-3 sm:gap-4 ${className}`}>
      {actions.map((action) => {
        // Special handling for attendance actions
        if (action.id === 'clock-in' || action.id === 'clock-out') {
          return <AttendanceQuickAction key={action.id} type={action.id} />
        }

        const buttonContent = (
          <>
            <span className="text-xl sm:text-2xl mr-2" aria-hidden="true">
              {action.icon}
            </span>
            <span className="text-sm sm:text-base">{action.label}</span>
          </>
        )

        if (action.href) {
          return (
            <Link
              key={action.id}
              href={action.href}
              className={getButtonStyles(action.variant, action.size)}
            >
              {buttonContent}
            </Link>
          )
        }

        return (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            className={getButtonStyles(action.variant, action.size)}
          >
            {buttonContent}
          </button>
        )
      })}
    </div>
  )
}