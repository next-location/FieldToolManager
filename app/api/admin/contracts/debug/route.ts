import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 契約データの集計を取得
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, plan, user_limit, status, organization_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    // プランごとの集計
    const planSummary: Record<string, { count: number; userLimits: number[] }> = {};

    contracts?.forEach(contract => {
      if (!planSummary[contract.plan]) {
        planSummary[contract.plan] = { count: 0, userLimits: [] };
      }
      planSummary[contract.plan].count++;
      if (contract.user_limit && !planSummary[contract.plan].userLimits.includes(contract.user_limit)) {
        planSummary[contract.plan].userLimits.push(contract.user_limit);
      }
    });

    // プランとユーザー制限の組み合わせ
    const planUserLimitCombos: Record<string, number> = {};
    contracts?.forEach(contract => {
      const key = `${contract.plan}_${contract.user_limit || 'null'}`;
      planUserLimitCombos[key] = (planUserLimitCombos[key] || 0) + 1;
    });

    return NextResponse.json({
      totalContracts: contracts?.length || 0,
      planSummary,
      planUserLimitCombos,
      rawSample: contracts?.slice(0, 5) // 最初の5件のサンプル
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}