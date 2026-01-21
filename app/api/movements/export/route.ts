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

    // データ取得（直近1000件に制限）
    const { data: movements, error } = await supabase
      .from('tool_movements')
      .select(`
        *,
        tool:tools(name),
        tool_item:tool_items(serial_number),
        user:users(name),
        from_site:sites!tool_movements_from_site_id_fkey(name),
        to_site:sites!tool_movements_to_site_id_fkey(name)
      `)
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Error fetching movements:', error)
      return NextResponse.json({ error: '移動履歴データの取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      '移動日時',
      '道具名',
      'シリアル番号',
      '移動元',
      '移動先',
      '担当者',
      'QRスキャン',
      '備考',
    ]

    // CSVデータ行
    const rows = movements.map((movement) => [
      new Date(movement.created_at).toLocaleString('ja-JP'),
      movement.tool?.name || '',
      movement.tool_item?.serial_number || '',
      movement.from_site?.name || movement.from_location || '',
      movement.to_site?.name || movement.to_location || '',
      movement.user?.name || '',
      movement.qr_scanned ? 'あり' : 'なし',
      movement.notes || '',
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
        'Content-Disposition': `attachment; filename="movements_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting movements:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '移動履歴エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
