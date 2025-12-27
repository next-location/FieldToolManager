import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resendの無料プラン制限
const RESEND_FREE_LIMIT = 3000;
const WARNING_THRESHOLD = 0.8; // 80%
const CRITICAL_THRESHOLD = 0.9; // 90%
const DANGER_THRESHOLD = 0.97; // 97%

/**
 * Vercel Cron Job: Resend使用量チェック
 * 毎日実行され、月間送信数をチェックして閾値を超えたら通知を生成
 *
 * Vercel Cron設定:
 * - vercel.json に以下を追加:
 *   {
 *     "crons": [{
 *       "path": "/api/cron/check-email-usage",
 *       "schedule": "0 10 * * *"
 *     }]
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    // Cron Secret検証（本番環境のみ）
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting email usage check...');

    // 今月の年月を取得（YYYY-MM形式）
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 今月のResend送信数を集計
    const { count, error } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('year_month', yearMonth)
      .eq('provider', 'resend')
      .eq('success', true);

    if (error) {
      console.error('[Cron] Error fetching email logs:', error);
      return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
    }

    const monthlyCount = count || 0;
    const usagePercentage = (monthlyCount / RESEND_FREE_LIMIT) * 100;

    console.log('[Cron] Email usage:', {
      yearMonth,
      monthlyCount,
      limit: RESEND_FREE_LIMIT,
      usagePercentage: `${usagePercentage.toFixed(2)}%`,
    });

    // 通知生成（閾値に応じて）
    let notificationType: string | null = null;
    let notificationTitle: string | null = null;
    let notificationMessage: string | null = null;
    let severity: string = 'info';

    if (usagePercentage >= DANGER_THRESHOLD * 100) {
      // 97%以上: 危険
      notificationType = 'resend_usage_danger';
      notificationTitle = '🚨 Resend使用量が97%に達しました！';
      notificationMessage = `今月のメール送信数が${monthlyCount}通に達しました（制限: ${RESEND_FREE_LIMIT}通）。残り${RESEND_FREE_LIMIT - monthlyCount}通で上限に達します。至急ProプランへのアップグレードまたはGoogle Workspace SMTPへの切り替えを推奨します。`;
      severity = 'critical';
    } else if (usagePercentage >= CRITICAL_THRESHOLD * 100) {
      // 90%以上: 緊急
      notificationType = 'resend_usage_critical';
      notificationTitle = '⚠️ Resend使用量が90%に達しました';
      notificationMessage = `今月のメール送信数が${monthlyCount}通に達しました（制限: ${RESEND_FREE_LIMIT}通）。早急に対応が必要です。Proプランへのアップグレードを検討してください。`;
      severity = 'error';
    } else if (usagePercentage >= WARNING_THRESHOLD * 100) {
      // 80%以上: 警告
      notificationType = 'resend_usage_warning';
      notificationTitle = 'ℹ️ Resend使用量が80%に達しました';
      notificationMessage = `今月のメール送信数が${monthlyCount}通に達しました（制限: ${RESEND_FREE_LIMIT}通）。残り使用可能数に注意してください。`;
      severity = 'warning';
    }

    // 通知を生成
    if (notificationType) {
      // 同じタイプの未読通知が既に存在するかチェック
      const { data: existingNotifications } = await supabase
        .from('super_admin_notifications')
        .select('id')
        .eq('type', notificationType)
        .eq('is_read', false)
        .gte('created_at', `${yearMonth}-01T00:00:00Z`); // 今月作成された通知のみ

      if (!existingNotifications || existingNotifications.length === 0) {
        // 新しい通知を作成
        const { error: insertError } = await supabase
          .from('super_admin_notifications')
          .insert({
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            severity,
            metadata: {
              monthlyCount,
              limit: RESEND_FREE_LIMIT,
              usagePercentage: usagePercentage.toFixed(2),
              yearMonth,
            },
          });

        if (insertError) {
          console.error('[Cron] Failed to create notification:', insertError);
        } else {
          console.log('[Cron] Notification created:', notificationTitle);
        }
      } else {
        console.log('[Cron] Notification already exists, skipping...');
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        yearMonth,
        monthlyCount,
        limit: RESEND_FREE_LIMIT,
        usagePercentage: `${usagePercentage.toFixed(2)}%`,
        notificationCreated: !!notificationType,
      },
    });
  } catch (error: any) {
    console.error('[Cron] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message,
    }, { status: 500 });
  }
}
