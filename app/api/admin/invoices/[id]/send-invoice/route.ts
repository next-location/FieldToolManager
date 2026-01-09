import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendInvoiceEmail } from '@/lib/email/invoice-email';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 請求書情報を取得
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
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404 }
      );
    }

    // ステータスチェック
    if (invoice.status !== 'invoice') {
      return NextResponse.json(
        { error: '送信可能な請求書ではありません' },
        { status: 400 }
      );
    }

    // 請求書明細を取得
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
      isEstimate: false,
    };

    const pdfBuffer = await generateStripeInvoicePDF(pdfData);

    // メール送信
    await sendInvoiceEmail({
      toEmail: invoice.contracts.billing_contact_email,
      organizationName: invoice.organizations?.name || '',
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      totalAmount: Number(invoice.total_amount),
      billingPeriodStart: invoice.billing_period_start,
      billingPeriodEnd: invoice.billing_period_end,
      pdfBuffer,
      isEstimate: false,
    });

    // ステータスを'sent'に更新
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_date: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Send Invoice] Update error:', updateError);
      return NextResponse.json(
        { error: 'ステータスの更新に失敗しました' },
        { status: 500 }
      );
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'send_invoice',
        details: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      message: '請求書を送信しました',
    });
  } catch (error: any) {
    console.error('[Send Invoice API] Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
