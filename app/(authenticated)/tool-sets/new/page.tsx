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
      tools (
        id,
        name,
        model_number,
        manufacturer
      ),
      current_site:sites!tool_items_current_site_id_fkey (name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('serial_number')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">道具セットを作成</h1>
              <p className="mt-1 text-sm text-gray-600">
                よく使う道具の組み合わせをセットとして登録
              </p>
            </div>
            <Link
              href="/tool-sets"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 一覧に戻る
            </Link>
          </div>

          <ToolSetForm toolItems={toolItems || []} action={createToolSet} />
        </div>
      </div>
    </div>
  )
}
