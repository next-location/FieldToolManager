import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { endSession } from '@/lib/auth/impersonation';
import { createAdminClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/security/rate-limiter';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('impersonation_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 400 });
    }

    // セッション情報を取得してログ記録
    const supabase = createAdminClient();
    const { data: session } = await supabase
      .from('impersonation_sessions')
      .select('super_admin_id, organization_id')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'セッションが見つかりません' }, { status: 404 });
    }

    await supabase.from('impersonation_access_logs').insert({
      super_admin_id: session.super_admin_id,
      organization_id: session.organization_id,
      action: 'logout',
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
    });

    // 組織の契約IDを取得
    const { data: contract } = await supabase
      .from('contracts')
      .select('id')
      .eq('organization_id', session.organization_id)
      .eq('status', 'active')
      .single();

    // セッション削除
    await endSession(sessionToken);

    // Cookie削除
    cookieStore.delete('impersonation_session');

    return NextResponse.json({
      success: true,
      contractId: contract?.id || null
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'ログアウトに失敗しました' },
      { status: 500 }
    );
  }
}
