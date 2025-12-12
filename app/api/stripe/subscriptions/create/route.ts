import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceId } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Stripe Subscription作成API
 *
 * POST /api/stripe/subscriptions/create
 *
 * リクエストボディ:
 * {
 *   organizationId: string;
 *   plan: 'basic' | 'standard' | 'premium';
 *   billingCycleDay?: number; // 1-28（デフォルト: 1）
 *   paymentMethod?: 'invoice' | 'card'; // デフォルト: 'invoice'
 * }
 *
 * レスポンス:
 * {
 *   success: true;
 *   subscriptionId: string;
 *   status: string;
 *   currentPeriodEnd: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, plan, billingCycleDay = 1, paymentMethod = 'invoice' } = await request.json();

    // バリデーション
    if (!organizationId || !plan) {
      return NextResponse.json(
        { error: 'organizationId, planは必須です' },
        { status: 400 }
      );
    }

    if (!['basic', 'standard', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'planはbasic, standard, premiumのいずれかである必要があります' },
        { status: 400 }
      );
    }

    if (billingCycleDay < 1 || billingCycleDay > 28) {
      return NextResponse.json(
        { error: 'billingCycleDayは1-28の範囲である必要があります' },
        { status: 400 }
      );
    }

    // Supabase Clientの作成
    const supabase = await createClient();

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      logger.error('Organization not found', { organizationId, error: orgError });
      return NextResponse.json(
        { error: '組織が見つかりません' },
        { status: 404 }
      );
    }

    // Stripe Customer IDの確認
    if (!organization.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Stripe Customerが作成されていません。先にCustomerを作成してください' },
        { status: 400 }
      );
    }

    // 既にSubscriptionが存在するかチェック
    if (organization.stripe_subscription_id) {
      logger.info('Stripe Subscription already exists', {
        organizationId,
        subscriptionId: organization.stripe_subscription_id,
      });

      // 既存のSubscription情報を取得
      const subscription = await stripe.subscriptions.retrieve(
        organization.stripe_subscription_id
      );

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        message: 'Stripe Subscriptionは既に存在します',
      });
    }

    // Price IDを取得
    const priceId = getPriceId(plan as 'basic' | 'standard' | 'premium');

    logger.info('Creating Stripe Subscription', {
      organizationId,
      customerId: organization.stripe_customer_id,
      plan,
      priceId,
      billingCycleDay,
      paymentMethod,
    });

    // 初期導入費用の追加（一回限り）
    const { data: org } = await supabase
      .from('organizations')
      .select('initial_setup_fee_paid')
      .eq('id', organizationId)
      .single();

    if (!org?.initial_setup_fee_paid) {
      logger.info('Adding initial setup fee', { organizationId });

      // 初期導入費用を追加（¥50,000）
      await stripe.invoiceItems.create({
        customer: organization.stripe_customer_id,
        amount: 50000, // ¥50,000
        currency: 'jpy',
        description: '初期導入費用（一回限り）',
      });

      // フラグ更新
      await supabase
        .from('organizations')
        .update({ initial_setup_fee_paid: true })
        .eq('id', organizationId);
    }

    // Stripe Subscription作成
    const subscription = await stripe.subscriptions.create({
      customer: organization.stripe_customer_id,
      items: [{ price: priceId }],
      billing_cycle_anchor: billingCycleDay === 1 ? undefined : getBillingCycleAnchor(billingCycleDay),
      collection_method: paymentMethod === 'invoice' ? 'send_invoice' : 'charge_automatically',
      days_until_due: paymentMethod === 'invoice' ? 30 : undefined,
      metadata: {
        organization_id: organizationId,
        plan,
        payment_method: paymentMethod,
      },
    });

    logger.info('Stripe Subscription created successfully', {
      organizationId,
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    // DBを更新
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        billing_cycle_day: billingCycleDay,
        payment_method: paymentMethod,
      })
      .eq('id', organizationId);

    if (updateError) {
      logger.error('Failed to update organization with subscription ID', {
        organizationId,
        subscriptionId: subscription.id,
        error: updateError,
      });

      // Stripe Subscriptionをキャンセル（ロールバック）
      await stripe.subscriptions.cancel(subscription.id);

      return NextResponse.json(
        { error: 'データベースの更新に失敗しました' },
        { status: 500 }
      );
    }

    // invoice_schedulesテーブルに追加
    const nextInvoiceDate = new Date(subscription.current_period_end * 1000);
    const { error: scheduleError } = await supabase
      .from('invoice_schedules')
      .insert({
        organization_id: organizationId,
        billing_day: billingCycleDay,
        is_active: true,
        next_invoice_date: nextInvoiceDate.toISOString().split('T')[0],
        next_amount: subscription.items.data[0].price.unit_amount! / 100,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
      });

    if (scheduleError) {
      logger.error('Failed to create invoice schedule', {
        organizationId,
        subscriptionId: subscription.id,
        error: scheduleError,
      });
      // invoice_scheduleの作成失敗は警告にとどめる（メイン処理は成功）
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });

  } catch (error: unknown) {
    logger.error('Failed to create Stripe Subscription', { error });

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { error: `Stripeエラー: ${stripeError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Stripe Subscriptionの作成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 指定された日にちに基づいて billing_cycle_anchor を計算
 */
function getBillingCycleAnchor(day: number): number {
  const now = new Date();
  const anchorDate = new Date(now.getFullYear(), now.getMonth(), day);

  // 指定日が過去の場合は翌月にする
  if (anchorDate < now) {
    anchorDate.setMonth(anchorDate.getMonth() + 1);
  }

  return Math.floor(anchorDate.getTime() / 1000);
}
