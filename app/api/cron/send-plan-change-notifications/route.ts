import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  sendThreeDaysBeforeWarning,
  sendGracePeriodDailyWarning
} from '@/lib/email/plan-change-notifications';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * プラン変更通知Cron
 *
 * 毎日実行され、以下の通知を送信:
 * 1. 切り替え3日前警告
 * 2. 猶予期間中の毎日警告（残り3日、2日、1日、0日）
 *
 * GET /api/cron/send-plan-change-notifications
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronからの呼び出しのみ許可）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron request', { authHeader });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 3日後の日付
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    logger.info('Starting plan change notification process', {
      date: today.toISOString(),
      todayStr,
      threeDaysLaterStr
    });

    let sentCount = 0;
    const errors: string[] = [];

    // ========================================
    // 1. 切り替え3日前警告
    // ========================================

    const { data: threeDaysBeforeContracts, error: threeDaysError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (id, name)
      `)
      .eq('status', 'active')
      .not('pending_plan_change', 'is', null);

    if (!threeDaysError) {
      const contractsForThreeDaysWarning = (threeDaysBeforeContracts || []).filter(contract => {
        const pendingChange = contract.pending_plan_change as any;
        return pendingChange &&
               pendingChange.effective_date === threeDaysLaterStr &&
               pendingChange.is_downgrade &&
               pendingChange.user_exceeded;
      });

      for (const contract of contractsForThreeDaysWarning) {
        const pendingChange = contract.pending_plan_change as any;
        const organization = Array.isArray(contract.organizations)
          ? contract.organizations[0]
          : contract.organizations;

        if (!organization) continue;

        // 現在のユーザー数を再確認
        const { count: currentUserCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .is('deleted_at', null);

        const actualUserCount = currentUserCount || 0;

        if (actualUserCount > pendingChange.new_user_limit) {
          const graceDeadline = new Date(pendingChange.effective_date);
          graceDeadline.setDate(graceDeadline.getDate() + 3);

          try {
            await sendThreeDaysBeforeWarning({
              to: contract.billing_contact_email || contract.admin_email || '',
              organizationName: organization.name,
              effectiveDate: pendingChange.effective_date,
              currentPlan: pendingChange.old_plan,
              newPlan: pendingChange.new_plan,
              currentUserLimit: pendingChange.old_user_limit,
              newUserLimit: pendingChange.new_user_limit,
              currentUserCount: actualUserCount,
              excessCount: actualUserCount - pendingChange.new_user_limit,
              graceDeadline: graceDeadline.toISOString().split('T')[0]
            });

            logger.info('Three days before warning sent', {
              contractId: contract.id,
              to: contract.billing_contact_email || contract.admin_email
            });

            sentCount++;
          } catch (error) {
            logger.error('Failed to send three days before warning', {
              contractId: contract.id,
              error
            });
            errors.push(`Contract ${contract.id}: Failed to send 3-day warning`);
          }
        }
      }
    }

    // ========================================
    // 2. 猶予期間中の毎日警告
    // ========================================

    const { data: gracePeriodContracts, error: graceError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (id, name)
      `)
      .eq('status', 'active')
      .not('plan_change_grace_deadline', 'is', null);

    if (!graceError) {
      for (const contract of gracePeriodContracts || []) {
        const organization = Array.isArray(contract.organizations)
          ? contract.organizations[0]
          : contract.organizations;

        if (!organization) continue;

        const graceDeadline = new Date(contract.plan_change_grace_deadline);
        const graceDeadlineStr = graceDeadline.toISOString().split('T')[0];

        // 猶予期限までの日数を計算
        const daysUntilDeadline = Math.ceil(
          (graceDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 猶予期間中（0〜3日）のみ通知
        if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3) {
          // 現在のユーザー数を確認
          const { count: currentUserCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .is('deleted_at', null);

          const actualUserCount = currentUserCount || 0;
          const maxUsers = organization.max_users || contract.user_limit || 0;

          if (actualUserCount > maxUsers) {
            // まだユーザー数超過 → 毎日警告送信
            const effectiveDate = new Date(graceDeadline);
            effectiveDate.setDate(effectiveDate.getDate() - 3);

            try {
              await sendGracePeriodDailyWarning({
                to: contract.billing_contact_email || contract.admin_email || '',
                organizationName: organization.name,
                effectiveDate: effectiveDate.toISOString().split('T')[0],
                currentPlan: contract.plan,
                newPlan: contract.plan,
                currentUserLimit: maxUsers,
                newUserLimit: maxUsers,
                currentUserCount: actualUserCount,
                excessCount: actualUserCount - maxUsers,
                graceDeadline: graceDeadlineStr,
                daysRemaining: daysUntilDeadline
              });

              logger.info('Grace period daily warning sent', {
                contractId: contract.id,
                to: contract.billing_contact_email || contract.admin_email,
                daysRemaining: daysUntilDeadline
              });

              sentCount++;
            } catch (error) {
              logger.error('Failed to send grace period warning', {
                contractId: contract.id,
                daysRemaining: daysUntilDeadline,
                error
              });
              errors.push(`Contract ${contract.id}: Failed to send grace period warning (day ${daysUntilDeadline})`);
            }
          }
        }
      }
    }

    logger.info('Plan change notification process completed', {
      sentCount,
      errorCount: errors.length
    });

    return NextResponse.json({
      success: true,
      sentCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: unknown) {
    logger.error('Plan change notification cron failed', { error });
    return NextResponse.json(
      { error: '通知送信処理に失敗しました' },
      { status: 500 }
    );
  }
}
