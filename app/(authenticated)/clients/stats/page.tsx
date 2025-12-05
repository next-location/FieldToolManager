import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientsStats from '../ClientsStats'

export default async function ClientsStatsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('email', user.email)
    .single()

  // 管理者のみアクセス可能
  if (!userData || userData.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">取引先統計・分析</h1>
        <p className="mt-2 text-sm text-gray-600">
          取引先に関する統計情報と分析レポートを表示します
        </p>
      </div>

      <ClientsStats />
    </div>
  )
}
