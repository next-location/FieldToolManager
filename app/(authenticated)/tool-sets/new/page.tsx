import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { createToolSet } from '../actions'
import Link from 'next/link'
import { ToolSetForm } from './ToolSetForm'

export default async function NewToolSetPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // 組織のユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  // 個別アイテム一覧を取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(`
      id,
      serial_number,
      current_location,
      current_site_id,
      status,
      tool_id,
      current_site:sites!tool_items_current_site_id_fkey (name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('serial_number')

  // 道具マスタを取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, model_number, manufacturer')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 既存のセットに登録されている道具アイテムIDを取得
  const { data: existingSetItems } = await supabase
    .from('tool_set_items')
    .select('tool_item_id, tool_sets!inner(id, name)')
    .eq('tool_sets.organization_id', organizationId)
    .is('tool_sets.deleted_at', null)

  // 既存セットに登録済みのアイテムIDのSetを作成
  const registeredItemIds = new Set(
    (existingSetItems || []).map(item => item.tool_item_id)
  )

  // セット登録情報をマップに変換（アイテムID -> セット名）
  const itemToSetMap = new Map<string, string>()
  ;(existingSetItems || []).forEach(item => {
    if (item.tool_sets) {
      itemToSetMap.set(item.tool_item_id, (item.tool_sets as any).name)
    }
  })

  // toolItemsとtoolsを結合
  const toolsMap = new Map((tools || []).map(t => [t.id, t]))
  const formattedToolItems = (toolItems || []).map((item: any) => ({
    ...item,
    tools: toolsMap.get(item.tool_id) || null,
    isRegistered: registeredItemIds.has(item.id),
    registeredSetName: itemToSetMap.get(item.id) || null
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">道具セットを作成</h1>
          <p className="mt-1 text-sm text-gray-600">
            よく使う道具の組み合わせをセットとして登録
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <ToolSetForm toolItems={formattedToolItems} action={createToolSet} />
          </div>
        </div>
      </div>
    </div>
  )
}
