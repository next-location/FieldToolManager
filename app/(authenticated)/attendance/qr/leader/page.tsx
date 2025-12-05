import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceQRGenerator from './AttendanceQRGenerator'

/**
 * 出退勤QR発行ページ
 * リーダー・管理者が会社QRと現場QRを発行する
 */
export default async function AttendanceQRPage() {
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

  // リーダー・管理者の権限確認
  if (!['leader', 'manager', 'admin'].includes(userData.role)) {
    redirect('/')
  }

  const isAdminOrManager = ['admin', 'manager'].includes(userData.role)

  // 現場リスト取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 有効な現場QR履歴を取得
  const now = new Date().toISOString()
  const { data: qrLogs } = await supabase
    .from('site_leader_qr_logs')
    .select(`
      id,
      site_id,
      qr_code_data,
      generated_at,
      expires_at,
      is_active,
      sites (
        name
      )
    `)
    .eq('organization_id', userData.organization_id)
    .eq('is_active', true)
    .gte('expires_at', now)
    .order('generated_at', { ascending: false })

  // 既存QRのQR画像を生成
  const QRCode = require('qrcode')
  const qrLogsWithImages = await Promise.all(
    (qrLogs || []).map(async (qr: any) => {
      try {
        const qrImage = await QRCode.toDataURL(qr.qr_code_data, {
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'M',
        })
        return { ...qr, qr_image: qrImage }
      } catch (error) {
        console.error('QR image generation error:', error)
        return qr
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">出退勤QR発行</h1>
          <p className="mt-2 text-sm text-gray-600">
            会社・現場での出退勤用QRコードを発行します。有効期限は出退勤設定の「QR更新頻度」で設定されます
          </p>
        </div>

        <AttendanceQRGenerator
          sites={sites || []}
          existingQRs={qrLogsWithImages}
          userRole={userData.role}
          isAdminOrManager={isAdminOrManager}
        />
      </div>
    </div>
  )
}
