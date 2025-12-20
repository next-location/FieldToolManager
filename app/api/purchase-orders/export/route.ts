import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchase-orders/export - 発注書一覧のCSVエクスポート
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id') // 変更: supplier_id → client_id
    const projectId = searchParams.get('project_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // 発注書一覧取得
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        client:clients!purchase_orders_client_id_fkey(id, name, client_code),
        project:projects(id, project_name, project_code),
        items:purchase_order_items(*)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // フィルター適用
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (clientId) {
      query = query.eq('client_id', clientId) // 変更: supplier_id → client_id
    }
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (startDate) {
      query = query.gte('order_date', startDate)
    }
    if (endDate) {
      query = query.lte('order_date', endDate)
    }

    const { data: orders, error } = await query.order('order_date', { ascending: false })

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return NextResponse.json({ error: '発注書の取得に失敗しました' }, { status: 500 })
    }

    // CSV生成
    const statusLabels: Record<string, string> = {
      draft: '下書き',
      submitted: '承認申請中',
      approved: '承認済み',
      rejected: '差戻し',
      ordered: '発注済み',
      partially_received: '一部納品済み',
      received: '納品済み',
      paid: '支払済み',
      cancelled: 'キャンセル',
    }

    // CSVヘッダー
    const headers = [
      '発注番号',
      'ステータス',
      '発注日',
      '仕入先コード',
      '仕入先名',
      '工事コード',
      '工事名',
      '小計',
      '消費税',
      '合計金額',
      '納期',
      '支払条件',
      '発注者',
      '承認者',
      '明細数',
      '備考',
      '作成日時',
    ]

    // CSVデータ行
    const rows = orders?.map((order) => {
      const itemCount = order.items?.length || 0
      return [
        order.order_number,
        statusLabels[order.status] || order.status,
        order.order_date || '',
        order.client?.client_code || '', // 変更: supplier?.supplier_code → client?.client_code
        order.client?.name || '', // 変更: supplier?.name → client?.name
        order.project?.project_code || '',
        order.project?.project_name || '',
        order.subtotal || 0,
        order.tax_amount || 0,
        order.total_amount || 0,
        order.delivery_date || '',
        order.payment_terms || '',
        order.ordered_by || '',
        order.approved_by || '',
        itemCount,
        (order.notes || '').replace(/\n/g, ' '),
        new Date(order.created_at).toLocaleString('ja-JP'),
      ]
    })

    // CSV文字列生成
    const csvContent = [
      headers.join(','),
      ...(rows?.map((row) => row.map((cell) => `"${cell}"`).join(',')) || []),
    ].join('\n')

    // BOM付きUTF-8で返す（Excel対応）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // レスポンス返却
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="purchase_orders_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
