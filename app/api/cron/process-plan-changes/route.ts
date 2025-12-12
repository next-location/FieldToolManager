import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceId } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * プラン変更処理Cron API
 *
 * GET /api/cron/process-plan-changes
 *
 * 毎日実行し、scheduled_forが今日以前のダウングレードリクエストを処理する
 *
 * 実行内容:
 * 1. plan_change_requestsテーブルから実行予定日が今日以前のダウングレードリクエストを取得
 * 2. Stripe Subscriptionを更新
 * 3. ステータスを'completed'に更新
 * 4. 通知メール送信
 *
 * Vercel Cronジョブ設定:
 * vercel.json に以下を追加:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-plan-changes",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Cron Secret認証（オプション）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting plan change processing cron job');

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 実行予定日が今日以前のダウングレードリクエストを取得
    const { data: requests, error: fetchError } = await supabase
      .from('plan_change_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('change_type', 'downgrade')
      .lte('scheduled_for', today);

    if (fetchError) {
      logger.error('Failed to fetch plan change requests', { error: fetchError });
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      );
    }

    if (!requests || requests.length === 0) {
      logger.info('No plan changes to process');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No plan changes to process',
      });
    }

    logger.info(`Processing ${requests.length} plan change requests`);

    const results = [];

    for (const request of requests) {
      try {
        logger.info('Processing plan change request', {
          requestId: request.id,
          organizationId: request.organization_id,
          currentPlan: request.current_plan,
          requestedPlan: request.requested_plan,
        });

        // Stripe Subscriptionを取得
        const subscription = await stripe.subscriptions.retrieve(
          request.stripe_subscription_id
        );

        // 新しいPrice IDを取得
        const newPriceId = getPriceId(request.requested_plan as 'basic' | 'standard' | 'premium');

        // Subscriptionを更新（日割り計算なし）
        const updatedSubscription = await stripe.subscriptions.update(
          request.stripe_subscription_id,
          {
            items: [
              {
                id: subscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            proration_behavior: 'none', // ダウングレードは日割りなし
            metadata: {
              organization_id: request.organization_id,
              plan: request.requested_plan,
              downgrade_date: new Date().toISOString(),
            },
          }
        );

        logger.info('Subscription downgraded successfully', {
          subscriptionId: updatedSubscription.id,
          requestId: request.id,
        });

        // DBを更新
        await supabase
          .from('organizations')
          .update({
            plan: request.requested_plan,
          })
          .eq('id', request.organization_id);

        // リクエストステータス更新
        await supabase
          .from('plan_change_requests')
          .update({
            status: 'completed',
            notes: `${request.notes || ''}\nCompleted at ${new Date().toISOString()}`,
          })
          .eq('id', request.id);

        // invoice_schedulesを更新
        const nextInvoiceDate = new Date(updatedSubscription.current_period_end * 1000);
        await supabase
          .from('invoice_schedules')
          .update({
            next_invoice_date: nextInvoiceDate.toISOString().split('T')[0],
            next_amount: updatedSubscription.items.data[0].price.unit_amount! / 100,
            stripe_price_id: newPriceId,
          })
          .eq('stripe_subscription_id', request.stripe_subscription_id);

        // TODO: ダウングレード完了通知メール送信

        results.push({
          requestId: request.id,
          organizationId: request.organization_id,
          status: 'success',
        });

      } catch (error) {
        logger.error('Failed to process plan change request', {
          requestId: request.id,
          error,
        });

        // エラー記録
        await supabase
          .from('plan_change_requests')
          .update({
            status: 'pending',
            notes: `${request.notes || ''}\nError at ${new Date().toISOString()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          })
          .eq('id', request.id);

        results.push({
          requestId: request.id,
          organizationId: request.organization_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;

    logger.info('Plan change processing completed', {
      total: results.length,
      success: successCount,
      error: errorCount,
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount,
      errorCount,
      results,
    });

  } catch (error) {
    logger.error('Cron job failed', { error });

    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Next.js 15のRoute Handler設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
