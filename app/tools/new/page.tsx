import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ToolRegistrationForm } from './ToolRegistrationForm'

export default async function NewToolPage() {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 既存の道具マスタを取得
  const { data: toolMasters } = await supabase
    .from('tools')
    .select('id, name, model_number, manufacturer, minimum_stock')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </a>
              <a
                href="/tools"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                道具管理
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <a
              href="/tools"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← 道具一覧に戻る
            </a>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                道具の新規登録
              </h2>

              <ToolRegistrationForm toolMasters={toolMasters || []} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
