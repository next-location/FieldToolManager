import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifySessionToken } from '@/lib/auth/impersonation';

export interface ApiAuthResult {
  organizationId: string;
  userId: string;
  supabase: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;
  isImpersonating: boolean;
}

/**
 * APIエンドポイント用の認証ヘルパー
 * なりすましセッションと通常の認証の両方に対応
 */
export async function getApiAuth(): Promise<ApiAuthResult | null> {
  const cookieStore = await cookies();
  const impersonationToken = cookieStore.get('impersonation_session')?.value;

  // なりすましセッションチェック
  if (impersonationToken) {
    const impersonationPayload = await verifySessionToken(impersonationToken);
    if (impersonationPayload) {
      const supabase = createAdminClient();
      return {
        organizationId: impersonationPayload.organizationId,
        userId: impersonationPayload.superAdminId,
        supabase,
        isImpersonating: true,
      };
    }
  }

  // 通常の認証フロー
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return null;
  }

  return {
    organizationId: userData.organization_id,
    userId: user.id,
    supabase,
    isImpersonating: false,
  };
}
