import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { stripe } from '@/lib/stripe/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 見積もりから請求書への変換API
 *
 * POST /api/admin/invoices/[id]/convert-to-invoice
 *
 * 承認された見積もりを請求書に変換します。
 * - 新しい請求書レコードを作成（converted_from_invoice_id に見積もりIDを設定）
 * - 見積もりの status は変更しない（履歴として保持）
 * - 請求書PDFを生成してメール送信
 */
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

    // statusがestimate_sentであることを確認
    if (estimate.status !== 'estimate_sent') {
      return NextResponse.json({
        error: `請求書への変換はestimate_sentステータスでのみ可能です。現在のステータス: ${estimate.status}`
      }, { status: 400 });
    }

    if (!estimate.contracts?.billing_contact_email) {
      return NextResponse.json(
        { error: '請求先メールアドレスが登録されていません' },
        { status: 400 }
      );
    }

    // 請求書番号を生成
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toISOString().split('T')[0];

    // 新しい請求書レコードを作成
    // stripe_invoice_idはnullにする（見積もりのStripe Invoiceは再利用しない）
    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        organization_id: estimate.organization_id,
        contract_id: estimate.contract_id,
        stripe_invoice_id: null,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        billing_period_start: estimate.billing_period_start,
        billing_period_end: estimate.billing_period_end,
        amount: estimate.amount,
        tax_amount: estimate.tax_amount,
        total_amount: estimate.total_amount,
        status: 'sent',
        document_type: 'invoice',
        converted_from_invoice_id: estimate.id,
        due_date: estimate.due_date,
        is_initial_invoice: estimate.is_initial_invoice,
        notes: estimate.notes,
        sent_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newInvoice) {
      console.error('[Convert to Invoice] Create error:', createError);
      return NextResponse.json(
        { error: '請求書の作成に失敗しました', details: createError?.message },
        { status: 500 }
      );
    }

    // 見積もりの明細をコピー
    const { data: estimateItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', estimate.id);

    if (estimateItems && estimateItems.length > 0) {
      const itemsToInsert = estimateItems.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }));

      await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
    }

    const organizationName = estimate.organizations?.name || '';

    // 見積もりのStripe Invoice IDを使用してPDFを取得
    if (!estimate.stripe_invoice_id) {
      return NextResponse.json(
        { error: '見積もりにStripe Invoice IDが設定されていません' },
        { status: 500 }
      );
    }

    const stripeInvoice = await stripe.invoices.retrieve(estimate.stripe_invoice_id);
    const invoicePdfUrl = stripeInvoice.invoice_pdf;

    if (!invoicePdfUrl) {
      return NextResponse.json(
        { error: 'Stripe請求書PDFの取得に失敗しました' },
        { status: 500 }
      );
    }

    // PDFをダウンロード
    const pdfResponse = await fetch(invoicePdfUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // メール送信
    try {
      await sendInvoiceEmail({
        toEmail: estimate.contracts.billing_contact_email,
        organizationName,
        invoiceNumber,
        invoiceDate,
        dueDate: newInvoice.due_date,
        totalAmount: Number(newInvoice.total_amount),
        billingPeriodStart: newInvoice.billing_period_start,
        billingPeriodEnd: newInvoice.billing_period_end,
        pdfBuffer,
        isEstimate: false,
      });

      // 見積もりのステータスを更新
      await supabase
        .from('invoices')
        .update({ status: 'converted' })
        .eq('id', estimate.id);

      // ログを記録
      await supabase
        .from('super_admin_logs')
        .insert({
          super_admin_id: session.id,
          action: 'convert_estimate_to_invoice',
          details: {
            estimate_id: estimate.id,
            estimate_number: estimate.invoice_number,
            invoice_id: newInvoice.id,
            invoice_number: newInvoice.invoice_number,
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent'),
        });

      return NextResponse.json({
        success: true,
        message: '見積もりを請求書に変換し、送信しました',
        invoice_id: newInvoice.id,
        invoice_number: newInvoice.invoice_number,
      });
    } catch (emailError: any) {
      console.error('[Convert to Invoice] Email error:', emailError);
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Convert to Invoice API] Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
