import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendProjectInvoiceEmail } from '@/lib/email/project-invoice'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ユーザー認証
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id, name')
      .eq('id', user.id)
      .single()

    // マネージャー以上の権限チェック
    if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
      return NextResponse.json({ error: '送付権限がありません' }, { status: 403 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { email, message } = body

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 })
    }

    // 請求書を取得（取引先と工事情報も含む）
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select(`
        *,
        client:clients(name, email),
        project:projects(name)
      `)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック
    if (invoice.status !== 'approved') {
      return NextResponse.json(
        { error: '送付できるのは承認済みの請求書のみです' },
        { status: 400 }
      )
    }

    // メール送信
    try {
      await sendProjectInvoiceEmail({
        toEmail: email,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.client?.name || '取引先',
        projectName: invoice.project?.name,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        totalAmount: invoice.total_amount,
        message: message || undefined,
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // メール送信失敗してもステータスは更新する（後で再送可能）
    }

    // 請求書を送付済みに更新
    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 履歴を記録
    await supabase
      .from('invoice_history')
      .insert({
        invoice_id: id,
        organization_id: userData?.organization_id,
        action_type: 'sent',
        performed_by: user.id,
        performed_by_name: userData?.name || 'Unknown',
        notes: message ? `${email}に送付: ${message}` : `${email}に送付しました`
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { error: '請求書の送付に失敗しました' },
      { status: 500 }
    )
  }
}
