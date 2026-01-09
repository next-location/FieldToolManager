import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 見積もりデータを取得
    const { data: estimate, error } = await supabase
      .from('invoices')
      .select(`
        *,
        organizations (
          name,
          billing_address
        ),
        contracts (
          billing_contact_name,
          billing_contact_email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !estimate) {
      return NextResponse.json({ error: '見積もりが見つかりません' }, { status: 404 });
    }

    // document_typeがestimateであることを確認
    if (estimate.document_type !== 'estimate') {
      return NextResponse.json({ error: 'この文書は見積もりではありません' }, { status: 400 });
    }

    // statusがestimateであることを確認
    if (estimate.status !== 'estimate') {
      return NextResponse.json({
        error: `見積もりの送信はestimateステータスでのみ可能です。現在のステータス: ${estimate.status}`
      }, { status: 400 });
    }

    if (!estimate.contracts?.billing_contact_email) {
      return NextResponse.json(
        { error: '請求先メールアドレスが登録されていません' },
        { status: 400 }
      );
    }

    // 見積もり明細を取得
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    // PDF生成（ダウンロードと同じgenerateStripeInvoicePDFを使用）
    const pdfData = {
      invoiceNumber: estimate.invoice_number,
      invoiceDate: estimate.invoice_date,
      dueDate: estimate.due_date,
      paymentMethod: 'invoice' as const,
      organization: {
        name: estimate.organizations?.name || '',
        address: estimate.organizations?.billing_address || undefined,
      },
      items: (items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: Number(item.unit_price),
        amount: Number(item.amount),
      })),
      subtotal: Number(estimate.amount),
      tax: Number(estimate.tax_amount),
      total: Number(estimate.total_amount),
      notes: estimate.notes || undefined,
      isEstimate: true,
    };

    const pdfBuffer = await generateStripeInvoicePDF(pdfData);

    // メール送信
    const organizationName = estimate.organizations?.name || '';
    try {
      await sendInvoiceEmail({
        toEmail: estimate.contracts.billing_contact_email,
        organizationName,
        invoiceNumber: estimate.invoice_number,
        invoiceDate: estimate.invoice_date,
        dueDate: estimate.due_date,
        totalAmount: Number(estimate.total_amount),
        billingPeriodStart: estimate.billing_period_start,
        billingPeriodEnd: estimate.billing_period_end,
        pdfBuffer,
        isEstimate: true,
      });

      // 送信日時を更新
      await supabase
        .from('invoices')
        .update({
          status: 'estimate_sent',
          sent_date: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: '見積もりを送信しました',
      });
    } catch (emailError: any) {
      console.error('[Estimate Send] Email error:', emailError);
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Estimate Send API] Error:', error);
    return NextResponse.json(
      { error: '見積もり送信に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
