/**
 * 取引先ユーザー用2FA有効化API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcrypt';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// バックアップコードを生成
function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

export async function POST(request: NextRequest) {
  try {
    // Supabase認証を使用
    const supabase = await createClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // リクエストボディから認証方式とメールアドレスを取得
    const body = await request.json();
    const { method = 'totp', email: twoFactorEmail } = body;

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, two_factor_enabled')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 既に2FAが有効な場合
    if (user.two_factor_enabled) {
      return NextResponse.json({ error: '2FAは既に有効化されています' }, { status: 400 });
    }

    const jwt = await import('jsonwebtoken');

    if (method === 'email') {
      // メール方式の場合
      if (!twoFactorEmail) {
        return NextResponse.json({ error: '2FA用のメールアドレスが必要です' }, { status: 400 });
      }

      if (twoFactorEmail === user.email) {
        return NextResponse.json({ error: 'ログインメールアドレスとは異なるメールアドレスを指定してください' }, { status: 400 });
      }

      // 6桁の認証コードを生成
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // two_factor_tokensテーブルに保存
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分後
      await supabaseAdmin
        .from('two_factor_tokens')
        .insert({
          user_id: user.id,
          token: verificationCode,
          type: 'email',
          expires_at: expiresAt.toISOString(),
        });

      // メール送信
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY!);

      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: twoFactorEmail,
        subject: '【ザイロク】二要素認証の設定',
        html: `
          <h2>二要素認証の設定</h2>
          <p>以下の認証コードを入力して、二要素認証の設定を完了してください：</p>
          <h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${verificationCode}</h1>
          <p>このコードは10分間有効です。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
        `,
      });

      // 一時データをトークンに保存
      const tempData = {
        userId: user.id,
        method: 'email',
        email: twoFactorEmail,
        timestamp: Date.now()
      };

      const tempToken = jwt.sign(tempData, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { expiresIn: '10m' });

      return NextResponse.json({
        tempToken,
        message: `${twoFactorEmail}に認証コードを送信しました`
      });

    } else {
      // TOTP方式（既存のコード）
      // TOTP秘密鍵を生成
      const secret = speakeasy.generateSecret({
        name: `ザイロク (${user.email})`,
        issuer: 'ザイロク',
        length: 32,
      });

      // QRコードを生成
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // バックアップコードを生成
      const backupCodes = generateBackupCodes();

      // バックアップコードをハッシュ化
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => bcrypt.hash(code, 10))
      );

      // セッションに一時的に保存（検証まで確定しない）
      const tempData = {
        userId: user.id,
        method: 'totp',
        secret: secret.base32,
        hashedBackupCodes,
        timestamp: Date.now()
      };

      // 一時データをトークンに保存
      const tempToken = jwt.sign(tempData, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { expiresIn: '10m' });

      return NextResponse.json({
        qrCode: qrCodeUrl,
        secret: secret.base32,
        backupCodes,
        tempToken,
        message: 'QRコードをスキャンして、6桁のコードを入力してください'
      });
    }
  } catch (error: any) {
    console.error('2FA enable error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}