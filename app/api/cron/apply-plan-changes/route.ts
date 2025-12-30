import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * プラン変更適用Cron
 *
 * 毎日実行され、今日が有効日(effective_date)のプラン変更を適用
 *
 * GET /api/cron/apply-plan-changes
 *
 * 処理フロー:
 * 1. pending_plan_change があり、effective_date が今日の契約を取得
 * 2. contract_packages を更新
 * 3. contracts テーブルを更新
 * 4. organizations テーブルを更新（実際の機能反映）
 * 5. ダウングレードの場合、grace_deadline を設定（今日+3日）
 * 6. pending_plan_change をクリア
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

    logger.info('Starting plan change application process', {
      date: today.toISOString(),
      todayStr,
    });

    // pending_plan_change があり、effective_date が今日の契約を取得
    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (id, name)
      `)
      .eq('status', 'active')
      .not('pending_plan_change', 'is', null);

    if (fetchError) {
      logger.error('Failed to fetch contracts with pending plan changes', {
        error: fetchError
      });
      return NextResponse.json(
        { error: 'データベースエラー' },
        { status: 500 }
      );
    }

    // effective_date が今日の契約をフィルタ
    const contractsToApply = (contracts || []).filter(contract => {
      const pendingChange = contract.pending_plan_change as any;
      return pendingChange && pendingChange.effective_date === todayStr;
    });

    if (!contractsToApply || contractsToApply.length === 0) {
      logger.info('No plan changes to apply today');
      return NextResponse.json({
        success: true,
        message: '本日適用するプラン変更はありません',
        count: 0,
      });
    }

    logger.info('Found plan changes to apply', { count: contractsToApply.length });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const contract of contractsToApply) {
      const pendingChange = contract.pending_plan_change as any;
      const organization = Array.isArray(contract.organizations)
        ? contract.organizations[0]
        : contract.organizations;

      if (!organization) {
        logger.warn('Organization not found for contract', { contractId: contract.id });
        failureCount++;
        errors.push(`Contract ${contract.id}: Organization not found`);
        continue;
      }

      try {
        logger.info('Applying plan change', {
          contractId: contract.id,
          organizationId: organization.id,
          oldPlan: pendingChange.old_plan,
          newPlan: pendingChange.new_plan,
          isDowngrade: pendingChange.is_downgrade
        });

        // 1. contract_packages を更新
        await supabase
          .from('contract_packages')
          .delete()
          .eq('contract_id', contract.id);

        const packageInserts = pendingChange.new_package_ids.map((packageId: string) => ({
          contract_id: contract.id,
          package_id: packageId
        }));

        await supabase
          .from('contract_packages')
          .insert(packageInserts);

        // 2. 新しいパッケージ情報を取得
        const { data: newPackages } = await supabase
          .from('packages')
          .select('package_key, monthly_fee')
          .in('id', pendingChange.new_package_ids);

        const packageKeys = newPackages?.map(p => p.package_key) || [];
        const totalPackageFee = newPackages?.reduce((sum, pkg) => sum + pkg.monthly_fee, 0) || 0;

        // 3. contracts テーブルを更新
        const graceDeadline = pendingChange.is_downgrade
          ? new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) // 今日+3日
          : null;

        await supabase
          .from('contracts')
          .update({
            plan: pendingChange.new_plan,
            base_monthly_fee: pendingChange.new_base_fee,
            user_limit: pendingChange.new_user_limit,
            package_monthly_fee: totalPackageFee,
            total_monthly_fee: pendingChange.new_base_fee + totalPackageFee,
            plan_change_grace_deadline: graceDeadline?.toISOString() || null,
            pending_plan_change: null, // クリア
            plan_change_date: today.toISOString()
          })
          .eq('id', contract.id);

        // 4. organizations テーブルを更新（実際の機能反映）
        await supabase
          .from('organizations')
          .update({
            plan: pendingChange.new_plan,
            max_users: pendingChange.new_user_limit,
            has_asset_package: packageKeys.includes('asset') || packageKeys.includes('full'),
            has_dx_efficiency_package: packageKeys.includes('dx') || packageKeys.includes('full')
          })
          .eq('id', organization.id);

        logger.info('Plan change applied successfully', {
          contractId: contract.id,
          organizationId: organization.id,
          newPlan: pendingChange.new_plan,
          newUserLimit: pendingChange.new_user_limit,
          graceDeadline: graceDeadline?.toISOString().split('T')[0] || 'N/A'
        });

        successCount++;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error('Failed to apply plan change', {
          contractId: contract.id,
          organizationId: organization?.id,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        });

        failureCount++;
        errors.push(`Contract ${contract.id}: ${errorMessage}`);
      }
    }

    logger.info('Plan change application completed', {
      total: contractsToApply.length,
      success: successCount,
      failure: failureCount,
    });

    return NextResponse.json({
      success: true,
      total: contractsToApply.length,
      successCount,
      failureCount,
      errors: failureCount > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    logger.error('Plan change application cron failed', { error });
    return NextResponse.json(
      { error: 'プラン変更適用処理に失敗しました' },
      { status: 500 }
    );
  }
}
