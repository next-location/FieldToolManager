import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 請求書を入金済みにするAPI
 *
 * POST /api/admin/invoices/[id]/mark-as-paid
 *
 * スーパーアドミンが銀行口座を確認後、手動で入金確認を行う
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // 請求書情報を取得
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount, contract_id, organization_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
    }

    // 既に入金済みの場合
    if (invoice.status === 'paid') {
      return NextResponse.json({
        error: 'この請求書は既に入金済みです',
        invoice_number: invoice.invoice_number,
      }, { status: 400 });
    }

    const paymentDate = new Date().toISOString();

    // 入金記録を作成
    const { error: paymentError } = await supabase
      .from('payment_records')
      .insert({
        organization_id: invoice.organization_id,
        invoice_id: invoiceId,
        payment_date: paymentDate.split('T')[0],
        amount: invoice.total_amount,
        payment_method: 'bank_transfer',
        reference_number: null,
        notes: 'スーパーアドミンによる入金確認',
        created_by: null,
      });

    if (paymentError) {
      console.error('[MarkAsPaid] Failed to create payment record:', paymentError);
      return NextResponse.json({
        error: '入金記録の作成に失敗しました',
        details: paymentError.message,
      }, { status: 500 });
    }

    // 請求書ステータスを更新
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: paymentDate,
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[MarkAsPaid] Failed to update invoice:', updateError);
      return NextResponse.json({
        error: '請求書の更新に失敗しました',
        details: updateError.message,
      }, { status: 500 });
    }

    console.log('[MarkAsPaid] Invoice marked as paid:', {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.total_amount,
    });

    // 契約の初回請求書の場合、契約完了ボタンが表示されるようになる
    // (contract.status === 'draft' && initialInvoice.status === 'paid')

    return NextResponse.json({
      success: true,
      message: '入金確認が完了しました',
      invoice_number: invoice.invoice_number,
      paid_date: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[MarkAsPaid] Error:', error);
    return NextResponse.json({
      error: '入金確認処理に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
