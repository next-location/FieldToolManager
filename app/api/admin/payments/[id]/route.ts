import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT: 入金記録更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    console.log('[Payment Update] Payment ID:', id);
    console.log('[Payment Update] Update data:', body);

    // 既存の入金記録を取得
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payment_records')
      .select('id, invoice_id, amount')
      .eq('id', id)
      .single();

    if (fetchError || !existingPayment) {
      console.error('[Payment Update] Payment not found:', fetchError);
      return NextResponse.json({ error: '入金記録が見つかりません' }, { status: 404 });
    }

    // 入金記録を更新
    const { data: payment, error } = await supabase
      .from('payment_records')
      .update({
        payment_date: body.payment_date,
        amount: body.amount,
        payment_method: body.payment_method,
        reference_number: body.reference_number,
        notes: body.notes,
      })
      .eq('id', id)
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          total_amount,
          organizations (
            id,
            name
          )
        )
      `)
      .single();

    if (error) {
      console.error('[Payment Update] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Payment Update] Payment updated:', payment);

    // 請求書の入金額を再集計してステータスを更新
    const { data: allPayments } = await supabase
      .from('payment_records')
      .select('amount')
      .eq('invoice_id', existingPayment.invoice_id);

    if (allPayments) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', existingPayment.invoice_id)
        .single();

      if (invoice) {
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const newStatus = totalPaid >= Number(invoice.total_amount) ? 'paid' : 'sent';

        await supabase
          .from('invoices')
          .update({
            status: newStatus,
            paid_date: newStatus === 'paid' ? new Date().toISOString() : null,
          })
          .eq('id', existingPayment.invoice_id);

        console.log('[Payment Update] Invoice status updated:', newStatus);
      }
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('[Payment Update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 入金記録削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    console.log('[Payment Delete] Payment ID:', id);

    // 入金記録を取得（削除前に請求書IDを保持）
    const { data: payment, error: fetchError } = await supabase
      .from('payment_records')
      .select('id, invoice_id, amount')
      .eq('id', id)
      .single();

    if (fetchError || !payment) {
      console.error('[Payment Delete] Payment not found:', fetchError);
      return NextResponse.json({ error: '入金記録が見つかりません' }, { status: 404 });
    }

    const invoiceId = payment.invoice_id;

    // 入金記録を削除
    const { error: deleteError } = await supabase
      .from('payment_records')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Payment Delete] Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[Payment Delete] Payment deleted');

    // 請求書の入金額を再集計してステータスを更新
    const { data: remainingPayments } = await supabase
      .from('payment_records')
      .select('amount')
      .eq('invoice_id', invoiceId);

    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', invoiceId)
      .single();

    if (invoice) {
      const totalPaid = remainingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const newStatus = totalPaid >= Number(invoice.total_amount) ? 'paid' : 'sent';

      await supabase
        .from('invoices')
        .update({
          status: newStatus,
          paid_date: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', invoiceId);

      console.log('[Payment Delete] Invoice status updated:', newStatus);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Payment Delete] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
