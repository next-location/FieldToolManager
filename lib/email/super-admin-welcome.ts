import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

interface SendSuperAdminWelcomeEmailParams {
  toEmail: string;
  adminName: string;
  password: string;
}

// Supabaseクライアント（ログ記録用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * メール送信ログを記録
 */
async function logEmailSent(params: {
  emailType: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  provider: string;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await supabase.from('email_logs').insert({
      email_type: params.emailType,
      to_email: params.toEmail,
      from_email: params.fromEmail,
      subject: params.subject,
      provider: params.provider,
      success: params.success,
      error_message: params.errorMessage || null,
    });
  } catch (error) {
    console.error('[Email Log] Failed to log email:', error);
    // ログ記録失敗は無視（メール送信自体は成功している）
  }
}

/**
 * メールHTMLテンプレート
 */
function getEmailHtml(params: SendSuperAdminWelcomeEmailParams): string {
  const { adminName, toEmail, password } = params;
  const loginUrl = 'https://zairoku.com/admin/login';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1E6FFF 0%, #1557D0 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">ザイロク</h1>
      <p style="margin: 10px 0 0; color: #E3F2FD; font-size: 14px;">管理者アカウント</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #333333; font-size: 22px;">管理者アカウントが作成されました</h2>

      <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.6;">
        ${adminName} 様
      </p>

      <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
        ザイロクの管理者アカウントが作成されました。<br>
        以下の情報でログインしてください。
      </p>

      <!-- Login Info Box -->
      <div style="background-color: #f8f9fa; border-left: 4px solid #1E6FFF; padding: 20px; margin: 0 0 30px; border-radius: 4px;">
        <div style="margin: 0 0 15px;">
          <strong style="color: #333333; font-size: 14px; display: block; margin-bottom: 5px;">ログインURL</strong>
          <a href="${loginUrl}" style="color: #1E6FFF; text-decoration: none; font-size: 14px; word-break: break-all;">${loginUrl}</a>
        </div>

        <div style="margin: 0 0 15px;">
          <strong style="color: #333333; font-size: 14px; display: block; margin-bottom: 5px;">メールアドレス</strong>
          <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px;">${toEmail}</code>
        </div>

        <div style="margin: 0;">
          <strong style="color: #333333; font-size: 14px; display: block; margin-bottom: 5px;">パスワード</strong>
          <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px;">${password}</code>
        </div>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 0 0 30px; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
          <strong>🔒 セキュリティのお知らせ</strong><br>
          このパスワードは大切に保管してください。<br>
          セキュリティのため、定期的なパスワード変更をお勧めします。
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 0 0 30px;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1E6FFF 0%, #1557D0 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 8px rgba(30, 111, 255, 0.3);">
          管理画面にログイン
        </a>
      </div>

      <!-- Help -->
      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
        <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 0; color: #999999; font-size: 13px;">
          サポート: <a href="mailto:support@zairoku.com" style="color: #1E6FFF; text-decoration: none;">support@zairoku.com</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0 0 5px; color: #999999; font-size: 12px;">
        © 2025 ザイロク. All rights reserved.
      </p>
      <p style="margin: 0; color: #999999; font-size: 12px;">
        このメールに心当たりがない場合は、お手数ですが削除してください。
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Super Admin ウェルカムメールを送信
 * Super Admin作成時に送信されます
 *
 * 環境変数に応じて送信方法を切り替えます：
 * - RESEND_API_KEY: Resend（本番環境）
 * - SMTP_HOST: Nodemailer/SMTP（開発環境・Mailhog）
 */
export async function sendSuperAdminWelcomeEmail(params: SendSuperAdminWelcomeEmailParams) {
  const { toEmail, adminName } = params;
  const subject = `【ザイロク】管理者アカウントが作成されました`;
  const html = getEmailHtml(params);

  // 環境に応じた送信元メールアドレスを決定
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
  let fromEmail: string;

  if (baseDomain === 'zairoku.com') {
    fromEmail = 'ザイロク <noreply@zairoku.com>';
  } else if (baseDomain === 'test-zairoku.com') {
    fromEmail = 'ザイロク（テスト環境） <noreply@test-zairoku.com>';
  } else {
    fromEmail = 'ザイロク（開発環境） <noreply@localhost>';
  }

  // Resendを使用（本番環境）
  if (process.env.RESEND_API_KEY) {
    console.log('[SuperAdmin Welcome Email] Using Resend for email delivery');
    console.log('[SuperAdmin Welcome Email] From:', fromEmail);
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    try {
      if (!resend) {
        console.warn("Resend API is not configured. Skipping email send.");
        return { success: false, error: "Email service not configured" };
      }
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject,
        html,
      });

      if (error) {
        console.error('[SuperAdmin Welcome Email] Resend error:', error);
        // エラーログを記録
        await logEmailSent({
          emailType: 'super_admin_welcome',
          toEmail,
          fromEmail,
          subject,
          provider: 'resend',
          success: false,
          errorMessage: error.message || 'Unknown error',
        });
        throw error;
      }

      console.log('[SuperAdmin Welcome Email] Email sent successfully via Resend:', data);

      // 成功ログを記録
      await logEmailSent({
        emailType: 'super_admin_welcome',
        toEmail,
        fromEmail,
        subject,
        provider: 'resend',
        success: true,
      });

      return { success: true, provider: 'resend', data };
    } catch (error: any) {
      console.error('[SuperAdmin Welcome Email] Failed to send via Resend:', error);
      // エラーログを記録
      await logEmailSent({
        emailType: 'super_admin_welcome',
        toEmail,
        fromEmail,
        subject,
        provider: 'resend',
        success: false,
        errorMessage: error?.message || 'Unknown error',
      });
      throw error;
    }
  }

  // Nodemailer/SMTP を使用（開発環境・Mailhog）
  if (process.env.SMTP_HOST) {
    console.log('[SuperAdmin Welcome Email] Using Nodemailer/SMTP for email delivery');
    console.log('[SuperAdmin Welcome Email] From:', fromEmail);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false, // Mailhogはsecure不要
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD || '',
          }
        : undefined,
    });

    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || fromEmail,
        to: toEmail,
        subject,
        html,
      });

      console.log('[SuperAdmin Welcome Email] Email sent successfully via SMTP:', info.messageId);
      console.log('[SuperAdmin Welcome Email] Preview URL (Mailhog):', `http://localhost:8025`);

      // 成功ログを記録
      await logEmailSent({
        emailType: 'super_admin_welcome',
        toEmail,
        fromEmail: process.env.SMTP_FROM || fromEmail,
        subject,
        provider: 'smtp',
        success: true,
      });

      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error: any) {
      console.error('[SuperAdmin Welcome Email] Failed to send via SMTP:', error);

      // エラーログを記録
      await logEmailSent({
        emailType: 'super_admin_welcome',
        toEmail,
        fromEmail: process.env.SMTP_FROM || fromEmail,
        subject,
        provider: 'smtp',
        success: false,
        errorMessage: error?.message || 'Unknown error',
      });

      throw error;
    }
  }

  // どちらも設定されていない場合
  console.warn('[SuperAdmin Welcome Email] No email provider configured (RESEND_API_KEY or SMTP_HOST)');
  throw new Error('No email provider configured. Please set RESEND_API_KEY or SMTP_HOST.');
}