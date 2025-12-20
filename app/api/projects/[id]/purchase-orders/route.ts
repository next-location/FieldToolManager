import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/projects/:id/purchase-orders - 工事別発注書一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
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

    // 工事の存在確認と権限チェック
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', projectId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!project) {
      return NextResponse.json({ error: '工事が見つかりません' }, { status: 404 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 発注書一覧取得
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code),
        items:purchase_order_items(*)
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // ステータスフィルター
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: orders, error, count } = await query
      .order('order_date', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return NextResponse.json({ error: '発注書の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: orders,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
      project,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
