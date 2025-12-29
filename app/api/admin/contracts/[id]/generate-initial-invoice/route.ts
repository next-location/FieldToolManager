import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { stripe } from '@/lib/stripe/client';
import { calculateMonthlyFee, Contract } from '@/lib/billing/calculate-fee';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';
import { sendStripeInvoiceEmail } from '@/lib/email/stripe-billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 初回請求書生成API
 *
 * POST /api/admin/contracts/[id]/generate-initial-invoice
 *
 * 契約のdraft状態で初回請求書を生成します。
 * - 初期費用、初回割引、1ヶ月分（または1年分）の料金を計算
 * - Stripe Invoiceを作成
 * - PDFを生成してメール送信
 * - データベースにinvoiceレコードを保存（is_initial_invoice = true）
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

    const { id: contractId } = await params;

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          payment_method
        )
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 });
    }

    // organizationsは配列として返される可能性があるため、最初の要素を取得
    const organization = Array.isArray(contract.organizations)
      ? contract.organizations[0]
      : contract.organizations;

    if (!organization) {
      return NextResponse.json({ error: '組織情報が見つかりません' }, { status: 404 });
    }

    // ステータスがdraftであることを確認
    if (contract.status !== 'draft') {
      return NextResponse.json({
        error: `初回請求書はdraft状態の契約でのみ生成できます。現在のステータス: ${contract.status}`
      }, { status: 400 });
    }

    // 既に初回請求書が存在するかチェック
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('contract_id', contractId)
      .eq('is_initial_invoice', true)
      .maybeSingle();

    if (existingInvoice) {
      return NextResponse.json({
        error: `初回請求書は既に生成されています（請求書番号: ${existingInvoice.invoice_number}）`
      }, { status: 400 });
    }

    // Stripe Customerが未作成の場合はエラー
    if (!contract.stripe_customer_id) {
      return NextResponse.json({
        error: 'Stripe Customerが作成されていません。契約を保存し直してください。'
      }, { status: 400 });
    }

    // 料金計算（初回なので初期費用・割引が含まれる）
    const feeCalculation = calculateMonthlyFee(contract as Contract);

    if (feeCalculation.total <= 0) {
      return NextResponse.json({
        error: '請求金額が0円以下です。契約内容を確認してください。',
      }, { status: 400 });
    }

    console.log('[GenerateInitialInvoice] Calculated initial fee:', {
      contractId,
      total: feeCalculation.total,
      itemCount: feeCalculation.items.length,
      isFirstInvoice: feeCalculation.isFirstInvoice,
    });

    // Stripe Invoiceを作成（Draft状態）
    const billingMonth = contract.billing_cycle === 'annual'
      ? `${new Date(contract.start_date).getFullYear()}年度`
      : `初回請求`;

    const invoice = await stripe.invoices.create({
      customer: contract.stripe_customer_id,
      description: `初回請求書（契約番号: ${contract.contract_number}）`,
      collection_method: organization.payment_method === 'card' ? 'charge_automatically' : 'send_invoice',
      days_until_due: organization.payment_method === 'card' ? undefined : 30,
      auto_advance: false,
      metadata: {
        contract_id: contract.id,
        organization_id: organization.id,
        billing_month: billingMonth,
        is_initial_invoice: 'true',
      },
    });

    // Stripe Invoice Itemsを作成
    for (const item of feeCalculation.items) {
      await stripe.invoiceItems.create({
        customer: contract.stripe_customer_id,
        invoice: invoice.id,
        amount: item.amount,
        currency: 'jpy',
        description: item.description,
      });
    }

    console.log('[GenerateInitialInvoice] Stripe invoice created:', {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
    });

    // Invoiceを確定
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // 請求書払いの場合: PDFを生成してメール送信
    if (organization.payment_method === 'invoice') {
      console.log('[GenerateInitialInvoice] Generating invoice PDF...');

      const taxAmount = Math.round((feeCalculation.subtotal || 0) * 0.1);
      const pdfBuffer = await generateStripeInvoicePDF({
        invoiceNumber: finalizedInvoice.number || `INV-${Date.now()}`,
        invoiceDate: new Date(finalizedInvoice.created * 1000).toISOString().split('T')[0],
        dueDate: finalizedInvoice.due_date
          ? new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0]
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentMethod: 'invoice',
        organization: {
          name: organization.name,
          address: contract.billing_address || undefined,
          phone: contract.billing_contact_phone || undefined,
          email: contract.billing_contact_email || contract.admin_email || undefined,
        },
        items: feeCalculation.items.map(item => ({
          description: item.description,
          quantity: 1,
          unitPrice: item.amount,
          amount: item.amount,
        })),
        subtotal: feeCalculation.subtotal || 0,
        tax: taxAmount,
        total: feeCalculation.total || 0,
      });

      // メール送信
      const recipientEmail = contract.billing_contact_email || contract.admin_email;
      if (recipientEmail) {
        await sendStripeInvoiceEmail({
          to: recipientEmail,
          organizationName: organization.name,
          invoiceNumber: finalizedInvoice.number || `INV-${Date.now()}`,
          amount: feeCalculation.total,
          dueDate: finalizedInvoice.due_date
            ? new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0]
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pdfBuffer,
          paymentMethod: 'invoice',
        });

        console.log('[GenerateInitialInvoice] Invoice email sent to:', recipientEmail);
      } else {
        console.warn('[GenerateInitialInvoice] No email address found');
      }
    } else {
      // カード決済の場合: 自動決済を試行
      try {
        await stripe.invoices.pay(finalizedInvoice.id);
        console.log('[GenerateInitialInvoice] Card payment executed successfully');
      } catch (paymentError: any) {
        console.error('[GenerateInitialInvoice] Card payment failed:', paymentError.message);
        // 決済失敗でもInvoiceは作成されているので、Webhookで処理
      }
    }

    // データベースに請求レコード保存
    const { data: savedInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        organization_id: organization.id,
        contract_id: contract.id,
        stripe_invoice_id: finalizedInvoice.id,
        invoice_number: finalizedInvoice.number || `INV-${Date.now()}`,
        amount: feeCalculation.subtotal || 0,
        tax_amount: Math.round((feeCalculation.subtotal || 0) * 0.1),
        total_amount: feeCalculation.total || 0,
        status: finalizedInvoice.status === 'paid' ? 'paid' : 'pending',
        due_date: finalizedInvoice.due_date
          ? new Date(finalizedInvoice.due_date * 1000).toISOString()
          : null,
        invoice_date: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        is_initial_invoice: true, // 初回請求書フラグ
      })
      .select()
      .single();

    if (insertError || !savedInvoice) {
      console.error('[GenerateInitialInvoice] Failed to save invoice:', insertError);
      return NextResponse.json({
        error: 'データベースへの保存に失敗しました',
        details: insertError?.message,
      }, { status: 500 });
    }

    // invoice_itemsテーブルに明細を保存
    const itemsToInsert = feeCalculation.items.map(item => ({
      invoice_id: savedInvoice.id,
      description: item.description,
      quantity: 1,
      unit_price: item.amount,
      amount: item.amount,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('[GenerateInitialInvoice] Failed to save invoice items:', itemsError);
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'generate_initial_invoice',
        details: {
          contract_id: contractId,
          invoice_id: savedInvoice.id,
          invoice_number: savedInvoice.invoice_number,
          total_amount: savedInvoice.total_amount,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      message: '初回請求書を生成しました',
      invoice_number: savedInvoice.invoice_number,
      total_amount: savedInvoice.total_amount,
      status: savedInvoice.status,
      due_date: savedInvoice.due_date,
    });
  } catch (error: any) {
    console.error('[GenerateInitialInvoice] Error:', error);
    return NextResponse.json({
      error: 'サーバーエラーが発生しました',
      details: error.message,
    }, { status: 500 });
  }
}
