import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifySessionToken } from '@/lib/auth/impersonation';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PageAuthResult {
  userId: string;
  organizationId: string;
  userRole: 'staff' | 'leader' | 'manager' | 'admin' | 'super_admin';
  supabase: SupabaseClient<any, 'public', any>;
  isImpersonating: boolean;
}

export interface OrganizationPackages {
  hasAssetPackage: boolean;
  hasDxPackage: boolean;
  packageType: 'full' | 'asset' | 'dx' | 'none';
}

/**
 * ページコンポーネント用の認証ヘルパー
 * なりすましセッションと通常の認証の両方に対応
 * 認証失敗時は自動的に /login にリダイレクト
 */
export async function requireAuth(): Promise<PageAuthResult> {
  const cookieStore = await cookies();
  const impersonationToken = cookieStore.get('impersonation_session')?.value;

  // なりすましセッションチェック
  if (impersonationToken) {
    const impersonationPayload = await verifySessionToken(impersonationToken);
    if (impersonationPayload) {
      const supabase = createAdminClient();

      // 組織の管理者ユーザーを取得（なりすまし用の仮想ユーザーID）
      const { data: orgAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', impersonationPayload.organizationId)
        .eq('role', 'admin')
        .limit(1)
        .single();

      return {
        userId: orgAdmin?.id || impersonationPayload.superAdminId,
        organizationId: impersonationPayload.organizationId,
        userRole: 'admin',
        supabase,
        isImpersonating: true,
      };
    }
  }

  // 通常の認証フロー
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    redirect('/login');
  }

  // DB上の'user'をUI上の'staff'にマッピング
  const mappedRole = userData.role === 'user' ? 'staff' : userData.role;

  return {
    userId: user.id,
    organizationId: userData.organization_id,
    userRole: mappedRole as 'staff' | 'leader' | 'manager' | 'admin',
    supabase,
    isImpersonating: false,
  };
}

/**
 * 組織のパッケージ情報を取得
 * Server Component用のパッケージ判定ヘルパー
 */
export async function getOrganizationPackages(
  organizationId: string,
  supabase: SupabaseClient<any, 'public', any>
): Promise<OrganizationPackages> {
  const { data: features } = await supabase
    .from('organization_features')
    .select('has_asset_package, has_dx_efficiency_package, package_type')
    .eq('organization_id', organizationId)
    .single();

  if (!features) {
    return {
      hasAssetPackage: false,
      hasDxPackage: false,
      packageType: 'none',
    };
  }

  return {
    hasAssetPackage: features.has_asset_package || false,
    hasDxPackage: features.has_dx_efficiency_package || false,
    packageType: features.package_type || 'none',
  };
}
