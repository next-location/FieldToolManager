import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SettingsTabs } from './SettingsTabs'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            個人情報とセキュリティ設定を管理できます
          </p>
        </div>

        <SettingsTabs
          userId={user.id}
          userEmail={user.email || ''}
          userName={userData?.name || ''}
          userDepartment={userData?.department || ''}
          userSealData={userData?.personal_seal_data || ''}
          twoFactorEnabled={userData?.two_factor_enabled || false}
        />
      </div>
    </div>
  )
}
