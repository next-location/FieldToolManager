import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/impersonation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const impersonationToken = cookieStore.get('impersonation_session')?.value;
    let organizationId: string | null = null;

    // なりすましセッションチェック
    if (impersonationToken) {
      const impersonationPayload = await verifySessionToken(impersonationToken);
      if (impersonationPayload) {
        console.log('[API /organization/features] Using impersonation session');
        organizationId = impersonationPayload.organizationId;
      }
    }

    // 通常の認証フロー
    if (!organizationId) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      organizationId = userData.organization_id;
    }

    // なりすましセッションの場合はSERVICE_ROLE_KEYを使用
    const supabase = impersonationToken ? createAdminClient() : await createClient();

    // organization_features ビューから取得
    const { data: features, error: featuresError } = await supabase
      .from('organization_features')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (featuresError) {
      // ビューにデータがない場合は、デフォルト値を返す
      return NextResponse.json({
        organization_id: organizationId,
        contract: {
          plan_type: 'trial',
          user_limit: 10,
          packages: {
            asset_management: false,
            dx_efficiency: false,
          },
          status: 'trial',
        },
        features: [],
        package_type: 'none',
      });
    }

    return NextResponse.json({
      organization_id: organizationId,
      organization_name: features.organization_name,
      contract: {
        plan_type: features.plan_type || 'trial',
        user_limit: features.user_limit || 10,
        packages: {
          asset_management: features.has_asset_package || false,
          dx_efficiency: features.has_dx_efficiency_package || false,
        },
        status: features.contract_status || 'trial',
        contract_start_date: features.contract_start_date,
        contract_end_date: features.contract_end_date,
        trial_end_date: features.trial_end_date,
      },
      features: features.enabled_features || [],
      package_type: features.package_type || 'none',
    });
  } catch (error) {
    console.error('Error fetching organization features:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
