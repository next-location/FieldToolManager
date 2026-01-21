import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/invoices/export - 請求書一覧のCSVエクスポート
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

    // 請求書一覧取得
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients!invoices_client_id_fkey(id, name, client_code),
        project:projects(id, project_name, project_code),
        items:invoice_items(*)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('invoice_date', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: '請求書の取得に失敗しました' }, { status: 500 })
    }

    // CSV生成
    const statusLabels: Record<string, string> = {
      draft: '下書き',
      submitted: '承認申請中',
      approved: '承認済み',
      rejected: '差戻し',
      sent: '送付済み',
      paid: '入金済み',
      overdue: '期限超過',
      cancelled: 'キャンセル',
    }

    const headers = [
      '請求書番号',
      '請求日',
      '取引先コード',
      '取引先名',
      '案件コード',
      '案件名',
      '件名',
      'ステータス',
      '請求金額（税抜）',
      '消費税',
      '合計金額',
      '支払期限',
      '入金日',
      '備考',
      '作成日',
    ]

    const rows = (invoices || []).map((invoice: any) => {
      const subtotal = invoice.subtotal || 0
      const taxAmount = invoice.tax_amount || 0
      const total = invoice.total_amount || 0

      return [
        invoice.invoice_number || '',
        invoice.invoice_date || '',
        invoice.client?.client_code || '',
        invoice.client?.name || '',
        invoice.project?.project_code || '',
        invoice.project?.project_name || '',
        invoice.title || '',
        statusLabels[invoice.status] || invoice.status,
        subtotal.toLocaleString(),
        taxAmount.toLocaleString(),
        total.toLocaleString(),
        invoice.due_date || '',
        invoice.payment_date || '',
        (invoice.notes || '').replace(/\n/g, ' '),
        invoice.created_at?.split('T')[0] || '',
      ]
    })

    // BOM付きUTF-8でCSV生成
    const bom = '\uFEFF'
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    return new NextResponse(bom + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoices_${new Date().toISOString().split('T')[0]}.csv"`,
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
