import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { logInvoiceCreated } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[INVOICES CREATE API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const supabase = await createClient()

    // ユーザー認証
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    // リーダー以上の権限チェック
    if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
      return NextResponse.json({ error: '請求書作成権限がありません' }, { status: 403 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { invoiceData, items, status = 'draft' } = body

    // リーダーの場合は承認申請、マネージャー以上の場合は承認済みで作成
    let invoiceStatus = status
    if (status === 'submitted') {
      if (['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
        invoiceStatus = 'approved' // マネージャー以上は即承認
      }
    }

    // 請求書を作成（サーバーサイドなのでRLSを回避）
    const { data: invoice, error: invoiceError } = await supabase
      .from('billing_invoices')
      .insert({
        ...invoiceData,
        organization_id: userData?.organization_id,
        status: invoiceStatus,
        created_by: user.id,
        // マネージャー以上の場合は承認情報も設定
        ...(invoiceStatus === 'approved' && {
          manager_approved_at: new Date().toISOString(),
          manager_approved_by: user.id
        })
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Invoice creation error:', invoiceError)
      throw invoiceError
    }

    // 明細を作成
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any, index: number) => ({
        invoice_id: invoice.id,
        display_order: index + 1,
        item_type: item.item_type,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_rate: item.tax_rate
      }))

      const { error: itemsError } = await supabase
        .from('billing_invoice_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Items creation error:', itemsError)
        // 請求書は作成されているので、明細だけ失敗した場合はロールバックを試みる
        await supabase.from('billing_invoices').delete().eq('id', invoice.id)
        throw itemsError
      }
    }

    // 履歴を記録
    const actionType = status === 'draft' ? 'draft_saved' : (invoiceStatus === 'approved' ? 'approved' : 'submitted')
    await supabase
      .from('invoice_history')
      .insert({
        invoice_id: invoice.id,
        organization_id: userData?.organization_id,
        action_type: actionType,
        performed_by: user.id,
        performed_by_name: userData?.name || 'Unknown',
        notes: status === 'draft' ? '請求書を下書きとして保存しました' :
               invoiceStatus === 'approved' ? '請求書を作成し承認しました' :
               '請求書を作成し提出しました'
      })

    // 監査ログを記録
    await logInvoiceCreated(invoice.id, {
      invoice_number: invoiceData.invoice_number,
      client_id: invoiceData.client_id,
      project_id: invoiceData.project_id,
      status: invoiceStatus,
      total_amount: invoiceData.total_amount,
    })

    return NextResponse.json({ success: true, invoice })
  } catch (error: any) {
    console.error('Error creating invoice:', error)

    // エラーメッセージを日本語化
    let errorMessage = '請求書の作成に失敗しました'

    if (error.code === '23514') {
      errorMessage = '明細の種別が不正です。正しい種別を選択してください'
    } else if (error.code === '23503') {
      errorMessage = '取引先または工事が見つかりません'
    } else if (error.code === '42501') {
      errorMessage = 'データの作成権限がありません'
    } else if (error.message) {
      // PostgreSQLエラーメッセージを日本語に変換
      if (error.message.includes('violates check constraint')) {
        errorMessage = '入力データが制約に違反しています'
      } else if (error.message.includes('violates foreign key')) {
        errorMessage = '関連データが存在しません'
      } else if (error.message.includes('violates row-level security')) {
        errorMessage = 'データへのアクセス権限がありません'
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
