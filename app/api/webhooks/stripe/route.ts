import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Stripe Webhook受信エンドポイント
 *
 * POST /api/webhooks/stripe
 *
 * 処理するイベント:
 * - invoice.created: カスタムPDF生成とメール送信
 * - invoice.payment_succeeded: 支払完了処理
 * - invoice.payment_failed: 支払失敗処理
 * - customer.subscription.updated: サブスクリプション更新
 * - customer.subscription.deleted: サブスクリプション削除
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    logger.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_TEST_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Stripe webhook secret is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    logger.error('Webhook signature verification failed', { error: error.message });
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  // イベントIDの重複チェック（べき等性確保）
  const supabase = await createClient();
  const { data: existingEvent } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    logger.info('Event already processed', { eventId: event.id });
    return NextResponse.json({ received: true, message: 'Already processed' });
  }

  // stripe_eventsテーブルに記録
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
      processed: false,
    });

  if (insertError) {
    logger.error('Failed to insert event', { eventId: event.id, error: insertError });
    // 重複エラーの場合は成功とみなす
    if (insertError.code === '23505') {
      return NextResponse.json({ received: true, message: 'Already processed' });
    }
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    );
  }

  logger.info('Received Stripe webhook event', {
    eventId: event.id,
    eventType: event.type,
  });

  // イベントタイプに応じた処理
  try {
    switch (event.type) {
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        logger.info('Unhandled event type', { eventType: event.type });
    }

    // 処理完了をマーク
    await supabase
      .from('stripe_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });

  } catch (error) {
    logger.error('Error processing webhook event', {
      eventId: event.id,
      eventType: event.type,
      error,
    });

    // エラー情報を記録
    await supabase
      .from('stripe_events')
      .update({
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: 1,
      })
      .eq('stripe_event_id', event.id);

    // Stripeに処理失敗を通知（リトライ対象）
    return NextResponse.json(
      { error: 'Event processing failed' },
      { status: 500 }
    );
  }
}

/**
 * invoice.created イベント処理
 * カスタムPDF生成とメール送信
 */
async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  logger.info('Handling invoice.created', { invoiceId: invoice.id });

  const supabase = await createClient();

  // 組織IDを取得
  const organizationId = invoice.metadata?.organization_id;
  if (!organizationId) {
    logger.warn('Organization ID not found in invoice metadata', { invoiceId: invoice.id });
    return;
  }

  // invoicesテーブルに記録
  const { error: insertError } = await supabase
    .from('invoices')
    .insert({
      organization_id: organizationId,
      stripe_invoice_id: invoice.id,
      invoice_number: invoice.number || `STRIPE-${invoice.id}`,
      amount: (invoice.amount_due / 100),
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] : null,
      status: invoice.status === 'paid' ? 'paid' : 'pending',
      payment_status: invoice.status === 'paid' ? 'paid' : 'pending',
      invoice_type: 'subscription',
    });

  if (insertError) {
    logger.error('Failed to insert invoice', { invoiceId: invoice.id, error: insertError });
  }

  // カスタムPDF生成とメール送信
  try {
    const { generateStripeInvoicePDF } = await import('@/lib/pdf/stripe-invoice-generator');
    const { sendStripeInvoiceEmail } = await import('@/lib/email/stripe-billing');

    // 組織情報を取得
    const { data: org } = await supabase
      .from('organizations')
      .select('name, billing_address, email, phone, payment_method')
      .eq('id', organizationId)
      .single();

    if (!org) {
      logger.error('Organization not found', { organizationId });
      return;
    }

    // PDF生成
    const pdfBuffer = await generateStripeInvoicePDF({
      invoiceNumber: invoice.number || `STRIPE-${invoice.id}`,
      invoiceDate: new Date(invoice.created * 1000).toISOString().split('T')[0],
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] : '',
      paymentMethod: org.payment_method || 'invoice',
      organization: {
        name: org.name,
        email: org.email,
        phone: org.phone,
      },
      items: invoice.lines.data.map((line) => ({
        description: line.description || '',
        quantity: line.quantity || 1,
        unitPrice: (line.price?.unit_amount || 0) / 100,
        amount: (line.amount || 0) / 100,
      })),
      subtotal: (invoice.subtotal || 0) / 100,
      tax: (invoice.tax || 0) / 100,
      total: (invoice.total || 0) / 100,
    });

    // メール送信
    await sendStripeInvoiceEmail({
      to: org.email || invoice.customer_email || '',
      organizationName: org.name,
      invoiceNumber: invoice.number || `STRIPE-${invoice.id}`,
      amount: invoice.total / 100,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] : '',
      pdfBuffer,
      paymentMethod: org.payment_method || 'invoice',
    });

    logger.info('Invoice PDF and email sent successfully', { invoiceId: invoice.id });

  } catch (error) {
    logger.error('Failed to generate PDF or send email', { invoiceId: invoice.id, error });
  }
}

