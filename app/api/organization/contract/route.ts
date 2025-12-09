import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 契約情報取得
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // super_adminのみ全組織の契約を閲覧可能
    let query = supabase
      .from('contracts')
      .select(`
        *,
        organization:organizations(id, name)
      `);

    if (userData.role !== 'super_admin') {
      query = query.eq('organization_id', userData.organization_id);
    }

    const { data: contracts, error } = await query;

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contracts });
  } catch (error) {
    console.error('Error in contract route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 契約情報更新（super_adminのみ）
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      organization_id,
      plan_type,
      user_limit,
      has_asset_package,
      has_dx_efficiency_package,
      status,
    } = body;

    // 料金計算
    const baseFee = calculateBaseFee(plan_type, user_limit);
    const packageFee = calculatePackageFee(has_asset_package, has_dx_efficiency_package);

    // 既存の契約を確認
    const { data: existingContract } = await supabase
      .from('contracts')
      .select('*')
      .eq('organization_id', organization_id)
      .single();

    let result;
    if (existingContract) {
      // 更新
      const { data, error } = await supabase
        .from('contracts')
        .update({
          plan_type,
          user_limit,
          has_asset_package,
          has_dx_efficiency_package,
          base_monthly_fee: baseFee,
          package_monthly_fee: packageFee,
          total_monthly_fee: baseFee + packageFee,
          status,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', existingContract.id)
        .select()
        .single();

      if (error) throw error;

      // 履歴記録
      await supabase.from('contract_history').insert({
        contract_id: existingContract.id,
        organization_id,
        action: 'upgraded',
        previous_state: existingContract,
        new_state: data,
        performed_by: user.id,
      });

      result = data;
    } else {
      // 新規作成
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          organization_id,
          contract_number: `CON-${Date.now()}`,
          plan_type,
          user_limit,
          has_asset_package,
          has_dx_efficiency_package,
          contract_type: 'monthly',
          plan: plan_type,
          monthly_fee: baseFee + packageFee,
          start_date: new Date().toISOString().split('T')[0],
          base_monthly_fee: baseFee,
          package_monthly_fee: packageFee,
          total_monthly_fee: baseFee + packageFee,
          billing_cycle: 'monthly',
          contract_start_date: new Date().toISOString().split('T')[0],
          status: status || 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 履歴記録
      await supabase.from('contract_history').insert({
        contract_id: data.id,
        organization_id,
        action: 'created',
        new_state: data,
        performed_by: user.id,
      });

      result = data;
    }

    return NextResponse.json({ contract: result });
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 料金計算関数
function calculateBaseFee(planType: string, userLimit: number): number {
  const plans: Record<string, number> = {
    start: 18000,
    standard: 45000,
    business: 70000,
    pro: 120000,
  };
  return plans[planType] || 18000;
}

function calculatePackageFee(hasAsset: boolean, hasDx: boolean): number {
  if (hasAsset && hasDx) {
    return 32000; // フル機能統合パック（割引適用）
  }
  if (hasAsset) {
    return 18000; // 現場資産パック
  }
  if (hasDx) {
    return 22000; // 現場DX業務効率化パック
  }
  return 0;
}
