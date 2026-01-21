import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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

    // 管理者・リーダー権限チェック
    if (userData.role !== 'admin' && userData.role !== 'leader') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // データ取得
    const { data: consumables, error } = await supabase
      .from('consumables')
      .select(`
        *,
        category:consumable_categories(name)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching consumables:', error)
      return NextResponse.json({ error: '消耗品データの取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      '消耗品名',
      'カテゴリ',
      '型番',
      '在庫数',
      '最小在庫数',
      '単価',
      '低在庫アラート',
      '登録日',
    ]

    // CSVデータ行
    const rows = consumables.map((consumable) => [
      consumable.name,
      consumable.category?.name || '',
      consumable.model_number || '',
      consumable.quantity || 0,
      consumable.minimum_stock || 0,
      consumable.unit_price || '',
      consumable.enable_low_stock_alert ? 'ON' : 'OFF',
      new Date(consumable.created_at).toLocaleDateString('ja-JP'),
    ])

    // CSV生成
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    // BOM付きUTF-8
    const bom = '\uFEFF'
    const csvBlob = bom + csvContent

    return new NextResponse(csvBlob, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="consumables_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting consumables:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '消耗品エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
