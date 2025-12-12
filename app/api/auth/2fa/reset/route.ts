/**
 * 2FAリセット実行API
 * POST /api/auth/2fa/reset
 *
 * トークンを検証して2FAをリセット
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // バリデーション
    if (!token) {
      return NextResponse.json(
        { error: 'リセットトークンが必要です' },
        { status: 400 }
      );
    }

    // トークンをハッシュ化
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // トークンを検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('two_factor_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', hashedToken)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: '無効なリセットトークンです' },
        { status: 400 }
      );
    }

    // トークンが使用済みかチェック
    if (tokenData.used) {
      return NextResponse.json(
        { error: 'このリセットトークンは既に使用されています' },
        { status: 400 }
      );
    }

    // トークンの有効期限をチェック
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'リセットトークンの有効期限が切れています' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 2FAをリセット
    const { error: resetError } = await supabase
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: [],
        backup_codes_used: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id);

    if (resetError) {
      console.error('Failed to reset 2FA:', resetError);
      return NextResponse.json(
        { error: '2FAのリセットに失敗しました' },
        { status: 500 }
      );
    }

    // トークンを使用済みにする
    await supabase
      .from('two_factor_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    // リセットログを記録
    await supabase
      .from('two_factor_reset_logs')
      .insert({
        user_id: userData.id,
        reset_type: 'self',
        reset_reason: 'Reset via email token',
        token_id: tokenData.id,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    // 通知メールを送信（オプション）
    try {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: userData.email,
        subject: '【ザイロク】2FAがリセットされました',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>2FA（二要素認証）がリセットされました</h2>
            <p>${userData.name} 様</p>
            <p>あなたのアカウントの2FA（二要素認証）がリセットされました。</p>
            <p>再度2FAを有効にするには、設定画面から設定してください。</p>
            <p>もしこの操作に心当たりがない場合は、すぐに管理者にご連絡ください。</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
            <p style="color: #666; font-size: 12px;">
              ザイロク - 現場の道具管理システム
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: '2FAが正常にリセットされました。再度ログインしてください。',
      user: {
        email: userData.email,
        name: userData.name
      }
    });

  } catch (error) {
    console.error('2FA reset error:', error);
    return NextResponse.json(
      { error: '2FAリセットの処理に失敗しました' },
      { status: 500 }
    );
  }
}