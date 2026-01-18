import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import Image from 'next/image'
import { DeleteToolButton } from './DeleteToolButton'
import { QRCodeDisplay } from './QRCodeDisplay'
import { AddToolItemButton } from './AddToolItemButton'
import { ToolItemQRCodeList } from './ToolItemQRCodeList'

export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ item_id?: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { item_id } = await searchParams  // 組織のQR印刷サイズ設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('qr_print_size')
    .eq('id', organizationId)
    .single()

  const qrSize = organization?.qr_print_size || 25

  const { data: tool, error } = await supabase
    .from('tools')
    .select('*, tool_categories (name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !tool) {
    redirect('/tools')
  }

  const { data: toolItems } = await supabase
    .from('tool_items')
    .select('*, current_site:sites(name), warehouse_location:warehouse_locations(code, display_name)')
    .eq('tool_id', id)
    .is('deleted_at', null)
    .order('serial_number')

  // 在庫調整履歴を取得
  const { data: adjustments } = await supabase
    .from('tool_movements')
    .select(`
      *,
      performed_by_user:users!tool_movements_performed_by_fkey(name)
    `)
    .eq('tool_id', id)
    .eq('movement_type', 'adjustment')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <Link href="/tools" className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 inline-block">
            ← 道具一覧に戻る
          </Link>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">道具詳細</h1>
          <p className="mt-1 text-sm text-gray-500">ID: {tool.id}</p>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">基本情報</h3>
            </div>
            <div className="flex space-x-3">
              <Link href={`/tools/${tool.id}/edit`} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                編集
              </Link>
              <DeleteToolButton toolId={tool.id} toolName={tool.name} />
            </div>
          </div>
          {tool.image_url && (
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200 bg-gray-50">
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-white">
                <Image src={tool.image_url} alt={tool.name} fill className="object-contain" unoptimized />
              </div>
            </div>
          )}
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">道具名</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">型番</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.model_number || '未設定'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">メーカー</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.manufacturer || '未設定'}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">数量</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.quantity}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">最小在庫数</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.minimum_stock}</dd>
              </div>
              {tool.notes && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">備考</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          {/* スマホ: 縦並び、PC: 横並び */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">個別アイテム一覧（全{toolItems?.length || 0}台）</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">各物理的な道具の詳細情報</p>
              </div>
              <div className="sm:flex-shrink-0">
                <AddToolItemButton toolId={tool.id} toolName={tool.name} />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <ToolItemQRCodeList
              toolItems={toolItems || []}
              toolName={tool.name}
              toolUnit="台"
              item_id={item_id}
              qrSize={qrSize}
            />
          </div>
        </div>

        {/* 在庫調整履歴 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">在庫調整履歴</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">最新10件の在庫調整履歴</p>
          </div>
          <div className="border-t border-gray-200">
            {adjustments && adjustments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {adjustments.map((adjustment) => {
                  const date = new Date(adjustment.created_at)
                  const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                  return (
                    <li key={adjustment.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{formattedDate}</span>
                            <span className="ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              在庫調整
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-gray-700">
                            <p>数量: {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}台</p>
                            {adjustment.notes && <p className="mt-1 text-gray-500">📝 {adjustment.notes}</p>}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            実施者: {(adjustment.performed_by_user as any)?.name || '不明'}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">在庫調整履歴がありません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
