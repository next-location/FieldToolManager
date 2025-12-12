import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Stripe Subscriptionダウングレード申請 API
 *
 * POST /api/stripe/subscriptions/downgrade
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
 *   requestId: string;
 *   scheduledFor: string;
 *   message: string;
 * }
 *
 * ダウングレードは30日前通知必須
 * - 30日以上先: 次回更新日に適用
 * - 30日未満: 次々回更新日に適用
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

    // プランの優先度チェック（ダウングレードのみ）
    const planPriority = { basic: 1, standard: 2, premium: 3 };
    const currentPriority = planPriority[organization.plan as keyof typeof planPriority];
    const newPriority = planPriority[newPlan as keyof typeof planPriority];

    if (newPriority >= currentPriority) {
      return NextResponse.json(
        { error: 'ダウングレードのみ可能です。アップグレードは別のAPIを使用してください' },
        { status: 400 }
      );
    }

    // 既存の保留中ダウングレードリクエストをチェック
    const { data: existingRequests } = await supabase
      .from('plan_change_requests')
      .select('id, scheduled_for')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .eq('change_type', 'downgrade');

    if (existingRequests && existingRequests.length > 0) {
      return NextResponse.json(
        {
          error: `既にダウングレードリクエストが存在します（予定日: ${existingRequests[0].scheduled_for}）`,
        },
        { status: 400 }
      );
    }

    logger.info('Creating downgrade request', {
      organizationId,
      currentPlan: organization.plan,
      newPlan,
    });

    // 次回更新日を取得
    const { data: invoiceSchedule } = await supabase
      .from('invoice_schedules')
      .select('next_invoice_date')
      .eq('stripe_subscription_id', organization.stripe_subscription_id)
      .eq('is_active', true)
      .single();

    if (!invoiceSchedule) {
      return NextResponse.json(
        { error: '請求スケジュールが見つかりません' },
        { status: 404 }
      );
    }

    const nextInvoiceDate = new Date(invoiceSchedule.next_invoice_date);
    const today = new Date();
    const daysUntilNextInvoice = Math.ceil(
      (nextInvoiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let scheduledFor: Date;
    let message: string;

    if (daysUntilNextInvoice >= 30) {
      // 30日以上先: 次回更新日に適用
      scheduledFor = nextInvoiceDate;
      message = `ダウングレードリクエストを受け付けました。次回更新日（${nextInvoiceDate.toLocaleDateString('ja-JP')}）に${newPlan}プランへ変更されます。`;
    } else {
      // 30日未満: 次々回更新日に適用
      scheduledFor = new Date(nextInvoiceDate);
      scheduledFor.setMonth(scheduledFor.getMonth() + 1);
      message = `次回更新日まで30日未満のため、次々回更新日（${scheduledFor.toLocaleDateString('ja-JP')}）に${newPlan}プランへ変更されます。`;
    }

    // plan_change_requestsに記録
    const { data: request, error: requestError } = await supabase
      .from('plan_change_requests')
      .insert({
        organization_id: organizationId,
        current_plan: organization.plan,
        requested_plan: newPlan,
        change_type: 'downgrade',
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        stripe_subscription_id: organization.stripe_subscription_id,
        requested_at: new Date().toISOString(),
        notes: `Downgrade scheduled for ${scheduledFor.toISOString()}. 30-day notice requirement met.`,
      })
      .select()
      .single();

    if (requestError) {
      logger.error('Failed to create downgrade request', {
        organizationId,
        error: requestError,
      });
      return NextResponse.json(
        { error: 'ダウングレードリクエストの作成に失敗しました' },
        { status: 500 }
      );
    }

    logger.info('Downgrade request created successfully', {
      organizationId,
      requestId: request.id,
      scheduledFor,
    });

    // TODO: ダウングレード通知メール送信

    return NextResponse.json({
      success: true,
      requestId: request.id,
      scheduledFor: scheduledFor.toISOString(),
      message,
    });

  } catch (error: unknown) {
    logger.error('Failed to create downgrade request', { error });

    return NextResponse.json(
      { error: 'ダウングレードリクエストの作成に失敗しました' },
      { status: 500 }
    );
  }
}
