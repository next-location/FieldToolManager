import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SiteQRManagement from './SiteQRManagement'

/**
 * 現場QR管理ページ（管理者用）
 * 固定QRコードの発行・管理を行う
 */
export default async function QRManagePage() {
  const supabase = await createClient()

  // 認証確認
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('id, organization_id, role, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限確認
  if (!['manager', 'admin'].includes(userData.role)) {
    redirect('/')
  }

  // 現場リスト取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 既存の固定QRコード取得
  const { data: existingQRs } = await supabase
    .from('site_fixed_qr_codes')
    .select(`
      id,
      site_id,
      qr_data,
      generated_at,
      is_active,
      sites (
        name
      )
    `)
    .eq('organization_id', userData.organization_id)
    .eq('is_active', true)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">現場QR管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            現場ごとの固定QRコードを管理します（永続的に有効）
          </p>
        </div>

        <SiteQRManagement sites={sites || []} existingQRs={existingQRs || []} />
      </div>
    </div>
  )
}
