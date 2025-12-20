import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/projects/:id/purchase-orders/summary - 工事別発注集計取得
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
      .select('id, name, organization_id, budget')
      .eq('id', projectId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!project) {
      return NextResponse.json({ error: '工事が見つかりません' }, { status: 404 })
    }

    // 発注書一覧取得（集計用）
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select('id, status, total_amount, order_date')
      .eq('project_id', projectId)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return NextResponse.json({ error: '発注書の取得に失敗しました' }, { status: 500 })
    }

    // ステータス別集計
    const summary = {
      total_count: orders?.length || 0,
      total_amount: 0,
      by_status: {
        draft: { count: 0, amount: 0 },
        submitted: { count: 0, amount: 0 },
        approved: { count: 0, amount: 0 },
        rejected: { count: 0, amount: 0 },
        ordered: { count: 0, amount: 0 },
        partially_received: { count: 0, amount: 0 },
        received: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
      },
      project_budget: project.budget || 0,
      budget_used_percentage: 0,
    }

    // 集計処理
    orders?.forEach((order) => {
      const amount = Number(order.total_amount) || 0
      summary.total_amount += amount

      if (summary.by_status[order.status as keyof typeof summary.by_status]) {
        summary.by_status[order.status as keyof typeof summary.by_status].count++
        summary.by_status[order.status as keyof typeof summary.by_status].amount += amount
      }
    })

    // 予算使用率計算
    if (project.budget && project.budget > 0) {
      summary.budget_used_percentage = (summary.total_amount / Number(project.budget)) * 100
    }

    return NextResponse.json({
      data: summary,
      project,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
