import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { DeleteToolButton } from './DeleteToolButton'
import { QRCodeDisplay } from './QRCodeDisplay'

export default async function ToolDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ item_id?: string }>
}) {
  const { id } = await params
  const { item_id } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link href="/tools" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            ← 道具一覧に戻る
          </Link>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">道具詳細</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">ID: {tool.id}</p>
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
                <dt className="text-sm font-medium text-gray-500">購入日</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.purchase_date || '未設定'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">購入価格</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{tool.purchase_price ? `¥${tool.purchase_price.toLocaleString()}` : '未設定'}</dd>
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
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">個別アイテム一覧（全{toolItems?.length || 0}台）</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">各物理的な道具の詳細情報</p>
          </div>
          <div className="border-t border-gray-200">
            {toolItems && toolItems.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {toolItems.map((item) => {
                  const statusClass = item.status === 'available' ? 'bg-green-100 text-green-800' : item.status === 'in_use' ? 'bg-blue-100 text-blue-800' : item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : item.status === 'lost' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  const statusText = item.status === 'available' ? '利用可能' : item.status === 'in_use' ? '使用中' : item.status === 'maintenance' ? 'メンテナンス中' : item.status === 'lost' ? '紛失' : item.status
                  const locationText = item.current_location === 'warehouse' ? (item.warehouse_location ? `倉庫 (${(item.warehouse_location as any).code} - ${(item.warehouse_location as any).display_name})` : '倉庫') : item.current_location === 'site' ? `現場: ${item.current_site ? (item.current_site as any).name : '不明'}` : item.current_location === 'repair' ? '修理中' : item.current_location === 'lost' ? '紛失' : item.current_location
                  return (
                    <li key={item.id} id={`item-${item.id}`} className={`px-4 py-4 sm:px-6 ${item_id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">#{item.serial_number}</p>
                            <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>{statusText}</span>
                          </div>
                          <div className="mt-2 flex flex-col gap-1 text-sm text-gray-500">
                            <div className="flex items-center">
                              <span className="text-xs text-gray-400 w-24">現在地:</span>
                              <span>📍 {locationText}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-24">QRコード:</span>
                              <div className="flex items-center gap-2">
                                <QRCodeDisplay value={item.qr_code} size={60} />
                                <span className="text-xs font-mono text-gray-400">{item.qr_code.substring(0, 8)}...</span>
                              </div>
                            </div>
                          </div>
                          {item.notes && <p className="mt-1 text-xs text-gray-500">📝 {item.notes}</p>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link href={`/tool-items/${item.id}`} className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50">詳細</Link>
                          <Link href={`/movements/new?tool_item_id=${item.id}`} className="inline-flex items-center px-3 py-1 border border-blue-600 rounded text-xs font-medium text-blue-600 bg-white hover:bg-blue-50">📦 移動</Link>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">個別アイテムが登録されていません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
