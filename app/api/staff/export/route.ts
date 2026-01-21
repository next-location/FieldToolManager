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

    // 管理者権限チェック（スタッフ情報は個人情報のため管理者のみ）
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // データ取得
    const { data: staff, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching staff:', error)
      return NextResponse.json({ error: 'スタッフデータの取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      'スタッフ名',
      'メールアドレス',
      'ロール',
      '部署',
      '電話番号',
      '有効フラグ',
      '登録日',
    ]

    // ロールのラベル変換
    const getRoleLabel = (role: string) => {
      const labels: Record<string, string> = {
        admin: '管理者',
        leader: 'リーダー',
        staff: 'スタッフ',
      }
      return labels[role] || role
    }

    // CSVデータ行
    const rows = staff.map((user) => [
      user.name,
      user.email,
      getRoleLabel(user.role),
      user.department || '',
      user.phone || '',
      user.is_active ? '有効' : '無効',
      new Date(user.created_at).toLocaleDateString('ja-JP'),
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
        'Content-Disposition': `attachment; filename="staff_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting staff:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'スタッフエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
