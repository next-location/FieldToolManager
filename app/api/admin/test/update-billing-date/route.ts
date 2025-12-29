import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * テスト用: 契約の請求日を今日に変更
 *
 * POST /api/admin/test/update-billing-date
 * Body: { contract_id: string, use_end_of_month?: boolean }
 *
 * 月払い契約: billing_dayを今日の日に変更（または99=月末）
 * 年払い契約: start_dateを1年前の今日に変更
 *
 * 注意: テスト目的のみ使用
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

    const body = await request.json();
    const { contract_id, use_end_of_month } = body;

    if (!contract_id) {
      return NextResponse.json(
        { error: 'contract_idが必要です' },
        { status: 400 }
      );
    }

    logger.info('[Test Update Billing Date] Start', { contract_id });

    // 契約データを取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, billing_cycle, billing_day, start_date')
      .eq('id', contract_id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      );
    }

    const today = new Date();
    const todayDay = today.getDate();

    let updateData: any = {};
    let message = '';

    if (contract.billing_cycle === 'monthly') {
      // 月払い契約: billing_dayを今日の日に変更（またはuse_end_of_monthの場合は99）
      updateData.billing_day = use_end_of_month ? 99 : todayDay;
      message = use_end_of_month
        ? `月払い契約の請求日を月末（99）に変更しました`
        : `月払い契約の請求日を${todayDay}日に変更しました`;
    } else if (contract.billing_cycle === 'annual') {
      // 年払い契約: start_dateを1年前の今日に変更
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      updateData.start_date = oneYearAgo.toISOString().split('T')[0];
      updateData.billing_day = todayDay; // 念のため
      message = `年払い契約の開始日を${oneYearAgo.toISOString().split('T')[0]}に変更しました（今日が年次請求日になります）`;
    } else {
      return NextResponse.json(
        { error: '無効なbilling_cycle' },
        { status: 400 }
      );
    }

    // 更新実行
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contract_id)
      .select()
      .single();

    if (updateError) {
      logger.error('[Test Update Billing Date] Update failed', { error: updateError });
      return NextResponse.json(
        { error: '更新に失敗しました' },
        { status: 500 }
      );
    }

    logger.info('[Test Update Billing Date] Success', {
      contract_id,
      billing_cycle: contract.billing_cycle,
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      message,
      before: {
        billing_day: contract.billing_day,
        start_date: contract.start_date,
      },
      after: {
        billing_day: updatedContract.billing_day,
        start_date: updatedContract.start_date,
      },
      next_step: 'cronジョブを実行して請求書を生成してください',
    });

  } catch (error: unknown) {
    logger.error('[Test Update Billing Date] Error', { error });
    return NextResponse.json(
      {
        error: '請求日の変更に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
