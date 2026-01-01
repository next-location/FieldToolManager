import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { ToolBulkQRClient } from './ToolBulkQRClient'

export default async function ToolsBulkQRPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報を取得

  // 組織設定を取得（QRサイズ）
  const { data: organization } = await supabase
    .from('organizations')
    .select('qr_print_size')
    .eq('id', organizationId)
    .single()

  const qrSize = organization?.qr_print_size || 25

  // すべての個別管理道具を取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, tool_categories (name)')
    .eq('management_type', 'individual')
    .is('deleted_at', null)
    .order('name')

  // すべての個別アイテムを取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(`
      id,
      tool_id,
      serial_number,
      qr_code,
      tool:tools (
        id,
        name,
        tool_categories (name)
      )
    `)
    .is('deleted_at', null)
    .order('serial_number')

  const itemsWithDetails = (toolItems || []).map((item) => ({
    id: item.id,
    qrCode: item.qr_code,
    name: `${(item.tool as any)?.name} #${item.serial_number}`,
    code: `シリアル: ${item.serial_number}`,
    toolId: item.tool_id,
    toolName: (item.tool as any)?.name || '',
    category: (item.tool as any)?.tool_categories?.name || '未分類',
  }))

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/tools"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 道具一覧に戻る
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            道具QRコード一括印刷
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            印刷したい道具アイテムを選択してください
          </p>
        </div>

        <ToolBulkQRClient items={itemsWithDetails} qrSize={qrSize} />
      </div>
    </div>
  )
}
