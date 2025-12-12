import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 入金記録一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const invoiceId = searchParams.get('invoice_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payment_records')
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
        ),
        users (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .order('payment_date', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Payments API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      payments: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error('[Payments API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 入金記録作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    console.log('[Payments API] Session:', session);

    const body = await request.json();
    console.log('[Payments API] Request body:', body);

    // 請求書情報を取得
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, organization_id, total_amount, status')
      .eq('id', body.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('[Payments API] Invoice error:', invoiceError);
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
    }

    console.log('[Payments API] Invoice found:', invoice);

    // payment_recordsのcreated_byはusersテーブルを参照しているため、
    // super_adminの場合はnullにする（外部キー制約違反を回避）
    const paymentData = {
      organization_id: invoice.organization_id,
      invoice_id: body.invoice_id,
      payment_date: body.payment_date,
      amount: body.amount,
      payment_method: body.payment_method,
      reference_number: body.reference_number,
      notes: body.notes,
      created_by: null, // super_adminはusersテーブルにいないためnull
    };

    console.log('[Payments API] Payment data to insert:', paymentData);

    // 入金記録を作成
    const { data: payment, error } = await supabase
      .from('payment_records')
      .insert(paymentData)
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
      console.error('[Payments API] Create error:', error);
      console.error('[Payments API] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Payments API] Payment created:', payment);

    // 請求書の入金額を集計して、全額入金されていたらステータスを更新
    const { data: allPayments } = await supabase
      .from('payment_records')
      .select('amount')
      .eq('invoice_id', body.invoice_id);

    if (allPayments) {
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (totalPaid >= Number(invoice.total_amount)) {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
          })
          .eq('id', body.invoice_id);
      }
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error('[Payments API] Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
