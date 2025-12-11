import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendWelcomeEmailParams {
  toEmail: string;
  adminName: string;
  organizationName: string;
  subdomain: string;
  loginUrl: string;
  password: string;
}

/**
 * ウェルカムメールを送信
 * 契約完了時に初期管理者に送信されます
 */
export async function sendWelcomeEmail({
  toEmail,
  adminName,
  organizationName,
  subdomain,
  loginUrl,
  password,
}: SendWelcomeEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Field Tool Manager <noreply@fieldtoolmanager.com>',
      to: toEmail,
      subject: `【Field Tool Manager】アカウントが作成されました`,
      html: `
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
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Field Tool Manager</h1>
      <p style="margin: 10px 0 0; color: #E3F2FD; font-size: 14px;">現場管理をもっとスマートに</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #333333; font-size: 22px;">アカウントが作成されました</h2>

      <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.6;">
        ${adminName} 様
      </p>

      <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
        <strong>${organizationName}</strong> のField Tool Manager アカウントが正常に作成されました。<br>
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
          <strong style="color: #333333; font-size: 14px; display: block; margin-bottom: 5px;">初期パスワード</strong>
          <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px;">${password}</code>
        </div>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 0 0 30px; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
          <strong>🔒 セキュリティのお知らせ</strong><br>
          初回ログイン時にパスワードの変更を求められます。<br>
          安全性の高いパスワードに変更してください。
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 0 0 30px;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1E6FFF 0%, #1557D0 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 8px rgba(30, 111, 255, 0.3);">
          ログインして始める
        </a>
      </div>

      <!-- Help -->
      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px;">
        <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        <p style="margin: 0; color: #999999; font-size: 13px;">
          サポート: <a href="mailto:support@fieldtoolmanager.com" style="color: #1E6FFF; text-decoration: none;">support@fieldtoolmanager.com</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0 0 5px; color: #999999; font-size: 12px;">
        © 2025 Field Tool Manager. All rights reserved.
      </p>
      <p style="margin: 0; color: #999999; font-size: 12px;">
        このメールに心当たりがない場合は、お手数ですが削除してください。
      </p>
    </div>

  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Welcome Email] Error sending email:', error);
      throw error;
    }

    console.log('[Welcome Email] Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Welcome Email] Failed to send:', error);
    throw error;
  }
}
