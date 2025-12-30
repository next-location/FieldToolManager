import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * プラン変更実行API
 * POST /api/admin/contracts/[id]/change-plan
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
    const { new_plan, new_base_fee, new_user_limit, new_package_ids, change_date, initial_fee = 0 } = body;

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

    // 現在のパッケージを取得
    const { data: currentPackages } = await supabase
      .from('contract_packages')
      .select('package_id, packages(monthly_fee)')
      .eq('contract_id', contractId);

    const oldMonthlyFee = currentPackages?.reduce(
      (sum, cp: any) => sum + ((Array.isArray(cp.packages) ? cp.packages[0] : cp.packages)?.monthly_fee || 0),
      0
    ) || 0;

    // 新しいパッケージの月額料金を取得
    const { data: newPackages } = await supabase
      .from('packages')
      .select('monthly_fee')
      .in('id', new_package_ids);

    const newMonthlyFee = newPackages?.reduce((sum, pkg) => sum + pkg.monthly_fee, 0) || 0;

    // 日割り計算
    const effectiveChangeDate = change_date ? new Date(change_date) : new Date();
    const today = new Date();
    const billingDay = contract.billing_day === 99
      ? new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      : contract.billing_day;

    let billingPeriodStart: Date;
    let billingPeriodEnd: Date;

    if (today.getDate() >= billingDay) {
      billingPeriodStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
      billingPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, billingDay - 1);
    } else {
      billingPeriodStart = new Date(today.getFullYear(), today.getMonth() - 1, billingDay);
      billingPeriodEnd = new Date(today.getFullYear(), today.getMonth(), billingDay - 1);
    }

    const totalDaysInMonth = Math.ceil(
      (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const remainingDays = Math.ceil(
      (billingPeriodEnd.getTime() - effectiveChangeDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const oldPlanProrated = -Math.round((oldMonthlyFee * remainingDays) / totalDaysInMonth);
    const newPlanProrated = Math.round((newMonthlyFee * remainingDays) / totalDaysInMonth);
    const proratedDifference = oldPlanProrated + newPlanProrated;

    // プラン変更タイプを判定
    const planChangeType = newMonthlyFee > oldMonthlyFee ? 'upgrade' :
                           newMonthlyFee < oldMonthlyFee ? 'downgrade' : 'change';

    // 契約パッケージを更新
    await supabase
      .from('contract_packages')
      .delete()
      .eq('contract_id', contractId);

    const packageInserts = new_package_ids.map(packageId => ({
      contract_id: contractId,
      package_id: packageId
    }));

    await supabase
      .from('contract_packages')
      .insert(packageInserts);

    // 契約情報を更新
    const updateData: any = {
      pending_prorated_charge: proratedDifference + initial_fee, // 日割り差額 + 初期費用
      pending_prorated_description: `プラン変更（${planChangeType}）による日割り差額${initial_fee > 0 ? ' + 初期費用' : ''}`,
      plan_change_date: effectiveChangeDate.toISOString(),
      plan_change_type: planChangeType
    };

    // 基本プラン変更がある場合
    if (new_plan) {
      updateData.plan = new_plan;
    }
    if (new_base_fee !== undefined) {
      updateData.base_monthly_fee = new_base_fee;
    }
    if (new_user_limit !== undefined) {
      updateData.user_limit = new_user_limit;
    }

    // total_monthly_feeも再計算
    const finalBaseFee = new_base_fee !== undefined ? new_base_fee : contract.base_monthly_fee;
    const finalPackageFee = newPackages?.reduce((sum, pkg) => sum + pkg.monthly_fee, 0) || 0;
    updateData.total_monthly_fee = finalBaseFee + finalPackageFee;
    updateData.package_monthly_fee = finalPackageFee;

    await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId);

    // 組織テーブルも更新（実際のユーザー上限と機能を反映）
    const organizationUpdateData: any = {};

    if (new_user_limit !== undefined) {
      organizationUpdateData.max_users = new_user_limit;
    }
    if (new_plan) {
      organizationUpdateData.plan = new_plan;
    }

    // 機能パックに応じた機能フラグを設定
    const { data: selectedPackages } = await supabase
      .from('packages')
      .select('package_key')
      .in('id', new_package_ids);

    const packageKeys = selectedPackages?.map(p => p.package_key) || [];

    // 機能パックフラグを更新
    organizationUpdateData.has_asset_package = packageKeys.includes('asset') || packageKeys.includes('full');
    organizationUpdateData.has_dx_efficiency_package = packageKeys.includes('dx') || packageKeys.includes('full');

    if (Object.keys(organizationUpdateData).length > 0) {
      await supabase
        .from('organizations')
        .update(organizationUpdateData)
        .eq('id', contract.organization_id);
    }

    console.log('[Change Plan] Plan changed successfully:', {
      contractId,
      organizationId: contract.organization_id,
      oldMonthlyFee,
      newMonthlyFee,
      proratedDifference,
      initial_fee,
      planChangeType,
      organizationUpdates: organizationUpdateData
    });

    return NextResponse.json({
      success: true,
      message: 'プラン変更が完了しました',
      old_monthly_fee: oldMonthlyFee,
      new_monthly_fee: newMonthlyFee,
      prorated_difference: proratedDifference,
      initial_fee: initial_fee,
      total_pending_charge: proratedDifference + initial_fee
    });

  } catch (error) {
    console.error('[Change Plan] Error:', error);
    return NextResponse.json(
      { error: 'プラン変更に失敗しました' },
      { status: 500 }
    );
  }
}
