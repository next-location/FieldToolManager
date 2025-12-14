/**
 * 取引先ユーザー用2FA検証API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import speakeasy from 'speakeasy';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { token, tempToken } = await request.json();

    if (!token || !tempToken) {
      return NextResponse.json({ error: 'トークンが必要です' }, { status: 400 });
    }

    // 一時トークンを検証
    const jwt = await import('jsonwebtoken');
    let tempData;
    try {
      tempData = jwt.verify(tempToken, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any;
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ error: '一時トークンが無効です' }, { status: 401 });
    }

    const method = tempData.method || 'totp';

    if (method === 'email') {
      // メール方式の検証
      // two_factor_tokensテーブルから有効なトークンを検索
      const { data: tokenData, error: tokenError } = await supabase
        .from('two_factor_tokens')
        .select('*')
        .eq('user_id', tempData.userId)
        .eq('token', token)
        .eq('type', 'email')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json({ error: '認証コードが正しくないか、有効期限が切れています' }, { status: 401 });
      }

      // 使用済みトークンを削除
      await supabase
        .from('two_factor_tokens')
        .delete()
        .eq('id', tokenData.id);

      // 2FAを有効化してデータベースに保存
      const { error: updateError } = await supabase
        .from('users')
        .update({
          two_factor_enabled: true,
          two_factor_method: 'email',
          two_factor_email: tempData.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tempData.userId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '2FA有効化に失敗しました' }, { status: 500 });
      }

      // 監査ログを記録
      await supabase
        .from('audit_logs')
        .insert({
          user_id: tempData.userId,
          action: 'ENABLE_2FA',
          resource_type: 'user_settings',
          resource_id: tempData.userId,
          details: {
            method: 'email',
            email: tempData.email,
            timestamp: new Date().toISOString(),
          },
        });

    } else {
      // TOTP方式の検証
      const verified = speakeasy.totp.verify({
        secret: tempData.secret,
        encoding: 'base32',
        token: token,
        window: 2,
      });

      if (!verified) {
        return NextResponse.json({ error: '認証コードが正しくありません' }, { status: 401 });
      }

      // 2FAを有効化してデータベースに保存
      const { error: updateError } = await supabase
        .from('users')
        .update({
          two_factor_enabled: true,
          two_factor_method: 'totp',
          two_factor_secret: tempData.secret,
          backup_codes: tempData.hashedBackupCodes,
          backup_codes_used: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', tempData.userId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: '2FA有効化に失敗しました' }, { status: 500 });
      }

      // 監査ログを記録
      await supabase
        .from('audit_logs')
        .insert({
          user_id: tempData.userId,
          action: 'ENABLE_2FA',
          resource_type: 'user_settings',
          resource_id: tempData.userId,
          details: {
            method: 'totp',
            timestamp: new Date().toISOString(),
          },
        });
    }

    return NextResponse.json({
      success: true,
      message: '2FAを有効化しました',
    });
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}