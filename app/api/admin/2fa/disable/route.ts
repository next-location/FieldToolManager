/**
 * 2FA 無効化 API
 * POST /api/admin/2fa/disable
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken, decryptSecret, verifyBackupCode } from '@/lib/security/2fa';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { token, backupCode } = await request.json();

    // バリデーション - 通常のトークンかバックアップコードのいずれかが必要
    if (!token && !backupCode) {
      return NextResponse.json(
        { error: 'トークンまたはバックアップコードを入力してください' },
        { status: 400 }
      );
    }

    if (token && !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: '無効なトークン形式です（6桁の数字を入力してください）' },
        { status: 400 }
      );
    }

    // 認証チェック - requestオブジェクトから直接トークンを取得
    const adminToken = request.cookies.get('super_admin_token')?.value;
    if (!adminToken) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // tokenを検証
    const { verifySuperAdminToken } = await import('@/lib/auth/super-admin');
    const session = await verifySuperAdminToken(adminToken);

    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // スーパーアドミン情報を取得
    const { data: adminData, error: authError } = await supabase
      .from('super_admins')
      .select('id, email, two_factor_enabled, two_factor_secret, backup_codes')
      .eq('id', session.id)
      .single();

    if (authError || !adminData) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // 2FAが有効化されているかチェック
    if (!adminData.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FAは有効化されていません' },
        { status: 400 }
      );
    }

    let isValid = false;
    let usedBackupCode = false;
    let backupCodeIndex = -1;

    // トークンが提供された場合、通常の2FAトークンを検証
    if (token) {
      // シークレットを復号化
      const encryptionKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('暗号化キーが設定されていません');
      }

      const decryptedSecret = decryptSecret(
        adminData.two_factor_secret,
        encryptionKey
      );

      // TOTPトークンを検証
      isValid = verifyToken(decryptedSecret, token);
    }

    // バックアップコードが提供された場合
    if (!isValid && backupCode) {
      const result = await verifyBackupCode(backupCode, adminData.backup_codes || []);
      isValid = result.valid;
      usedBackupCode = result.valid;
      backupCodeIndex = result.codeIndex;
    }

    if (!isValid) {
      // 操作ログを記録（失敗）
      await supabase.from('super_admin_logs').insert({
        super_admin_id: adminData.id,
        action: '2FA無効化失敗',
        details: {
          email: adminData.email,
          reason: 'invalid_token',
          attempted_with: token ? 'totp' : 'backup_code'
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        { error: 'トークンが正しくありません' },
        { status: 400 }
      );
    }

    // 2FAを無効化（シークレットとバックアップコードをクリア）
    const { error: updateError } = await supabase
      .from('super_admins')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: [],
        backup_codes_used: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminData.id);

    if (updateError) {
      console.error('2FA無効化エラー:', updateError);
      return NextResponse.json(
        { error: '2FAの無効化に失敗しました' },
        { status: 500 }
      );
    }

    // 操作ログを記録（成功）
    await supabase.from('super_admin_logs').insert({
      super_admin_id: adminData.id,
      action: '2FA無効化',
      details: {
        email: adminData.email,
        method: usedBackupCode ? 'backup_code' : 'totp'
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: '2FAが正常に無効化されました',
    });
  } catch (error) {
    console.error('2FA無効化エラー:', error);
    return NextResponse.json(
      { error: '2FAの無効化に失敗しました' },
      { status: 500 }
    );
  }
}
