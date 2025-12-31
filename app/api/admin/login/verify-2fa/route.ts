/**
 * 2FA検証後のログイン完了 API
 * POST /api/admin/login/verify-2fa
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setSuperAdminCookie } from '@/lib/auth/super-admin';
import { verifyToken, decryptSecret, verifyBackupCode } from '@/lib/security/2fa';
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
    console.error('[ADMIN 2FA VERIFY API] CSRF validation failed');
    return csrfErrorResponse();
  }

  try {
    const { userId, token, isBackupCode } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'ユーザーIDとトークンが必要です' },
        { status: 400 }
      );
    }

    // スーパーアドミン情報を取得
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !superAdmin) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 2FAが有効化されているかチェック
    if (!superAdmin.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FAが有効化されていません' },
        { status: 400 }
      );
    }

    let isValid = false;
    let usedBackupCode = false;

    // バックアップコードの場合
    if (isBackupCode) {
      // バックアップコード形式チェック（XXXX-XXXX）
      if (!/^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(token)) {
        return NextResponse.json(
          { error: '無効なバックアップコード形式です' },
          { status: 400 }
        );
      }

      const { valid, codeIndex } = await verifyBackupCode(
        token,
        superAdmin.backup_codes || []
      );

      if (valid) {
        isValid = true;
        usedBackupCode = true;

        // バックアップコードを使用済みに移動
        const usedCodes = superAdmin.backup_codes_used || [];
        usedCodes.push(superAdmin.backup_codes[codeIndex]);

        const updatedBackupCodes = superAdmin.backup_codes.filter(
          (_: string, index: number) => index !== codeIndex
        );

        await supabase
          .from('super_admins')
          .update({
            backup_codes: updatedBackupCodes,
            backup_codes_used: usedCodes,
          })
          .eq('id', superAdmin.id);

        // ログを記録
        await supabase.from('super_admin_logs').insert({
          super_admin_id: superAdmin.id,
          action: 'バックアップコード使用',
          details: {
            email: superAdmin.email,
            remaining_codes: updatedBackupCodes.length,
          },
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        });
      }
    } else {
      // TOTPトークンの場合
      if (!/^\d{6}$/.test(token)) {
        return NextResponse.json(
          { error: '無効なトークン形式です（6桁の数字を入力してください）' },
          { status: 400 }
        );
      }

      // シークレットを復号化
      const encryptionKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('暗号化キーが設定されていません');
      }

      const decryptedSecret = decryptSecret(
        superAdmin.two_factor_secret,
        encryptionKey
      );

      isValid = verifyToken(decryptedSecret, token);
    }

    if (!isValid) {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                        request.headers.get('x-real-ip') ||
                        'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // ログイン試行を記録（2FA失敗）- エラーが出てもログインには影響させない
      try {
        await recordLoginAttempt({
          email: superAdmin.email,
          ipAddress,
          userAgent,
          attemptType: '2fa_failure',
        });
      } catch (trackerError) {
        console.error('[2FA Verify] Failed to record login attempt:', trackerError);
        // エラーを無視して処理を続行
      }

      // ログを記録（失敗）
      await supabase.from('super_admin_logs').insert({
        super_admin_id: superAdmin.id,
        action: '2FA検証失敗（ログイン）',
        details: {
          email: superAdmin.email,
          type: isBackupCode ? 'backup_code' : 'totp',
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return NextResponse.json(
        { error: isBackupCode ? 'バックアップコードが正しくありません' : 'トークンが正しくありません' },
        { status: 400 }
      );
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

    console.log('[2FA Verify] Starting post-login tasks (login tracking, IP check, email notification)');
    console.log('[2FA Verify] IP:', ipAddress, 'User:', superAdmin.email);

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
      console.error('[2FA Verify] Failed to record login attempt or check foreign IP:', trackerError);
      // エラーを無視してログイン処理を続行
    }

    // ログイン通知を送信 - エラーが出てもログインには影響させない
    console.log('[2FA Verify] Attempting to send login notification to system@zairoku.com');
    try {
      const notificationResult = await sendLoginNotification({
        email: superAdmin.email,
        name: superAdmin.name,
        ipAddress,
        userAgent,
      });
      console.log('[2FA Verify] Login notification result:', notificationResult);
    } catch (notificationError) {
      console.error('[2FA Verify] Failed to send login notification:', notificationError);
      console.error('[2FA Verify] Error stack:', notificationError instanceof Error ? notificationError.stack : 'No stack trace');
      // エラーを無視してログイン処理を続行
    }

    // ログを記録（成功）
    await supabase.from('super_admin_logs').insert({
      super_admin_id: superAdmin.id,
      action: '2FAログイン成功',
      details: {
        email: superAdmin.email,
        type: isBackupCode ? 'backup_code' : 'totp',
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      redirect: '/admin/dashboard',
      usedBackupCode,
    });
  } catch (error) {
    console.error('2FA検証エラー:', error);
    return NextResponse.json(
      { error: '2FA検証エラーが発生しました' },
      { status: 500 }
    );
  }
}
