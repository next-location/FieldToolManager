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
    const { data: tools, error } = await supabase
      .from('tools')
      .select(`
        *,
        category:tool_categories(name)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching tools:', error)
      return NextResponse.json({ error: '道具データの取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      '道具名',
      'カテゴリ',
      '型番',
      'メーカー',
      '購入日',
      '購入価格',
      '在庫数',
      '最小在庫数',
      '低在庫アラート',
      '登録日',
    ]

    // CSVデータ行
    const rows = tools.map((tool) => [
      tool.name,
      tool.category?.name || '',
      tool.model_number || '',
      tool.manufacturer || '',
      tool.purchase_date || '',
      tool.purchase_price || '',
      tool.quantity || 0,
      tool.minimum_stock || 0,
      tool.enable_low_stock_alert ? 'ON' : 'OFF',
      new Date(tool.created_at).toLocaleDateString('ja-JP'),
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
        'Content-Disposition': `attachment; filename="tools_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting tools:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '道具エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
