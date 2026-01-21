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
    const { data: sites, error } = await supabase
      .from('sites')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching sites:', error)
      return NextResponse.json({ error: '現場データの取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      '現場名',
      '現場コード',
      '住所',
      '開始日',
      '終了日',
      'ステータス',
      '担当リーダー',
      '備考',
      '登録日',
    ]

    // ステータスのラベル変換
    const getStatusLabel = (isActive: boolean) => {
      return isActive ? '進行中' : '終了'
    }

    // CSVデータ行
    const rows = sites.map((site) => [
      site.name,
      site.site_code || '',
      site.address || '',
      site.start_date || '',
      site.end_date || '',
      getStatusLabel(site.is_active),
      site.leader_name || '',
      site.notes || '',
      new Date(site.created_at).toLocaleDateString('ja-JP'),
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
        'Content-Disposition': `attachment; filename="sites_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting sites:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '現場エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
