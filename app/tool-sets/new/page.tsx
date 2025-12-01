import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createToolSet } from '../actions'
import Link from 'next/link'
import { ToolSetForm } from './ToolSetForm'

export default async function NewToolSetPage() {
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
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('serial_number')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
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
