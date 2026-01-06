import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 見積もりPDFダウンロードAPI
 *
 * GET /api/admin/invoices/[id]/estimate-pdf
 *
 * 見積もりのPDFを生成してダウンロード
 */
export async function GET(
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
          billing_contact_name
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

    // 見積もり明細を取得
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    // PDFデータ準備
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
      // 見積書フラグ
      isEstimate: true,
    };

    // PDF生成
    const pdfBuffer = await generateStripeInvoicePDF(pdfData as any);

    // PDFをレスポンスとして返す
    const filename = `estimate_${estimate.invoice_number}.pdf`;
    const encodedFilename = encodeURIComponent(`見積書_${estimate.invoice_number}.pdf`);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error: any) {
    console.error('[Estimate PDF API] Error:', error);
    return NextResponse.json(
      { error: '見積もりPDFの生成に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
