import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifySessionToken } from '@/lib/auth/impersonation';

export interface PageAuthResult {
  userId: string;
  organizationId: string;
  userRole: 'staff' | 'leader' | 'manager' | 'admin';
  supabase: ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>;
  isImpersonating: boolean;
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
      return {
        userId: impersonationPayload.superAdminId,
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

  return {
    userId: user.id,
    organizationId: userData.organization_id,
    userRole: userData.role as 'staff' | 'leader' | 'manager' | 'admin',
    supabase,
    isImpersonating: false,
  };
}
