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

  // 道具一覧を取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, model_number, quantity')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">道具セットを作成</h1>
            <Link
              href="/tool-sets"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 一覧に戻る
            </Link>
          </div>

          <ToolSetForm tools={tools || []} action={createToolSet} />
        </div>
      </div>
    </div>
  )
}
