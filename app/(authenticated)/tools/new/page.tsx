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

  // プリセット（共通マスタ）を取得
  const { data: presets } = await supabase
    .from('tool_master_presets')
    .select('id, name, model_number, manufacturer, unit')
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  // 既存の道具マスタを取得（個別管理のみ）
  const { data: toolMasters } = await supabase
    .from('tools')
    .select('id, name, model_number, manufacturer, minimum_stock, is_from_preset')
    .eq('organization_id', userData.organization_id)
    .eq('management_type', 'individual')
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
          <h1 className="text-2xl font-bold text-gray-900">
            道具の新規登録
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            新しい道具を登録します。既存の道具マスタから選択するか、新規作成できます。
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <ToolRegistrationForm
              presets={presets || []}
              toolMasters={toolMasters || []}
              enableLowStockAlert={organizationSettings?.enable_low_stock_alert ?? true}
              organizationId={userData.organization_id}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
