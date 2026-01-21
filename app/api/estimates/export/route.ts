import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/estimates/export - 見積書一覧のCSVエクスポート
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

    // 見積書一覧取得
    const { data: estimates, error } = await supabase
      .from('estimates')
      .select(`
        *,
        client:clients!estimates_client_id_fkey(id, name, client_code),
        project:projects(id, project_name, project_code),
        items:estimate_items(*)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('estimate_date', { ascending: false })

    if (error) {
      console.error('Error fetching estimates:', error)
      return NextResponse.json({ error: '見積書の取得に失敗しました' }, { status: 500 })
    }

    // CSV生成
    const statusLabels: Record<string, string> = {
      draft: '下書き',
      submitted: '承認申請中',
      approved: '承認済み',
      rejected: '差戻し',
      sent: '送付済み',
      accepted: '受注',
      declined: '失注',
      expired: '期限切れ',
    }

    const headers = [
      '見積番号',
      '見積日',
      '取引先コード',
      '取引先名',
      '案件コード',
      '案件名',
      '件名',
      'ステータス',
      '見積金額（税抜）',
      '消費税',
      '合計金額',
      '有効期限',
      '備考',
      '作成日',
    ]

    const rows = (estimates || []).map((estimate: any) => {
      const subtotal = estimate.subtotal || 0
      const taxAmount = estimate.tax_amount || 0
      const total = estimate.total_amount || 0

      return [
        estimate.estimate_number || '',
        estimate.estimate_date || '',
        estimate.client?.client_code || '',
        estimate.client?.name || '',
        estimate.project?.project_code || '',
        estimate.project?.project_name || '',
        estimate.title || '',
        statusLabels[estimate.status] || estimate.status,
        subtotal.toLocaleString(),
        taxAmount.toLocaleString(),
        total.toLocaleString(),
        estimate.valid_until || '',
        (estimate.notes || '').replace(/\n/g, ' '),
        estimate.created_at?.split('T')[0] || '',
      ]
    })

    // BOM付きUTF-8でCSV生成
    const bom = '\uFEFF'
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    return new NextResponse(bom + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="estimates_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
