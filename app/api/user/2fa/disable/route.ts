/**
 * 取引先ユーザー用2FA無効化API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { token, backupCode } = await request.json();

    if (!token && !backupCode) {
      return NextResponse.json({ error: 'トークンまたはバックアップコードが必要です' }, { status: 400 });
    }

    // セッション確認
    const cookieStore = await cookies();
    const userToken = cookieStore.get('user_token')?.value;

    if (!userToken) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const jwt = await import('jsonwebtoken');
    let userSession;
    try {
      userSession = jwt.verify(userToken, process.env.JWT_SECRET!) as any;
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, two_factor_enabled, two_factor_secret, backup_codes')
      .eq('id', userSession.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (!user.two_factor_enabled) {
      return NextResponse.json({ error: '2FAは有効化されていません' }, { status: 400 });
    }

    let verified = false;

    // TOTPトークンでの検証
    if (token && user.two_factor_secret) {
      verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2,
      });
    }

    // バックアップコードでの検証
    if (!verified && backupCode && user.backup_codes) {
      for (const hashedCode of user.backup_codes) {
        const isMatch = await bcrypt.compare(backupCode.toUpperCase(), hashedCode);
        if (isMatch) {
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    // 2FAを無効化
    const { error: updateError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: [],
        backup_codes_used: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: '2FA無効化に失敗しました' }, { status: 500 });
    }

    // 監査ログを記録
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'DISABLE_2FA',
        resource_type: 'user_settings',
        resource_id: user.id,
        details: {
          method: token ? 'totp' : 'backup_code',
          timestamp: new Date().toISOString(),
        },
      });

    return NextResponse.json({
      success: true,
      message: '2FAを無効化しました',
    });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}