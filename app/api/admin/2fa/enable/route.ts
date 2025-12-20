/**
 * 2FA 有効化 API
 * POST /api/admin/2fa/enable
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import {
  generateSecret,
  generateQRCode,
  generateBackupCodes,
  hashBackupCodes,
  encryptSecret,
} from '@/lib/security/2fa';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    console.error('[ADMIN 2FA ENABLE API] CSRF validation failed');
    return csrfErrorResponse();
  }
  console.log('[2FA Enable] ========== API Called ==========');
  console.log('[2FA Enable] Method:', request.method);
  console.log('[2FA Enable] URL:', request.url);

  try {
    // Cookieを直接取得（デバッグ用）
    const cookieHeader = request.headers.get('cookie');
    console.log('[2FA Enable] Cookie header:', cookieHeader);

    // 認証チェック - requestオブジェクトから直接トークンを取得
    console.log('[2FA Enable] Getting session...');
    const token = request.cookies.get('super_admin_token')?.value;
    console.log('[2FA Enable] Direct token from request:', token ? 'exists' : 'not found');

    // tokenを直接検証
    let session = null;
    if (token) {
      const { verifySuperAdminToken } = await import('@/lib/auth/super-admin');
      session = await verifySuperAdminToken(token);
      console.log('[2FA Enable] Token verification result:', session ? 'verified' : 'failed');
    }

    console.log('[2FA Enable] Session check:', session ? 'OK' : 'NG');
    console.log('[2FA Enable] Session data:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('[2FA Enable] No session found - returning 401');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // サービスロールキーを使用してSupabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // スーパーアドミン情報を取得
    console.log('[2FA Enable] Fetching admin with ID:', session.id);
    const { data: adminData, error: authError } = await supabase
      .from('super_admins')
      .select('id, email, two_factor_enabled')
      .eq('id', session.id)
      .single();

    console.log('[2FA Enable] Query result:', {
      adminData: JSON.stringify(adminData, null, 2),
      authError: authError ? JSON.stringify(authError, null, 2) : null
    });

    if (authError || !adminData) {
      console.error('[2FA Enable] Auth failed - error:', authError, 'data:', adminData);
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // 既に2FAが有効化されているかチェック
    if (adminData.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FAは既に有効化されています' },
        { status: 400 }
      );
    }

    // 2FAシークレットを生成
    const { secret, otpauth_url } = generateSecret(adminData.email);

    // QRコードを生成
    const qrCodeDataUrl = await generateQRCode(otpauth_url!);

    // バックアップコードを生成（10個）
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // シークレットを暗号化
    const encryptionKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('暗号化キーが設定されていません');
    }

    const encryptedSecret = encryptSecret(secret!, encryptionKey);

    // データベースに一時保存（まだ有効化はしない）
    const { error: updateError } = await supabase
      .from('super_admins')
      .update({
        two_factor_secret: encryptedSecret,
        backup_codes: hashedBackupCodes,
        backup_codes_used: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminData.id);

    if (updateError) {
      console.error('2FAシークレット保存エラー:', updateError);
      return NextResponse.json(
        { error: '2FAの設定に失敗しました' },
        { status: 500 }
      );
    }

    // 操作ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: adminData.id,
      action: '2FA設定開始',
      details: { email: adminData.email },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      secret: secret, // ユーザーが手動入力する場合のために返す
      backupCodes, // プレーンテキストで返す（初回のみ）
    });
  } catch (error) {
    console.error('2FA有効化エラー:', error);
    return NextResponse.json(
      { error: '2FAの有効化に失敗しました' },
      { status: 500 }
    );
  }
}
