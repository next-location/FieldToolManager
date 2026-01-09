import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
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

    // 請求書明細を取得
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    // PDF生成（見積書と同じgenerateStripeInvoicePDFを使用）
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
      isEstimate: false, // 請求書なのでfalse
    };

    const pdfBuffer = await generateStripeInvoicePDF(pdfData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="請求書_${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[Invoice PDF API] Error:', error);
    return NextResponse.json(
      { error: 'PDFの生成に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
