import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { logInvoiceApproved } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[INVOICES APPROVE API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, organization_id, name')
      .eq('id', user.id)
      .single()

    // マネージャー以上のみ承認可能
    if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '承認権限がありません' }, { status: 403 })
    }

    // 請求書を取得
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // 提出済み状態のみ承認可能
    if (invoice.status !== 'submitted') {
      return NextResponse.json({ error: '提出済み状態の請求書のみ承認できます' }, { status: 400 })
    }

    // ステータスを承認済みに変更
    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        status: 'approved',
        manager_approved_at: new Date().toISOString(),
        manager_approved_by: userData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: '承認処理に失敗しました' }, { status: 500 })
    }

    // 操作履歴を記録
    await supabase.from('invoice_history').insert({
      invoice_id: id,
      organization_id: userData.organization_id,
      action_type: 'approved',
      performed_by: userData.id,
      performed_by_name: userData.name || 'Unknown',
      notes: null
    })

    // 監査ログを記録
    await logInvoiceApproved(id, {
      invoice_number: invoice.invoice_number,
      approved_by: userData.name || 'Unknown',
      approved_by_id: userData.id,
      approved_at: new Date().toISOString(),
    })

    // 提出者に通知を送信（承認者本人でない場合）
    if (invoice.submitted_by && invoice.submitted_by !== userData.id) {
      console.log('[APPROVE INVOICE] Sending notification to submitter:', invoice.submitted_by)
      const { error: notificationError } = await supabase.from('notifications').insert({
        target_user_id: invoice.submitted_by,
        organization_id: userData.organization_id,
        type: 'invoice_approved',
        title: '請求書が承認されました',
        message: `請求書「${invoice.invoice_number}」が${userData.name || 'マネージャー'}により承認されました。顧客に送付できます。`,
        severity: 'success',
        metadata: {
          invoice_id: id,
          invoice_number: invoice.invoice_number,
          approved_by: userData.name || 'Unknown',
          approved_by_id: userData.id
        }
      })

      if (notificationError) {
        console.error('[APPROVE INVOICE] Notification error:', notificationError)
      } else {
        console.log('[APPROVE INVOICE] Notification sent successfully to submitter')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Approve invoice error:', error)
    return NextResponse.json(
      { error: error.message || '承認に失敗しました' },
      { status: 500 }
    )
  }
}
