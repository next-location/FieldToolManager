import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[INVOICES SUBMIT API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const { id } = await params
    console.log('[SUBMIT INVOICE] Starting submission for invoice:', id)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[SUBMIT INVOICE] No user found')
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    console.log('[SUBMIT INVOICE] User authenticated:', user.id)

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, organization_id, name')
      .eq('id', user.id)
      .single()

    console.log('[SUBMIT INVOICE] User data:', userData, 'Error:', userError)

    if (!userData || !['leader', 'manager', 'admin', 'super_admin'].includes(userData.role)) {
      console.log('[SUBMIT INVOICE] Insufficient permissions')
      return NextResponse.json({ error: '請求書提出権限がありません' }, { status: 403 })
    }

    // 請求書を取得
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    console.log('[SUBMIT INVOICE] Invoice data:', invoice, 'Error:', fetchError)

    if (fetchError || !invoice) {
      console.log('[SUBMIT INVOICE] Invoice not found')
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // 下書き状態のみ提出可能
    if (invoice.status !== 'draft') {
      console.log('[SUBMIT INVOICE] Invalid status:', invoice.status)
      return NextResponse.json({ error: '下書き状態の請求書のみ提出できます' }, { status: 400 })
    }

    // マネージャー以上の場合は自動承認
    const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userData.role)
    const newStatus = isManagerOrAdmin ? 'approved' : 'submitted'

    console.log('[SUBMIT INVOICE] Is manager or admin:', isManagerOrAdmin, 'New status:', newStatus)

    // ステータスを更新
    const updateData = {
      status: newStatus,
      submitted_at: new Date().toISOString(),
      submitted_by: userData.id,
      ...(isManagerOrAdmin && {
        manager_approved_at: new Date().toISOString(),
        manager_approved_by: userData.id
      })
    }

    console.log('[SUBMIT INVOICE] Update data:', updateData)

    const { data: updateResult, error: updateError } = await supabase
      .from('billing_invoices')
      .update(updateData)
      .eq('id', id)
      .select()

    console.log('[SUBMIT INVOICE] Update result:', updateResult, 'Error:', updateError)

    if (updateError) {
      console.error('[SUBMIT INVOICE] Update error:', updateError)
      return NextResponse.json({
        error: '請求書の提出に失敗しました',
        details: updateError.message,
        code: updateError.code
      }, { status: 500 })
    }

    // 操作履歴を記録
    const { error: historyError } = await supabase.from('invoice_history').insert({
      invoice_id: id,
      organization_id: userData.organization_id,
      action_type: isManagerOrAdmin ? 'approved' : 'submitted',
      performed_by: userData.id,
      performed_by_name: userData.name || 'Unknown',
      notes: isManagerOrAdmin ? 'マネージャーによる自動承認' : null
    })

    console.log('[SUBMIT INVOICE] History insert error:', historyError)

    console.log('[SUBMIT INVOICE] Submission completed successfully')
    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: any) {
    console.error('[SUBMIT INVOICE] Submit invoice error:', error)
    return NextResponse.json(
      { error: error.message || '請求書の提出に失敗しました' },
      { status: 500 }
    )
  }
}
