/**
 * 営業アカウントのパスワードリセットAPI
 * POST /api/admin/super-admins/[id]/reset-password
 *
 * オーナーアカウント（role=owner）のみが営業アカウント（role=sales）のパスワードをリセット可能
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF検証
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    return csrfErrorResponse();
  }

  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // オーナーアカウントかチェック
    const { data: executor } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single();

    if (!executor || executor.role !== 'owner') {
      return NextResponse.json(
        { error: 'この操作はオーナーアカウントのみ実行できます' },
        { status: 403 }
      );
    }

    const { id: targetId } = await params;

    // 対象アカウントを取得
    const { data: targetAdmin, error: fetchError } = await supabase
      .from('super_admins')
      .select('id, email, name, role')
      .eq('id', targetId)
      .single();

    if (fetchError || !targetAdmin) {
      return NextResponse.json(
        { error: '対象のアカウントが見つかりません' },
        { status: 404 }
      );
    }

    // 営業アカウント（role=sales）のみリセット可能
    if (targetAdmin.role !== 'sales') {
      return NextResponse.json(
        { error: '営業アカウント以外はリセットできません' },
        { status: 403 }
      );
    }

    // 16文字のランダムパスワード生成（大小英数字記号）
    const tempPassword = generateSecurePassword(16);

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // パスワードを更新
    const { error: updateError } = await supabase
      .from('super_admins')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      console.error('Failed to reset password:', updateError);
      return NextResponse.json(
        { error: 'パスワードのリセットに失敗しました' },
        { status: 500 }
      );
    }

    // 対象アカウントにメール送信
    const { Resend } = await import('resend');
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (resend) {
      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: targetAdmin.email,
        subject: '【ザイロク】パスワードがリセットされました',
        html: `
          <h2>パスワードリセット通知</h2>
          <p>${targetAdmin.name} 様</p>

          <p>管理者によってパスワードがリセットされました。</p>

          <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af;">仮パスワード</h3>
            <p style="font-family: monospace; font-size: 18px; font-weight: bold; margin: 0; color: #1e3a8a;">
              ${tempPassword}
            </p>
          </div>

          <p style="color: #dc2626; font-weight: bold;">
            ⚠️ このパスワードは一時的なものです。
          </p>

          <h3>次のステップ</h3>
          <ol style="line-height: 1.6;">
            <li>上記の仮パスワードでログインしてください</li>
            <li>ログイン後、すぐに新しいパスワードに変更してください</li>
            <li>仮パスワードは第三者に知られないよう注意してください</li>
          </ol>

          <p>
            ログイン画面: <a href="https://zairoku.com/admin/login" style="color: #2563eb;">https://zairoku.com/admin/login</a>
          </p>
        `,
      });

      // system@zairoku.comにも通知
      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: 'system@zairoku.com',
        subject: '【ザイロク】営業アカウントのパスワードがリセットされました',
        html: `
          <h2>パスワードリセット通知</h2>

          <p>以下の営業アカウントのパスワードがリセットされました。</p>

          <h3>対象アカウント</h3>
          <ul>
            <li>名前: ${targetAdmin.name}</li>
            <li>メールアドレス: ${targetAdmin.email}</li>
            <li>実行者: ${session.name} (${session.email})</li>
            <li>日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
          </ul>
        `,
      });
    }

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: '営業アカウントパスワードリセット',
      details: {
        target_admin_id: targetId,
        target_email: targetAdmin.email,
        target_name: targetAdmin.name,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'パスワードをリセットしました。仮パスワードをメールで送信しました。',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * セキュアなランダムパスワード生成
 */
function generateSecurePassword(length: number): string {
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 紛らわしい文字を除外（I, O）
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // 紛らわしい文字を除外（l, o）
  const numberChars = '23456789'; // 紛らわしい数字を除外（0, 1）
  const specialChars = '!@#$%^&*-_=+';

  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

  let password = '';

  // 各カテゴリーから最低1文字ずつ含める
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // 残りをランダムに生成
  for (let i = password.length; i < length; i++) {
    const randomIndex = crypto.randomInt(0, allChars.length);
    password += allChars[randomIndex];
  }

  // シャッフル
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
