import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * プラン変更申請API（30日前申請・次回請求日切り替え）
 *
 * POST /api/admin/contracts/[id]/change-plan
 *
 * 仕様:
 * - 申請期限: 請求日の30日前まで
 * - 反映タイミング: 次回請求日
 * - 日割り計算: なし
 * - ダウングレード時: ユーザー数チェック + 警告表示
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id: contractId } = await params;
    const body = await request.json();
    const { new_plan, new_base_fee, new_user_limit, new_package_ids, initial_fee = 0 } = body;

    // バリデーション
    if (!new_package_ids || !Array.isArray(new_package_ids) || new_package_ids.length === 0) {
      return NextResponse.json({ error: '機能パックを選択してください' }, { status: 400 });
    }

    // 契約データを取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 });
    }

    if (contract.status !== 'active') {
      return NextResponse.json({ error: '有効な契約のみプラン変更可能です' }, { status: 400 });
    }

    // 組織データを取得
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, max_users')
      .eq('id', contract.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: '組織が見つかりません' }, { status: 404 });
    }

    // 次回請求日を計算
    const today = new Date();
    const billingDay = contract.billing_day === 99
      ? new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      : contract.billing_day;

    let nextBillingDate: Date;
    if (today.getDate() < billingDay) {
      // 今月の請求日がまだ来ていない
      nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    } else {
      // 次月の請求日
      nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
    }

    // 30日前チェック
    const daysUntilBilling = Math.ceil(
      (nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilBilling < 30) {
      const nextNextBillingDate = new Date(nextBillingDate);
      nextNextBillingDate.setMonth(nextNextBillingDate.getMonth() + 1);

      return NextResponse.json({
        error: `プラン変更は請求日の30日前までに申請してください。次回変更可能日: ${nextNextBillingDate.toLocaleDateString('ja-JP')}`,
        next_available_date: nextNextBillingDate.toISOString().split('T')[0],
        days_until_billing: daysUntilBilling
      }, { status: 400 });
    }

    // 現在のユーザー数を取得（ダウングレード時の警告用）
    const { count: currentUserCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .is('deleted_at', null);

    const actualUserCount = currentUserCount || 0;

    // プラン変更タイプを判定
    const isDowngrade = new_user_limit < (contract.user_limit || organization.max_users);
    const userExceeded = isDowngrade && actualUserCount > new_user_limit;

    // 現在のパッケージを取得
    const { data: currentPackages } = await supabase
      .from('contract_packages')
      .select('package_id')
      .eq('contract_id', contractId);

    const oldPackageIds = currentPackages?.map(cp => cp.package_id) || [];

    // プラン変更データを作成
    const pendingPlanChange = {
      new_plan: new_plan || contract.plan,
      new_base_fee: new_base_fee !== undefined ? new_base_fee : contract.base_monthly_fee,
      new_user_limit: new_user_limit || contract.user_limit,
      new_package_ids,
      old_plan: contract.plan,
      old_base_fee: contract.base_monthly_fee,
      old_user_limit: contract.user_limit,
      old_package_ids: oldPackageIds,
      effective_date: nextBillingDate.toISOString().split('T')[0],
      is_downgrade: isDowngrade,
      current_user_count: actualUserCount,
      user_exceeded: userExceeded,
      initial_fee: initial_fee || 0, // 初期設定費用（工数）
      requested_by: session.id,
      requested_at: new Date().toISOString()
    };

    // 契約に変更予約を保存（organizationsテーブルは更新しない）
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        pending_plan_change: pendingPlanChange,
        plan_change_requested_at: new Date().toISOString(),
        plan_change_type: isDowngrade ? 'downgrade' : 'upgrade'
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('[Change Plan] Failed to save plan change:', updateError);
      return NextResponse.json(
        { error: 'プラン変更の保存に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[Change Plan] Plan change scheduled:', {
      contractId,
      organizationId: organization.id,
      effectiveDate: nextBillingDate.toISOString().split('T')[0],
      isDowngrade,
      userExceeded,
      currentUserCount: actualUserCount,
      newUserLimit: new_user_limit
    });

    // レスポンス
    return NextResponse.json({
      success: true,
      message: userExceeded
        ? `プラン変更を予約しました。${nextBillingDate.toLocaleDateString('ja-JP')}から適用されます。\n⚠️ 警告: 現在${actualUserCount}名のユーザーが登録されていますが、新プランの上限は${new_user_limit}名です。${actualUserCount - new_user_limit}名を削減してください。`
        : `プラン変更を予約しました。${nextBillingDate.toLocaleDateString('ja-JP')}から適用されます。`,
      effective_date: nextBillingDate.toISOString().split('T')[0],
      is_downgrade: isDowngrade,
      user_warning: userExceeded ? {
        current_user_count: actualUserCount,
        new_user_limit: new_user_limit,
        excess_count: actualUserCount - new_user_limit
      } : null
    });

  } catch (error) {
    console.error('[Change Plan] Error:', error);
    return NextResponse.json(
      { error: 'プラン変更に失敗しました' },
      { status: 500 }
    );
  }
}