/**
 * invoice.payment_succeeded イベント処理
 * 支払完了処理
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info('Handling invoice.payment_succeeded', { invoiceId: invoice.id });

  const supabase = await createClient();

  // invoicesテーブルを更新
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_status: 'paid',
    })
    .eq('stripe_invoice_id', invoice.id);

  if (updateError) {
    logger.error('Failed to update invoice status', { invoiceId: invoice.id, error: updateError });
  }

  // payment_recordsテーブルに記録
  const { data: invoiceData } = await supabase
    .from('invoices')
    .select('id, organization_id, amount')
    .eq('stripe_invoice_id', invoice.id)
    .single();

  if (invoiceData) {
    await supabase
      .from('payment_records')
      .insert({
        invoice_id: invoiceData.id,
        organization_id: invoiceData.organization_id,
        amount: invoiceData.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'stripe',
        stripe_payment_intent_id: invoice.payment_intent as string,
      });
  }

  // 領収書PDF生成とメール送信
  if (invoiceData) {
    try {
      const { generateStripeReceiptPDF } = await import('@/lib/pdf/stripe-receipt-generator');
      const { sendStripeReceiptEmail } = await import('@/lib/email/stripe-billing');

      // 組織情報を取得
      const { data: org } = await supabase
        .from('organizations')
        .select('name, billing_address, email, payment_method')
        .eq('id', invoiceData.organization_id)
        .single();

      if (!org) {
        logger.error('Organization not found', { organizationId: invoiceData.organization_id });
        return;
      }

      // 領収書番号を生成（請求書番号 + 接尾辞）
      const { data: invoiceRecord } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('id', invoiceData.id)
        .single();

      const receiptNumber = `${invoiceRecord?.invoice_number || 'R'}-${new Date().getFullYear()}`;

      // PDF生成
      const pdfBuffer = await generateStripeReceiptPDF({
        receiptNumber,
        receiptDate: new Date().toISOString().split('T')[0],
        organization: {
          name: org.name,
        },
        amount: invoiceData.amount * 0.9091, // 税抜き金額（逆算）
        tax: invoiceData.amount * 0.0909, // 消費税
        total: invoiceData.amount,
        paymentMethod: org.payment_method === 'invoice' ? 'bank_transfer' : 'card',
        paymentMethodLabel: org.payment_method === 'invoice' ? '銀行振込' : 'クレジットカード',
        purpose: 'Field Tool Manager 月額利用料として',
      });

      // メール送信
      await sendStripeReceiptEmail({
        to: org.email || '',
        organizationName: org.name,
        receiptNumber,
        amount: invoiceData.amount,
        pdfBuffer,
        paymentMethod: org.payment_method === 'invoice' ? 'bank_transfer' : 'card',
      });

      logger.info('Receipt PDF and email sent successfully', { invoiceId: invoice.id });

    } catch (error) {
      logger.error('Failed to generate receipt PDF or send email', { invoiceId: invoice.id, error });
    }
  }
}

/**
 * invoice.payment_failed イベント処理
 * 支払失敗処理
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  logger.error('Payment failed', { invoiceId: invoice.id });

  const supabase = await createClient();

  // invoicesテーブルを更新
  await supabase
    .from('invoices')
    .update({
      status: 'failed',
      payment_status: 'failed',
    })
    .eq('stripe_invoice_id', invoice.id);

  // TODO: 支払失敗通知メール送信
  logger.info('Payment failure notification will be sent in next phase');
}

/**
 * customer.subscription.updated イベント処理
 * サブスクリプション更新
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info('Handling subscription.updated', { subscriptionId: subscription.id });

  const supabase = await createClient();
  const organizationId = subscription.metadata?.organization_id;

  if (!organizationId) {
    logger.warn('Organization ID not found in subscription metadata', {
      subscriptionId: subscription.id,
    });
    return;
  }

  // invoice_schedulesテーブルを更新
  const nextInvoiceDate = new Date(subscription.current_period_end * 1000);
  await supabase
    .from('invoice_schedules')
    .update({
      next_invoice_date: nextInvoiceDate.toISOString().split('T')[0],
      next_amount: subscription.items.data[0].price.unit_amount! / 100,
      is_active: subscription.status === 'active',
    })
    .eq('stripe_subscription_id', subscription.id);
}

/**
 * customer.subscription.deleted イベント処理
 * サブスクリプション削除
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info('Handling subscription.deleted', { subscriptionId: subscription.id });

  const supabase = await createClient();
  const organizationId = subscription.metadata?.organization_id;

  if (!organizationId) {
    logger.warn('Organization ID not found in subscription metadata', {
      subscriptionId: subscription.id,
    });
    return;
  }

  // organizationsテーブルを更新
  await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: null,
    })
    .eq('id', organizationId);

  // invoice_schedulesを無効化
  await supabase
    .from('invoice_schedules')
    .update({
      is_active: false,
    })
    .eq('stripe_subscription_id', subscription.id);
}

// Next.js 15のRoute Handler設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
