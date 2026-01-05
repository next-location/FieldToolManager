import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { SettingsTabs } from './SettingsTabs'

export default async function SettingsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">アカウント設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            個人情報とセキュリティ設定を管理できます
          </p>
        </div>

        <SettingsTabs
          userId={userId}
          userEmail={userData?.email || ''}
          userName={userData?.name || ''}
          userDepartment={userData?.department || ''}
          userSealData={userData?.personal_seal_data || ''}
          twoFactorEnabled={userData?.two_factor_enabled || false}
        />
      </div>
    </div>
  )
}
