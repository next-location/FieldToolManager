import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // ユーザー認証
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 期間に基づく日付範囲の計算
    let dateFilter = null
    const now = new Date()

    if (period === 'custom' && startDate && endDate) {
      dateFilter = { start: startDate, end: endDate }
    } else if (period !== 'all') {
      const start = new Date()
      switch (period) {
        case '1month':
          start.setMonth(now.getMonth() - 1)
          break
        case '3months':
          start.setMonth(now.getMonth() - 3)
          break
        case '6months':
          start.setMonth(now.getMonth() - 6)
          break
        case '1year':
          start.setFullYear(now.getFullYear() - 1)
          break
      }
      dateFilter = { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
    }

    // 統計情報を取得
    let query = supabase
      .from('clients')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)

    // 期間フィルターを適用（作成日ベース）
    if (dateFilter) {
      query = query
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end)
    }

    const { data: clients, error: clientsError } = await query

    if (clientsError) {
      return NextResponse.json({ error: '取引先情報の取得に失敗しました' }, { status: 500 })
    }

    // 売掛金（未入金額）の計算用に全請求書を取得
    const { data: allInvoices } = await supabase
      .from('billing_invoices')
      .select('total_amount, paid_amount')
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // 売掛金（未入金額）の計算
    const receivables = allInvoices?.reduce((sum, invoice) => {
      const unpaidAmount = Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)
      return sum + (unpaidAmount > 0 ? unpaidAmount : 0)
    }, 0) || 0

    // 統計計算
    const stats = {
      // 総取引先数
      total: clients.length,

      // 有効な取引先数
      active: clients.filter((c) => c.is_active).length,

      // 無効な取引先数
      inactive: clients.filter((c) => !c.is_active).length,

      // 分類別カウント
      byType: {
        customer: clients.filter((c) => c.client_type === 'customer').length,
        supplier: clients.filter((c) => c.client_type === 'supplier').length,
        partner: clients.filter((c) => c.client_type === 'partner').length,
        both: clients.filter((c) => c.client_type === 'both').length,
      },

      // 評価の平均
      averageRating: clients.length > 0
        ? clients
            .filter((c) => c.rating !== null)
            .reduce((sum, c) => sum + (c.rating || 0), 0) /
          clients.filter((c) => c.rating !== null).length
        : 0,

      // 評価別カウント
      byRating: {
        5: clients.filter((c) => c.rating === 5).length,
        4: clients.filter((c) => c.rating === 4).length,
        3: clients.filter((c) => c.rating === 3).length,
        2: clients.filter((c) => c.rating === 2).length,
        1: clients.filter((c) => c.rating === 1).length,
        none: clients.filter((c) => c.rating === null).length,
      },

      // 取引実績（後でbilling_invoicesから集計して上書き）
      transactions: {
        totalAmount: 0,
        totalCount: 0,
        averageAmount: 0,
      },

      // 与信限度額の合計
      totalCreditLimit: clients
        .filter((c) => c.credit_limit !== null)
        .reduce((sum, c) => sum + (c.credit_limit || 0), 0),

      // 与信使用額（売掛金）
      creditUsed: receivables,

      // インボイス登録事業者数
      invoiceRegistered: clients.filter((c) => c.tax_registration_number !== null && c.tax_registration_number !== '').length,

      // 免税事業者数
      taxExempt: clients.filter((c) => c.is_tax_exempt).length,
    }

    // 月次取引データを取得（過去12ヶ月）
    const { data: invoices } = await supabase
      .from('billing_invoices')
      .select('client_id, total_amount, paid_amount, invoice_date')
      .eq('organization_id', userData.organization_id)
      .gte('invoice_date', new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0])
      .order('invoice_date', { ascending: true })

    // 支払いデータを取得（過去12ヶ月）
    const { data: payments } = await supabase
      .from('payments')
      .select('payment_type, amount, payment_date, invoice_id, purchase_order_id')
      .eq('organization_id', userData.organization_id)
      .gte('payment_date', new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('payment_date', { ascending: true })

    // 月次データを集計
    const monthlyMap = new Map<string, { sales: number; purchases: number; profit: number; transactionCount: number }>()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = `${date.getMonth() + 1}月`
      monthlyMap.set(key, { sales: 0, purchases: 0, profit: 0, transactionCount: 0 })
    }

    // 請求書データから月次売上と取引件数を集計
    invoices?.forEach((invoice) => {
      const date = new Date(invoice.invoice_date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const data = monthlyMap.get(key)
      if (data) {
        const client = clients.find((c) => c.id === invoice.client_id)
        if (client?.client_type === 'customer' || client?.client_type === 'both') {
          data.sales += Number(invoice.total_amount || 0)
          data.transactionCount += 1
        }
      }
    })

    // 支払いデータから仕入を集計
    payments?.forEach((payment) => {
      if (payment.payment_type === 'payment') {
        const date = new Date(payment.payment_date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const data = monthlyMap.get(key)
        if (data) {
          data.purchases += Number(payment.amount || 0)
        }
      }
    })

    // 粗利益と粗利益率を計算
    monthlyMap.forEach((data) => {
      data.profit = data.sales - data.purchases
    })

    const monthlyData = Array.from(monthlyMap.entries()).map(([key, data]) => {
      const [year, month] = key.split('-')
      const profitRate = data.sales > 0 ? (data.profit / data.sales) * 100 : 0
      return {
        month: `${parseInt(month)}月`,
        sales: data.sales,
        purchases: data.purchases,
        profit: data.profit,
        profitRate, // 粗利益率（%）
        transactionCount: data.transactionCount, // 取引件数
      }
    })

    // 取引先TOP5を取得
    const clientTotals = new Map<string, number>()
    invoices?.forEach((invoice) => {
      const current = clientTotals.get(invoice.client_id) || 0
      clientTotals.set(invoice.client_id, current + Number(invoice.total_amount || 0))
    })

    const topClients = Array.from(clientTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([clientId, amount]) => {
        const client = clients.find((c) => c.id === clientId)
        return {
          name: client?.name || '不明',
          amount,
          type: client?.client_type || 'customer',
        }
      })

    // 取引実績を実データで更新
    stats.transactions = {
      totalAmount: allInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0,
      totalCount: allInvoices?.length || 0,
      averageAmount: allInvoices && allInvoices.length > 0
        ? allInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) / allInvoices.length
        : 0,
    }

    // 選択期間の集計データを計算
    const periodSummary = {
      totalSales: monthlyData.reduce((sum, m) => sum + m.sales, 0),
      totalPurchases: monthlyData.reduce((sum, m) => sum + m.purchases, 0),
      totalProfit: monthlyData.reduce((sum, m) => sum + m.profit, 0),
      averageProfitRate: monthlyData.length > 0
        ? monthlyData.reduce((sum, m) => sum + m.profitRate, 0) / monthlyData.length
        : 0,
      averageAmountPerClient: clients.length > 0
        ? monthlyData.reduce((sum, m) => sum + m.sales, 0) / clients.length
        : 0,
    }

    return NextResponse.json({
      data: {
        ...stats,
        monthlyData,
        topClients,
        periodSummary, // 期間サマリーを追加
      }
    })
  } catch (error) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
