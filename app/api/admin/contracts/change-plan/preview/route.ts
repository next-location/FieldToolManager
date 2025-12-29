import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { verifyCsrfToken } from '@/lib/security/csrf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * プラン変更の日割り計算プレビューAPI
 * POST /api/admin/contracts/change-plan/preview
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // CSRFトークン検証
    const csrfValid = await verifyCsrfToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'CSRF検証に失敗しました' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contract_id, new_package_ids, change_date } = body;

    // バリデーション
    if (!contract_id || !new_package_ids || !Array.isArray(new_package_ids)) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    if (new_package_ids.length === 0) {
      return NextResponse.json(
        { error: '少なくとも1つの機能パックを選択してください' },
        { status: 400 }
      );
    }

    // 契約データを取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      );
    }

    if (contract.status !== 'active') {
      return NextResponse.json(
        { error: '有効な契約のみプラン変更可能です' },
        { status: 400 }
      );
    }

    // 現在のパッケージを取得
    const { data: currentPackages } = await supabase
      .from('contract_packages')
      .select(`
        package_id,
        packages (
          monthly_fee
        )
      `)
      .eq('contract_id', contract_id);

    // 新しいパッケージの料金を取得
    const { data: newPackages } = await supabase
      .from('packages')
      .select('id, monthly_fee')
      .in('id', new_package_ids);

    if (!newPackages || newPackages.length !== new_package_ids.length) {
      return NextResponse.json(
        { error: '選択されたパッケージが無効です' },
        { status: 400 }
      );
    }

    // 現在の月額料金を計算
    const oldMonthlyFee = currentPackages?.reduce(
      (sum, cp: any) => sum + (cp.packages?.monthly_fee || 0),
      0
    ) || 0;

    // 新しい月額料金を計算
    const newMonthlyFee = newPackages.reduce(
      (sum, pkg) => sum + pkg.monthly_fee,
      0
    );

    // 変更日を決定（指定がない場合は今日）
    const effectiveChangeDate = change_date || new Date().toISOString().split('T')[0];
    const changeDateTime = new Date(effectiveChangeDate);

    // 請求期間を計算
    let billingPeriodStart: Date;
    let billingPeriodEnd: Date;

    if (contract.billing_cycle === 'monthly') {
      // 月払いの場合：当月1日〜月末
      billingPeriodStart = new Date(changeDateTime.getFullYear(), changeDateTime.getMonth(), 1);
      billingPeriodEnd = new Date(changeDateTime.getFullYear(), changeDateTime.getMonth() + 1, 0);
    } else {
      // 年払いの場合：契約開始日から1年間のうち、変更日が含まれる月
      const contractStartDate = new Date(contract.start_date);
      let yearStart = new Date(contractStartDate);

      // 変更日が含まれる年度を特定
      while (yearStart < changeDateTime) {
        const nextYearStart = new Date(yearStart);
        nextYearStart.setFullYear(nextYearStart.getFullYear() + 1);

        if (nextYearStart > changeDateTime) {
          break;
        }
        yearStart = nextYearStart;
      }

      // その年度内で変更日が含まれる月の1日〜月末
      billingPeriodStart = new Date(changeDateTime.getFullYear(), changeDateTime.getMonth(), 1);
      billingPeriodEnd = new Date(changeDateTime.getFullYear(), changeDateTime.getMonth() + 1, 0);
    }

    // 日割り計算
    const totalDaysInMonth = billingPeriodEnd.getDate();
    const remainingDays = billingPeriodEnd.getDate() - changeDateTime.getDate() + 1;

    // 旧プランの日割り額（返金分、マイナス）
    const oldPlanProrated = -Math.round((oldMonthlyFee * remainingDays) / totalDaysInMonth);

    // 新プランの日割り額
    const newPlanProrated = Math.round((newMonthlyFee * remainingDays) / totalDaysInMonth);

    // 日割り差額
    const proratedDifference = oldPlanProrated + newPlanProrated;

    // 次回請求額（新プラン月額 + 日割り差額）
    const nextInvoiceAmount = newMonthlyFee + proratedDifference;

    return NextResponse.json({
      contract_id,
      old_monthly_fee: oldMonthlyFee,
      new_monthly_fee: newMonthlyFee,
      change_date: effectiveChangeDate,
      billing_period_start: billingPeriodStart.toISOString().split('T')[0],
      billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
      total_days_in_month: totalDaysInMonth,
      proration_days: remainingDays,
      old_plan_prorated: oldPlanProrated,
      new_plan_prorated: newPlanProrated,
      prorated_difference: proratedDifference,
      next_invoice_amount: nextInvoiceAmount
    });

  } catch (error) {
    console.error('[Preview Plan Change] Error:', error);
    return NextResponse.json(
      { error: 'プレビューの生成に失敗しました' },
      { status: 500 }
    );
  }
}
