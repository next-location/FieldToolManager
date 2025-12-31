import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminPassword, setSuperAdminCookie } from '@/lib/auth/super-admin';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/security/rate-limiter';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';
import { sendLoginNotification } from '@/lib/notifications/login-notification';
import { recordLoginAttempt, checkForeignIPAccess } from '@/lib/security/login-tracker';
import { getCountryFromIP } from '@/lib/security/geoip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    console.error('[ADMIN LOGIN API] CSRF validation failed');
    return csrfErrorResponse();
  }

  try {
    // レート制限チェック
    const clientIp = getClientIp(request);
    if (!rateLimiters.login.check(clientIp)) {
      const resetTime = rateLimiters.login.getResetTime(clientIp);
      return rateLimitResponse(resetTime);
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
    }

    // スーパーアドミン取得（2FA関連フィールドも取得）
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !superAdmin) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
    }

    // アカウントロック確認
    if (superAdmin.locked_until && new Date(superAdmin.locked_until) > new Date()) {
      return NextResponse.json({
        error: 'アカウントがロックされています。しばらくしてから再度お試しください。'
      }, { status: 403 });
    }

    // パスワード検証
    const isValidPassword = await verifySuperAdminPassword(password, superAdmin.password_hash);

    if (!isValidPassword) {
      // ログイン失敗回数を更新
      const failedAttempts = (superAdmin.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: failedAttempts };

      // 5回失敗でロック（30分）
      if (failedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }

      await supabase
        .from('super_admins')
        .update(updates)
        .eq('id', superAdmin.id);

      // ログイン試行を記録（失敗）- エラーが出てもログインには影響させない
      try {
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                          request.headers.get('x-real-ip') ||
                          'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        await recordLoginAttempt({
          email,
          ipAddress,
          userAgent,
          attemptType: 'password_failure',
        });
      } catch (trackerError) {
        console.error('[Login] Failed to record login attempt:', trackerError);
        // エラーを無視してログイン処理を続行
      }

      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
    }

    // 2FA有効化チェック
    if (superAdmin.two_factor_enabled) {
      // パスワードは正しいが、2FA検証が必要
      // 一時セッションを作成（2FA検証前）
      return NextResponse.json({
        success: false,
        requiresTwoFactor: true,
        userId: superAdmin.id,
        email: superAdmin.email,
      });
    }

    // ログイン成功 - セッションを作成
    await setSuperAdminCookie({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role,
      permission_level: superAdmin.permission_level,
    });

    // ログイン情報を更新
    await supabase
      .from('super_admins')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: request.headers.get('x-forwarded-for') || 'unknown',
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', superAdmin.id);

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ログイン試行を記録（成功）+ 日本国外IP警告チェック - エラーが出てもログインには影響させない
    try {
      await recordLoginAttempt({
        email: superAdmin.email,
        ipAddress,
        userAgent,
        attemptType: 'success',
      });

      // 日本国外からのアクセスを警告
      const countryCode = await getCountryFromIP(ipAddress);
      await checkForeignIPAccess(superAdmin.email, ipAddress, userAgent, countryCode);
    } catch (trackerError) {
      console.error('[Login] Failed to record login attempt or check foreign IP:', trackerError);
      // エラーを無視してログイン処理を続行
    }

    // ログイン通知を送信 - エラーが出てもログインには影響させない
    try {
      await sendLoginNotification({
        email: superAdmin.email,
        name: superAdmin.name,
        ipAddress,
        userAgent,
      });
    } catch (notificationError) {
      console.error('[Login] Failed to send login notification:', notificationError);
      // エラーを無視してログイン処理を続行
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: superAdmin.id,
        action: 'login',
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    return NextResponse.json({ success: true, redirect: '/admin/dashboard' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'ログインエラーが発生しました' }, { status: 500 });
  }
}
