import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { generateImpersonationToken } from '@/lib/auth/impersonation';
import { verifyCsrfToken } from '@/lib/security/csrf';
import { getClientIp, rateLimiters, rateLimitResponse } from '@/lib/security/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF検証
    if (!(await verifyCsrfToken(request))) {
      return new Response('CSRF token invalid', { status: 403 });
    }

    // レート制限（IPベース: 3回/分、15分ブロック）
    const clientIp = getClientIp(request);
    if (!rateLimiters.impersonate.check(clientIp)) {
      return rateLimitResponse(rateLimiters.impersonate.getResetTime(clientIp));
    }

    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // オーナー権限チェック
    if (session.role !== 'owner') {
      return NextResponse.json(
        { error: 'オーナー権限が必要です' },
        { status: 403 }
      );
    }

    const { id: organizationId } = await params;
    const supabase = createAdminClient();

    // 組織の存在確認とアクティブ状態確認
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, subdomain, is_active')
      .eq('id', organizationId)
      .single();

    if (!organization || !organization.is_active) {
      return NextResponse.json(
        { error: '組織が見つかりません' },
        { status: 404 }
      );
    }

    // トークン生成
    const token = await generateImpersonationToken(
      session.id,
      organization.id,
      organization.name,
      organization.subdomain
    );

    // アクセスログ記録
    await supabase.from('impersonation_access_logs').insert({
      super_admin_id: session.id,
      organization_id: organization.id,
      action: 'token_generated',
      ip_address: clientIp,
      user_agent: request.headers.get('user-agent'),
    });

    // ワンタイムログインURL生成（環境に応じて動的に生成）
    const isDevelopment = process.env.NODE_ENV === 'development';
    const loginUrl = isDevelopment
      ? `http://localhost:3000/impersonate?token=${token}`
      : `https://zairoku.com/impersonate?token=${token}`;

    return NextResponse.json({ loginUrl });
  } catch (error) {
    console.error('Impersonation token generation error:', error);
    return NextResponse.json(
      { error: 'トークン生成に失敗しました' },
      { status: 500 }
    );
  }
}
