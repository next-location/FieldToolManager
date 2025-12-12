import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

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

    // 統計情報を取得
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)

    if (clientsError) {
      return NextResponse.json({ error: '取引先情報の取得に失敗しました' }, { status: 500 })
    }

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

      // 取引実績
      transactions: {
        totalAmount: clients.reduce((sum, c) => sum + (c.total_transaction_amount || 0), 0),
        totalCount: clients.reduce((sum, c) => sum + (c.transaction_count || 0), 0),
        averageAmount: clients.length > 0
          ? clients.reduce((sum, c) => sum + (c.total_transaction_amount || 0), 0) / clients.length
          : 0,
      },

      // 与信限度額の合計
      totalCreditLimit: clients
        .filter((c) => c.credit_limit !== null)
        .reduce((sum, c) => sum + (c.credit_limit || 0), 0),

      // インボイス登録事業者数
      invoiceRegistered: clients.filter((c) => c.tax_registration_number !== null && c.tax_registration_number !== '').length,

      // 免税事業者数
      taxExempt: clients.filter((c) => c.is_tax_exempt).length,
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
