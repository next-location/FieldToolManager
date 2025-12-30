import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  sendAutoDeactivationNotice,
  sendUserDeactivatedNotice
} from '@/lib/email/plan-change-notifications';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ユーザー自動無効化Cron
 *
 * 毎日実行され、猶予期限(plan_change_grace_deadline)が今日の契約をチェック
 * ユーザー数が上限を超過している場合、自動的に無効化
 *
 * GET /api/cron/auto-deactivate-users
 *
 * 処理フロー:
 * 1. plan_change_grace_deadline が今日の契約を取得
 * 2. ユーザー数が上限を超過しているか確認
 * 3. 超過している場合、created_at が新しい順に無効化
 * 4. is_active = false に変更（deleted_at は NULL のまま）
 * 5. 管理者とユーザーにメール通知
 * 6. plan_change_grace_deadline をクリア
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

    logger.info('Starting auto user deactivation process', {
      date: today.toISOString(),
      todayStr
    });

    // plan_change_grace_deadline が今日の契約を取得
    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (id, name, max_users)
      `)
      .eq('status', 'active')
      .not('plan_change_grace_deadline', 'is', null);

    if (fetchError) {
      logger.error('Failed to fetch contracts with grace deadlines', {
        error: fetchError
      });
      return NextResponse.json(
        { error: 'データベースエラー' },
        { status: 500 }
      );
    }

    // 猶予期限が今日の契約をフィルタ
    const contractsToProcess = (contracts || []).filter(contract => {
      const deadline = new Date(contract.plan_change_grace_deadline);
      const deadlineStr = deadline.toISOString().split('T')[0];
      return deadlineStr === todayStr;
    });

    if (!contractsToProcess || contractsToProcess.length === 0) {
      logger.info('No users to auto-deactivate today');
      return NextResponse.json({
        success: true,
        message: '本日自動無効化する契約はありません',
        count: 0,
      });
    }

    logger.info('Found contracts with grace deadline today', {
      count: contractsToProcess.length
    });

    let deactivatedContractCount = 0;
    let totalDeactivatedUsers = 0;
    const errors: string[] = [];

    for (const contract of contractsToProcess) {
      const organization = Array.isArray(contract.organizations)
        ? contract.organizations[0]
        : contract.organizations;

      if (!organization) {
        logger.warn('Organization not found for contract', { contractId: contract.id });
        errors.push(`Contract ${contract.id}: Organization not found`);
        continue;
      }

      try {
        const maxUsers = organization.max_users || contract.user_limit || 0;

        // 現在のアクティブユーザー数を取得
        const { count: activeUserCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .is('deleted_at', null)
          .eq('is_active', true);

        const actualUserCount = activeUserCount || 0;

        logger.info('Checking user count for organization', {
          contractId: contract.id,
          organizationId: organization.id,
          actualUserCount,
          maxUsers
        });

        if (actualUserCount > maxUsers) {
          // ユーザー数超過 → 自動無効化実行
          const excessCount = actualUserCount - maxUsers;

          logger.info('User count exceeded, starting auto-deactivation', {
            contractId: contract.id,
            organizationId: organization.id,
            excessCount
          });

          // 無効化対象ユーザーを取得（created_at が新しい順）
          const { data: usersToDeactivate, error: usersError } = await supabase
            .from('users')
            .select('id, name, email, created_at')
            .eq('organization_id', organization.id)
            .is('deleted_at', null)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(excessCount);

          if (usersError || !usersToDeactivate || usersToDeactivate.length === 0) {
            logger.error('Failed to fetch users to deactivate', {
              contractId: contract.id,
              error: usersError
            });
            errors.push(`Contract ${contract.id}: Failed to fetch users`);
            continue;
          }

          // ユーザーを無効化（is_active = false）
          const userIds = usersToDeactivate.map(u => u.id);

          const { error: updateError } = await supabase
            .from('users')
            .update({ is_active: false })
            .in('id', userIds);

          if (updateError) {
            logger.error('Failed to deactivate users', {
              contractId: contract.id,
              error: updateError
            });
            errors.push(`Contract ${contract.id}: Failed to deactivate users`);
            continue;
          }

          logger.info('Users deactivated successfully', {
            contractId: contract.id,
            organizationId: organization.id,
            deactivatedCount: usersToDeactivate.length
          });

          // 管理者にメール通知
          try {
            await sendAutoDeactivationNotice({
              to: contract.billing_contact_email || contract.admin_email || '',
              organizationName: organization.name,
              deactivatedUsers: usersToDeactivate.map(u => ({
                name: u.name,
                email: u.email
              })),
              newUserLimit: maxUsers
            });

            logger.info('Auto deactivation notice sent to admin', {
              contractId: contract.id,
              to: contract.billing_contact_email || contract.admin_email
            });
          } catch (emailError) {
            logger.error('Failed to send admin notification', {
              contractId: contract.id,
              error: emailError
            });
          }

          // 無効化されたユーザーに個別通知
          for (const user of usersToDeactivate) {
            try {
              await sendUserDeactivatedNotice({
                to: user.email,
                userName: user.name,
                organizationName: organization.name,
                reason: `プラン変更に伴い、ユーザー上限（${maxUsers}名）を超過したため、新しく登録された順に自動的に無効化されました。`
              });

              logger.info('User deactivation notice sent', {
                userId: user.id,
                to: user.email
              });
            } catch (emailError) {
              logger.error('Failed to send user notification', {
                userId: user.id,
                error: emailError
              });
            }
          }

          deactivatedContractCount++;
          totalDeactivatedUsers += usersToDeactivate.length;

        } else {
          // ユーザー数が上限内 → 問題なし
          logger.info('User count within limit, no action needed', {
            contractId: contract.id,
            organizationId: organization.id,
            actualUserCount,
            maxUsers
          });
        }

        // plan_change_grace_deadline をクリア
        await supabase
          .from('contracts')
          .update({ plan_change_grace_deadline: null })
          .eq('id', contract.id);

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error('Failed to process auto-deactivation for contract', {
          contractId: contract.id,
          organizationId: organization?.id,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        });

        errors.push(`Contract ${contract.id}: ${errorMessage}`);
      }
    }

    logger.info('Auto user deactivation process completed', {
      processedContracts: contractsToProcess.length,
      deactivatedContracts: deactivatedContractCount,
      totalDeactivatedUsers,
      errorCount: errors.length
    });

    return NextResponse.json({
      success: true,
      processedContracts: contractsToProcess.length,
      deactivatedContracts: deactivatedContractCount,
      totalDeactivatedUsers,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: unknown) {
    logger.error('Auto user deactivation cron failed', { error });
    return NextResponse.json(
      { error: 'ユーザー自動無効化処理に失敗しました' },
      { status: 500 }
    );
  }
}
