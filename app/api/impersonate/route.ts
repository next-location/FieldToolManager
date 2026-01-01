import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAndConsumeToken } from '@/lib/auth/impersonation';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(
      '<html><body><h1>❌ 無効なトークン</h1><p>ログインURLが正しくありません。</p></body></html>',
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  const result = await verifyAndConsumeToken(token);

  if (!result) {
    return new NextResponse(
      '<html><body><h1>❌ トークンが無効</h1><p>トークンが期限切れ、または既に使用済みです。</p></body></html>',
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  const { sessionToken, payload } = result;

  // セッションCookieをセット (sameSite: lax)
  const cookieStore = await cookies();
  cookieStore.set('impersonation_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 60, // 30分
    path: '/',
  });

  // アクセスログ記録
  const supabase = createAdminClient();
  await supabase.from('impersonation_access_logs').insert({
    super_admin_id: payload.superAdminId,
    organization_id: payload.organizationId,
    action: 'login',
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
  });

  // 組織のダッシュボードにリダイレクト
  const isDevelopment = process.env.NODE_ENV === 'development';
  const targetUrl = isDevelopment
    ? `http://${payload.subdomain}.localhost:3000/dashboard`
    : `https://${payload.subdomain}.zairoku.com/dashboard`;

  return NextResponse.redirect(targetUrl);
}
