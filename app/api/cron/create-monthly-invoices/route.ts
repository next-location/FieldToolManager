import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { calculateMonthlyFee, generateInvoiceDescription, Contract } from '@/lib/billing/calculate-fee';
import { logger } from '@/lib/logger';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';
import { sendStripeInvoiceEmail } from '@/lib/email/stripe-billing';

/**
 * 毎月の請求書自動生成Cron
 *
 * 毎日実行され、請求日が今日の契約に対して請求書を自動生成
 *
 * GET /api/cron/create-monthly-invoices
 *
 * Vercel Cronから呼び出される
 *
 * 処理フロー:
 * 1. 今日が請求日（billing_day）の有効な契約を取得
 * 2. 各契約の料金を計算（人数、パッケージ、初期費用、割引）
 * 3. Stripe Invoice Itemを作成
 * 4. Stripe Invoiceを作成
 * 5. 支払い方法に応じて処理:
 *    - カード決済: 自動決済実行
 *    - 請求書払い: PDFを生成してメール送信
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronからの呼び出しのみ許可）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron request', { authHeader });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const today = new Date();
    const billingDay = today.getDate();

    logger.info('Starting monthly invoice creation process', {
      date: today.toISOString(),
      billingDay,
    });

    // 今日が請求日の有効な契約を取得
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations (
          id,
          name,
          email,
          payment_method
        )
      `)
      .eq('status', 'active')
      .eq('billing_day', billingDay);

    if (contractsError) {
      logger.error('Failed to fetch contracts', { error: contractsError });
      return NextResponse.json(
        { error: 'データベースエラー' },
        { status: 500 }
      );
    }

    if (!contracts || contracts.length === 0) {
      logger.info('No contracts to bill today', { billingDay });
      return NextResponse.json({
        success: true,
        message: '本日請求する契約はありません',
        count: 0,
      });
    }

    logger.info('Found contracts to bill', { count: contracts.length });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // 各契約に対して請求書を作成
    for (const contract of contracts) {
      const organization = contract.organizations as any;

      if (!organization) {
        logger.warn('Organization not found for contract', { contractId: contract.id });
        failureCount++;
        errors.push(`Contract ${contract.id}: Organization not found`);
        continue;
      }

      if (!contract.stripe_customer_id) {
        logger.warn('Stripe customer not created for contract', {
          contractId: contract.id,
          organizationId: organization.id,
        });
        failureCount++;
        errors.push(`Contract ${contract.id}: Stripe Customer not created`);
        continue;
      }

      try {
        // 料金計算
        const feeCalculation = calculateMonthlyFee(contract as Contract);

        if (feeCalculation.total <= 0) {
          logger.warn('Calculated fee is zero or negative, skipping', {
            contractId: contract.id,
            total: feeCalculation.total,
          });
          continue;
        }

        logger.info('Calculated monthly fee', {
          contractId: contract.id,
          organizationId: organization.id,
          total: feeCalculation.total,
          itemCount: feeCalculation.items.length,
        });

        // Stripe Invoice Itemsを作成
        for (const item of feeCalculation.items) {
          await stripe.invoiceItems.create({
            customer: contract.stripe_customer_id,
            amount: item.amount,
            currency: 'jpy',
            description: item.description,
          });
        }

        // Stripe Invoiceを作成
        const billingMonth = `${today.getFullYear()}年${today.getMonth() + 1}月`;
        const invoice = await stripe.invoices.create({
          customer: contract.stripe_customer_id,
          description: generateInvoiceDescription(contract as Contract, billingMonth),
          collection_method: organization.payment_method === 'card' ? 'charge_automatically' : 'send_invoice',
          days_until_due: organization.payment_method === 'card' ? undefined : 30,
          metadata: {
            contract_id: contract.id,
            organization_id: organization.id,
            billing_month: billingMonth,
          },
        });

        logger.info('Stripe invoice created', {
          invoiceId: invoice.id,
          contractId: contract.id,
          amount: invoice.amount_due,
        });

        // Invoiceを確定
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

        // 支払い方法に応じて処理
        if (organization.payment_method === 'card') {
          // カード決済: 自動決済実行
          try {
            await stripe.invoices.pay(finalizedInvoice.id);
            logger.info('Card payment executed successfully', {
              invoiceId: finalizedInvoice.id,
              contractId: contract.id,
            });
          } catch (paymentError: any) {
            logger.error('Card payment failed', {
              invoiceId: finalizedInvoice.id,
              contractId: contract.id,
              error: paymentError.message,
            });
            // 決済失敗でもInvoiceは作成されているので、Webhookで処理
          }
        } else {
          // 請求書払い: PDFを生成してメール送信
          logger.info('Generating invoice PDF for manual payment', {
            invoiceId: finalizedInvoice.id,
            contractId: contract.id,
          });

          // カスタムPDF生成
          const pdfBuffer = await generateStripeInvoicePDF({
            invoice: finalizedInvoice,
            organizationName: organization.name,
            paymentMethod: 'invoice',
          });

          // メール送信
          await sendStripeInvoiceEmail({
            to: organization.email,
            organizationName: organization.name,
            invoice: finalizedInvoice,
            pdfBuffer,
            paymentMethod: 'invoice',
          });

          logger.info('Invoice email sent successfully', {
            invoiceId: finalizedInvoice.id,
            to: organization.email,
          });
        }

        // データベースに請求レコード保存
        const { error: insertError } = await supabase.from('invoices').insert({
          organization_id: organization.id,
          contract_id: contract.id,
          stripe_invoice_id: finalizedInvoice.id,
          invoice_number: finalizedInvoice.number || `INV-${Date.now()}`,
          amount: finalizedInvoice.amount_due || 0,
          status: finalizedInvoice.status === 'paid' ? 'paid' : 'pending',
          due_date: finalizedInvoice.due_date
            ? new Date(finalizedInvoice.due_date * 1000).toISOString()
            : null,
          issued_at: new Date().toISOString(),
        });

        if (insertError) {
          logger.error('Failed to save invoice to database', {
            invoiceId: finalizedInvoice.id,
            error: insertError,
          });
        }

        successCount++;
      } catch (error: unknown) {
        logger.error('Failed to create invoice for contract', {
          contractId: contract.id,
          organizationId: organization.id,
          error,
        });
        failureCount++;
        errors.push(
          `Contract ${contract.id} (${organization.name}): ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    logger.info('Monthly invoice creation completed', {
      total: contracts.length,
      success: successCount,
      failure: failureCount,
    });

    return NextResponse.json({
      success: true,
      total: contracts.length,
      successCount,
      failureCount,
      errors: failureCount > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    logger.error('Monthly invoice creation cron failed', { error });
    return NextResponse.json(
      { error: '請求書作成処理に失敗しました' },
      { status: 500 }
    );
  }
}
