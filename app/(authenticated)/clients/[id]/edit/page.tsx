import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ClientForm from '../../ClientForm'
import { Client } from '@/types/clients'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (userData.role !== 'admin') {
    redirect('/')
  }

  // 取引先詳細取得
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .single()

  if (error || !client) {
    redirect('/clients')
  }

  const typedClient = client as Client

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Link href={`/clients/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">
              ← 詳細に戻る
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">取引先編集</h1>
          <p className="mt-1 text-sm text-gray-600">
            {typedClient.name}（{typedClient.code}）の情報を編集します
          </p>
        </div>

        {/* フォーム */}
        <ClientForm client={typedClient} mode="edit" />
      </div>
    </div>
  )
}
