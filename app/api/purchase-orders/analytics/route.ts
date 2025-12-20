import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchase-orders/analytics - 発注分析データ取得
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

    // 期間指定（デフォルト: 過去12ヶ月）
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endDate = searchParams.get('end_date') || new Date().toISOString().slice(0, 10)

    // 発注書データ取得
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        order_date,
        status,
        total_amount,
        supplier_id,
        project_id,
        supplier:suppliers(id, name, supplier_code),
        project:projects(id, project_name, project_code)
      `)
      .eq('organization_id', userData.organization_id)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .is('deleted_at', null)

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: '発注書の取得に失敗しました' }, { status: 500 })
    }

    // 月別集計
    const monthlyData: Record<string, { month: string; count: number; amount: number }> = {}
    orders?.forEach((order) => {
      const month = order.order_date?.slice(0, 7) || '' // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, count: 0, amount: 0 }
      }
      monthlyData[month].count++
      monthlyData[month].amount += Number(order.total_amount || 0)
    })

    const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))

    // 仕入先別集計
    const supplierData: Record<string, { id: string; name: string; code: string; count: number; amount: number }> = {}
    orders?.forEach((order) => {
      if (order.supplier && !Array.isArray(order.supplier)) {
        const supplier = order.supplier as { id: string; name: string; supplier_code: string }
        const supplierId = supplier.id
        if (!supplierData[supplierId]) {
          supplierData[supplierId] = {
            id: supplier.id,
            name: supplier.name,
            code: supplier.supplier_code,
            count: 0,
            amount: 0,
          }
        }
        supplierData[supplierId].count++
        supplierData[supplierId].amount += Number(order.total_amount || 0)
      }
    })

    const supplierRanking = Object.values(supplierData)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // 工事別集計
    const projectData: Record<string, { id: string; name: string; code: string; count: number; amount: number }> = {}
    orders?.forEach((order) => {
      if (order.project && !Array.isArray(order.project)) {
        const project = order.project as { id: string; project_name: string; project_code: string }
        const projectId = project.id
        if (!projectData[projectId]) {
          projectData[projectId] = {
            id: project.id,
            name: project.project_name,
            code: project.project_code,
            count: 0,
            amount: 0,
          }
        }
        projectData[projectId].count++
        projectData[projectId].amount += Number(order.total_amount || 0)
      }
    })

    const projectRanking = Object.values(projectData)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // ステータス別集計
    const statusData: Record<string, { count: number; amount: number }> = {}
    orders?.forEach((order) => {
      const status = order.status
      if (!statusData[status]) {
        statusData[status] = { count: 0, amount: 0 }
      }
      statusData[status].count++
      statusData[status].amount += Number(order.total_amount || 0)
    })

    // サマリー統計
    const summary = {
      total_count: orders?.length || 0,
      total_amount: orders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
      average_amount: orders?.length ? (orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) / orders.length) : 0,
      approved_count: orders?.filter((o) => ['approved', 'ordered', 'partially_received', 'received', 'paid'].includes(o.status)).length || 0,
      approved_amount: orders?.filter((o) => ['approved', 'ordered', 'partially_received', 'received', 'paid'].includes(o.status)).reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
      pending_count: orders?.filter((o) => o.status === 'submitted').length || 0,
      pending_amount: orders?.filter((o) => o.status === 'submitted').reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
    }

    return NextResponse.json({
      period: { start: startDate, end: endDate },
      summary,
      monthly_trend: monthlyTrend,
      supplier_ranking: supplierRanking,
      project_ranking: projectRanking,
      status_breakdown: statusData,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
