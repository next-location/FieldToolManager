import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceId } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Stripe Subscriptionアップグレード API
 *
 * POST /api/stripe/subscriptions/upgrade
 *
 * リクエストボディ:
 * {
 *   organizationId: string;
 *   newPlan: 'basic' | 'standard' | 'premium';
 * }
 *
 * レスポンス:
 * {
 *   success: true;
 *   subscriptionId: string;
 *   prorationAmount: number;
 *   message: string;
 * }
 *
 * アップグレードは即日適用、日割り計算で差額請求
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, newPlan } = await request.json();

    // バリデーション
    if (!organizationId || !newPlan) {
      return NextResponse.json(
        { error: 'organizationId, newPlanは必須です' },
        { status: 400 }
      );
    }

    if (!['basic', 'standard', 'premium'].includes(newPlan)) {
      return NextResponse.json(
        { error: 'newPlanはbasic, standard, premiumのいずれかである必要があります' },
        { status: 400 }
      );
    }

    // Supabase Clientの作成
    const supabase = await createClient();

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id, plan')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      logger.error('Organization not found', { organizationId, error: orgError });
      return NextResponse.json(
        { error: '組織が見つかりません' },
        { status: 404 }
      );
    }

    // Stripe Subscription IDの確認
    if (!organization.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Stripe Subscriptionが存在しません' },
        { status: 400 }
      );
    }

    // 現在のプランと同じ場合はエラー
    if (organization.plan === newPlan) {
      return NextResponse.json(
        { error: '既に同じプランです' },
        { status: 400 }
      );
    }

    // プランの優先度チェック（アップグレードのみ）
    const planPriority = { basic: 1, standard: 2, premium: 3 };
    const currentPriority = planPriority[organization.plan as keyof typeof planPriority];
    const newPriority = planPriority[newPlan as keyof typeof planPriority];

    if (newPriority <= currentPriority) {
      return NextResponse.json(
        { error: 'アップグレードのみ可能です。ダウングレードは別のAPIを使用してください' },
        { status: 400 }
      );
    }

    logger.info('Upgrading subscription', {
      organizationId,
      currentPlan: organization.plan,
      newPlan,
      subscriptionId: organization.stripe_subscription_id,
    });

    // Stripe Subscriptionを取得
    const subscription = await stripe.subscriptions.retrieve(
      organization.stripe_subscription_id
    );

    // 新しいPrice IDを取得
    const newPriceId = getPriceId(newPlan as 'basic' | 'standard' | 'premium');

    // Subscriptionを更新（日割り計算あり）
    const updatedSubscription = await stripe.subscriptions.update(
      organization.stripe_subscription_id,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations', // 日割り計算
        metadata: {
          organization_id: organizationId,
          plan: newPlan,
          upgrade_date: new Date().toISOString(),
        },
      }
    );

    logger.info('Subscription upgraded successfully', {
      organizationId,
      subscriptionId: updatedSubscription.id,
      newPlan,
    });

    // DBを更新
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        plan: newPlan,
      })
      .eq('id', organizationId);

    if (updateError) {
      logger.error('Failed to update organization plan', {
        organizationId,
        error: updateError,
      });
      // DBの更新失敗はログのみ（Stripeは既に更新済み）
    }

    // plan_change_requestsに記録
    const { error: requestError } = await supabase
      .from('plan_change_requests')
      .insert({
        organization_id: organizationId,
        current_plan: organization.plan,
        requested_plan: newPlan,
        change_type: 'upgrade',
        status: 'completed',
        stripe_subscription_id: organization.stripe_subscription_id,
        requested_at: new Date().toISOString(),
        notes: 'Upgrade applied immediately with proration',
      });

    if (requestError) {
      logger.error('Failed to insert plan change request', {
        organizationId,
        error: requestError,
      });
    }

    // invoice_schedulesを更新
    const nextInvoiceDate = new Date((updatedSubscription as any).current_period_end * 1000);
    await supabase
      .from('invoice_schedules')
      .update({
        next_invoice_date: nextInvoiceDate.toISOString().split('T')[0],
        next_amount: updatedSubscription.items.data[0].price.unit_amount! / 100,
        stripe_price_id: newPriceId,
      })
      .eq('stripe_subscription_id', organization.stripe_subscription_id);

    // 日割り計算の金額を取得（次の請求書に反映される）
    // TODO: Stripe v20のAPI変更に対応する必要あり
    // const upcomingInvoice = await stripe.invoices.upcoming({
    //   customer: organization.stripe_customer_id!,
    // });
    // const prorationAmount = upcomingInvoice.amount_due / 100;
    const prorationAmount = 0; // 一時的な値

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      prorationAmount,
      message: `プランを${newPlan}にアップグレードしました。差額¥${prorationAmount.toLocaleString('ja-JP')}は次回請求に含まれます。`,
    });

  } catch (error: unknown) {
    logger.error('Failed to upgrade subscription', { error });

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { error: `Stripeエラー: ${stripeError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'プランのアップグレードに失敗しました' },
      { status: 500 }
    );
  }
}
