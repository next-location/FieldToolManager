import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SettingsForm } from './SettingsForm'

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
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link href="/profile" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            ← プロフィールに戻る
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">アカウント設定</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              あなたの個人情報を編集できます
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <SettingsForm
              userId={user.id}
              currentName={userData?.name || ''}
              currentEmail={user.email || ''}
              currentDepartment={userData?.department || ''}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
