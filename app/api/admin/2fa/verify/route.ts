/**
 * 2FA 検証 API（セットアップ時の確認）
 * POST /api/admin/2fa/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { verifyToken, decryptSecret } from '@/lib/security/2fa';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // バリデーション
    if (!token || !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: '無効なトークン形式です（6桁の数字を入力してください）' },
        { status: 400 }
      );
    }

    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // スーパーアドミン情報を取得
    const { data: adminData, error: authError } = await supabase
      .from('super_admins')
      .select('id, email, two_factor_enabled, two_factor_secret')
      .eq('id', session.id)
      .single();

    if (authError || !adminData) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // シークレットの存在確認
    if (!adminData.two_factor_secret) {
      return NextResponse.json(
        { error: '2FAのセットアップが開始されていません' },
        { status: 400 }
      );
    }

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
    const isValid = verifyToken(decryptedSecret, token);

    if (!isValid) {
      // 操作ログを記録（失敗）
      await supabase.from('super_admin_logs').insert({
        super_admin_id: adminData.id,
        action: '2FA検証失敗',
        details: { email: adminData.email },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        { error: 'トークンが正しくありません' },
        { status: 400 }
      );
    }

    // 2FAを有効化
    const { error: updateError } = await supabase
      .from('super_admins')
      .update({
        two_factor_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminData.id);

    if (updateError) {
      console.error('2FA有効化エラー:', updateError);
      return NextResponse.json(
        { error: '2FAの有効化に失敗しました' },
        { status: 500 }
      );
    }

    // 操作ログを記録（成功）
    await supabase.from('super_admin_logs').insert({
      super_admin_id: adminData.id,
      action: '2FA有効化',
      details: { email: adminData.email },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: '2FAが正常に有効化されました',
    });
  } catch (error) {
    console.error('2FA検証エラー:', error);
    return NextResponse.json(
      { error: '2FAの検証に失敗しました' },
      { status: 500 }
    );
  }
}
