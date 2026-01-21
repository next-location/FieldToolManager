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
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        *,
        category:equipment_categories(name)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: '設備データの取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      '設備名',
      'カテゴリ',
      '型番',
      'メーカー',
      'シリアル番号',
      '購入日',
      '購入価格',
      '現在地',
      'ステータス',
      '登録日',
    ]

    // ステータスのラベル変換
    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        available: '利用可能',
        in_use: '使用中',
        maintenance: 'メンテナンス中',
        retired: '廃棄',
      }
      return labels[status] || status
    }

    // CSVデータ行
    const rows = equipment.map((item) => [
      item.name,
      item.category?.name || '',
      item.model_number || '',
      item.manufacturer || '',
      item.serial_number || '',
      item.purchase_date || '',
      item.purchase_price || '',
      item.current_location || '',
      getStatusLabel(item.status),
      new Date(item.created_at).toLocaleDateString('ja-JP'),
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
        'Content-Disposition': `attachment; filename="equipment_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '設備エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
