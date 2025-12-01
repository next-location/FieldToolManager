import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MovementForm } from './MovementForm'

export default async function NewMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ tool_id?: string; tool_item_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 組織のユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // 個別アイテム一覧を取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(
      `
      id,
      serial_number,
      current_location,
      current_site_id,
      status,
      tools (
        id,
        name,
        model_number
      )
    `
    )
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('serial_number')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">移動を登録</h1>
            <Link
              href="/movements"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 一覧に戻る
            </Link>
          </div>

          <MovementForm
            toolItems={toolItems || []}
            sites={sites || []}
            selectedItemId={params.tool_item_id}
          />
        </div>
      </div>
    </div>
  )
}
