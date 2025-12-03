import { NotificationBell } from './NotificationBell'
import { ProfileMenu } from './ProfileMenu'

interface HeaderProps {
  organizationId: string
  userName?: string
  currentPage?: string
  showNotificationBell?: boolean
}

export function Header({ organizationId, userName, currentPage, showNotificationBell = true }: HeaderProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <a href="/" className="text-xl font-bold text-gray-900">
              Field Tool Manager
            </a>
            <a
              href="/tools"
              className={`text-sm font-medium ${
                currentPage === 'tools'
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              道具管理
            </a>
            <a
              href="/movements"
              className={`text-sm font-medium ${
                currentPage === 'movements'
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              移動履歴
            </a>
            <a
              href="/sites"
              className={`text-sm font-medium ${
                currentPage === 'sites'
                  ? 'text-blue-600 hover:text-blue-700'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              現場管理
            </a>
          </div>

          <div className="flex items-center space-x-4">
            {showNotificationBell && <NotificationBell organizationId={organizationId} />}
            <ProfileMenu userName={userName} />
          </div>
        </div>
      </div>
    </nav>
  )
}
