import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { stripe } from '@/lib/stripe/client';
import { calculateMonthlyFee, generateInvoiceDescription, Contract } from '@/lib/billing/calculate-fee';
import { logger } from '@/lib/logger';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';
import { sendStripeInvoiceEmail } from '@/lib/email/stripe-billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * テスト用: 特定の契約の請求書を即座に生成
 *
 * POST /api/admin/test/generate-invoice
 * Body: { contract_id: string }
 *
 * 注意: 本番環境でも使用可能（スーパー管理者のみ）
 * リリース後も残しておくことを推奨（手動請求書生成に便利）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contract_id } = body;

    if (!contract_id) {
      return NextResponse.json(
        { error: 'contract_idが必要です' },
        { status: 400 }
      );
    }

    logger.info('[Test Generate Invoice] Start', { contract_id });

    // 契約データを取得
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
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      logger.error('[Test Generate Invoice] Contract not found', { contract_id, error: contractError });
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      );
    }

    if (contract.status !== 'active') {
      return NextResponse.json(
        { error: 'active状態の契約のみ請求書を生成できます' },
        { status: 400 }
      );
    }

    const organization = Array.isArray(contract.organizations)
      ? contract.organizations[0]
      : contract.organizations;

    if (!organization) {
      return NextResponse.json(
        { error: '組織情報が見つかりません' },
        { status: 404 }
      );
    }

    if (!contract.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe顧客が作成されていません' },
        { status: 400 }
      );
    }

    // 料金計算
    const feeCalculation = calculateMonthlyFee(contract as Contract);

    if (feeCalculation.total <= 0) {
      return NextResponse.json(
        { error: '請求金額が0円以下です' },
        { status: 400 }
      );
    }

    logger.info('[Test Generate Invoice] Fee calculated', {
      contract_id,
      total: feeCalculation.total,
      itemCount: feeCalculation.items.length,
    });

    // Stripe Invoiceを作成
    const today = new Date();
    const billingMonth = `${today.getFullYear()}年${today.getMonth() + 1}月`;

    const invoice = await stripe.invoices.create({
      customer: contract.stripe_customer_id,
      description: `[テスト請求] ${generateInvoiceDescription(contract as Contract, billingMonth)}`,
      collection_method: organization.payment_method === 'card' ? 'charge_automatically' : 'send_invoice',
      days_until_due: organization.payment_method === 'card' ? undefined : 30,
      auto_advance: false,
      metadata: {
        contract_id: contract.id,
        organization_id: organization.id,
        billing_month: billingMonth,
        test_invoice: 'true', // テスト請求書フラグ
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

    // Invoiceを確定
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    logger.info('[Test Generate Invoice] Stripe invoice created', {
      invoiceId: finalizedInvoice.id,
      amount: finalizedInvoice.amount_due,
    });

    // 支払い方法に応じて処理
    let paymentResult = null;
    if (organization.payment_method === 'card') {
      try {
        await stripe.invoices.pay(finalizedInvoice.id);
        paymentResult = 'カード決済を実行しました';
        logger.info('[Test Generate Invoice] Card payment executed', {
          invoiceId: finalizedInvoice.id,
        });
      } catch (paymentError: any) {
        paymentResult = `カード決済失敗: ${paymentError.message}`;
        logger.error('[Test Generate Invoice] Card payment failed', {
          invoiceId: finalizedInvoice.id,
          error: paymentError.message,
        });
      }
    } else {
      // 請求書払い: PDFを生成してメール送信
      const taxAmount = Math.round((feeCalculation.subtotal || 0) * 0.1);
      const pdfBuffer = await generateStripeInvoicePDF({
        invoiceNumber: finalizedInvoice.number || `TEST-INV-${Date.now()}`,
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

      const recipientEmail = contract.billing_contact_email || contract.admin_email;
      if (recipientEmail) {
        await sendStripeInvoiceEmail({
          to: recipientEmail,
          organizationName: organization.name,
          invoiceNumber: finalizedInvoice.number || `TEST-INV-${Date.now()}`,
          amount: feeCalculation.total,
          dueDate: finalizedInvoice.due_date
            ? new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0]
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pdfBuffer,
          paymentMethod: 'invoice',
        });

        paymentResult = `請求書をメール送信しました: ${recipientEmail}`;
        logger.info('[Test Generate Invoice] Invoice email sent', {
          invoiceId: finalizedInvoice.id,
          to: recipientEmail,
        });
      } else {
        paymentResult = '警告: メールアドレスが見つかりません';
        logger.warn('[Test Generate Invoice] No email address found', {
          contract_id,
        });
      }
    }

    // データベースに保存
    const { data: savedInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        organization_id: organization.id,
        contract_id: contract.id,
        stripe_invoice_id: finalizedInvoice.id,
        invoice_number: finalizedInvoice.number || `TEST-INV-${Date.now()}`,
        amount: feeCalculation.subtotal || 0,
        tax_amount: Math.round((feeCalculation.subtotal || 0) * 0.1),
        total_amount: feeCalculation.total || 0,
        status: finalizedInvoice.status === 'paid' ? 'paid' : 'pending',
        due_date: finalizedInvoice.due_date
          ? new Date(finalizedInvoice.due_date * 1000).toISOString()
          : null,
        invoice_date: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        is_initial_invoice: false,
      })
      .select()
      .single();

    if (insertError || !savedInvoice) {
      logger.error('[Test Generate Invoice] Failed to save to database', {
        invoiceId: finalizedInvoice.id,
        error: insertError,
      });
    } else {
      // invoice_itemsテーブルに明細を保存
      const itemsToInsert = feeCalculation.items.map(item => ({
        invoice_id: savedInvoice.id,
        description: item.description,
        quantity: 1,
        unit_price: item.amount,
        amount: item.amount,
      }));

      await supabase.from('invoice_items').insert(itemsToInsert);

      // 日割り差額をクリア
      if (contract.pending_prorated_charge && contract.pending_prorated_charge > 0) {
        await supabase
          .from('contracts')
          .update({
            pending_prorated_charge: 0,
            pending_prorated_description: null,
          })
          .eq('id', contract.id);

        logger.info('[Test Generate Invoice] Cleared prorated charge', {
          contract_id: contract.id,
          proratedCharge: contract.pending_prorated_charge,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'テスト請求書を生成しました',
      invoice: {
        id: finalizedInvoice.id,
        number: finalizedInvoice.number,
        amount: feeCalculation.total,
        status: finalizedInvoice.status,
        payment_result: paymentResult,
      },
      fee_calculation: {
        items: feeCalculation.items,
        subtotal: feeCalculation.subtotal,
        discount: feeCalculation.discount,
        total: feeCalculation.total,
      },
      database_saved: !insertError,
    });

  } catch (error: unknown) {
    logger.error('[Test Generate Invoice] Error', { error });
    return NextResponse.json(
      {
        error: 'テスト請求書の生成に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
