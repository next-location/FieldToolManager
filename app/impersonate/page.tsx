import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAndConsumeToken } from '@/lib/auth/impersonation';
import { createAdminClient } from '@/lib/supabase/server';
import { getClientIp } from '@/lib/security/rate-limiter';

export default async function ImpersonatePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <p className="text-red-600 font-semibold mb-2">❌ 無効なトークン</p>
          <p className="text-gray-600 text-sm">ログインURLが正しくありません。</p>
        </div>
      </div>
    );
  }

  const result = await verifyAndConsumeToken(token);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <p className="text-red-600 font-semibold mb-2">❌ トークンが無効</p>
          <p className="text-gray-600 text-sm">
            トークンが期限切れ、または既に使用済みです。
          </p>
        </div>
      </div>
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
    ip_address: 'server-side', // Server Componentのため
  });

  // 組織のダッシュボードにリダイレクト
  const isDevelopment = process.env.NODE_ENV === 'development';
  const targetUrl = isDevelopment
    ? `http://${payload.subdomain}.localhost:3000/dashboard`
    : `https://${payload.subdomain}.zairoku.com/dashboard`;

  redirect(targetUrl);
}
