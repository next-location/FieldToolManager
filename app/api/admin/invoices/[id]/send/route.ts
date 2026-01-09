import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { stripe } from '@/lib/stripe/client';
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

    // 請求書データを取得
    const { data: invoice, error } = await supabase
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

    if (error || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
    }

    if (!invoice.contracts?.billing_contact_email) {
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
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      paymentMethod: 'invoice' as const,
      organization: {
        name: invoice.organizations?.name || '',
        address: invoice.organizations?.billing_address || undefined,
      },
      items: (items || []).map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: Number(item.unit_price),
        amount: Number(item.amount),
      })),
      subtotal: Number(invoice.amount),
      tax: Number(invoice.tax_amount),
      total: Number(invoice.total_amount),
      notes: invoice.notes || undefined,
      isEstimate: invoice.document_type === 'estimate',
    };

    const pdfBuffer = await generateStripeInvoicePDF(pdfData);

    // メール送信
    const organizationName = invoice.organizations?.name || '';
    try {
      await sendInvoiceEmail({
        toEmail: invoice.contracts.billing_contact_email,
        organizationName,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        totalAmount: Number(invoice.total_amount),
        billingPeriodStart: invoice.billing_period_start,
        billingPeriodEnd: invoice.billing_period_end,
        pdfBuffer,
        isEstimate: invoice.document_type === 'estimate',
      });

      // 送信日時を更新（見積もりの場合はestimate_sent、請求書の場合はsent）
      const newStatus = invoice.document_type === 'estimate' ? 'estimate_sent' : 'sent';
      await supabase
        .from('invoices')
        .update({
          status: newStatus,
          sent_date: new Date().toISOString(),
        })
        .eq('id', id);

      const successMessage = invoice.document_type === 'estimate' ? '見積書を送信しました' : '請求書を送信しました';
      return NextResponse.json({
        success: true,
        message: successMessage,
      });
    } catch (emailError: any) {
      console.error('[Invoice Send] Email error:', emailError);
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Invoice Send API] Error:', error);
    return NextResponse.json(
      { error: '請求書送信に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
