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

  // 組織設定を取得（低在庫アラートの有効/無効を確認）
  const { data: organizationSettings } = await supabase
    .from('organization_settings')
    .select('enable_low_stock_alert')
    .eq('organization_id', userData.organization_id)
    .single()

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
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

              <ToolRegistrationForm
                toolMasters={toolMasters || []}
                enableLowStockAlert={organizationSettings?.enable_low_stock_alert ?? true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
