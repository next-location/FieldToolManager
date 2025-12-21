/**
 * ログイン時の2FA検証API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    console.error('[2FA VERIFY API] CSRF validation failed');
    return csrfErrorResponse();
  }

  try {
    const { userId, code, method } = await request.json();

    if (!userId || !code) {
      return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, two_factor_enabled, two_factor_secret, backup_codes, backup_codes_used')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (!user.two_factor_enabled) {
      return NextResponse.json({ error: '2FAが有効化されていません' }, { status: 400 });
    }

    let verified = false;

    if (method === 'email') {
      // メール認証コードの検証
      const { data: tokenData, error: tokenError } = await supabase
        .from('two_factor_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('token', code)
        .eq('type', 'email')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!tokenError && tokenData) {
        verified = true;
        // 使用済みトークンを削除
        await supabase
          .from('two_factor_tokens')
          .delete()
          .eq('id', tokenData.id);
      }
    } else {
      // TOTPまたはバックアップコードの検証
      if (code.length === 6) {
        // TOTPコードの検証
        if (user.two_factor_secret) {
          verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 2,
          });
        }
      } else if (code.length === 8) {
        // バックアップコードの検証
        if (user.backup_codes && user.backup_codes.length > 0) {
          for (const hashedCode of user.backup_codes) {
            const isMatch = await bcrypt.compare(code.toUpperCase(), hashedCode);
            if (isMatch) {
              verified = true;
              // 使用済みバックアップコードを記録
              await supabase
                .from('users')
                .update({
                  backup_codes_used: [...(user.backup_codes_used || []), hashedCode]
                })
                .eq('id', userId);
              break;
            }
          }
        }
      }
    }

    if (!verified) {
      return NextResponse.json({ error: '認証コードが正しくありません' }, { status: 401 });
    }

    // 最終ログイン時刻を更新
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      message: '2FA認証に成功しました',
    });
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}