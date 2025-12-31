/**
 * スーパー管理者ログイン通知ユーティリティ
 */

interface LoginNotificationParams {
  email: string;
  name: string;
  ipAddress: string;
  userAgent: string;
  timestamp?: Date;
}

/**
 * ログイン成功通知をsystem@zairoku.comに送信
 */
export async function sendLoginNotification(params: LoginNotificationParams) {
  const { email, name, ipAddress, userAgent, timestamp = new Date() } = params;

  try {
    const { Resend } = await import('resend');
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (!resend) {
      console.error('[Login Notification] Resend API key not configured');
      return false;
    }

    // IPから場所を推定（簡易版）
    const location = await getLocationFromIP(ipAddress);

    await resend.emails.send({
      from: 'ザイロク <noreply@fieldtool.com>',
      to: 'system@zairoku.com',
      subject: '【ザイロク】管理者アカウントへのログインがありました',
      html: `
        <h2>管理者ログイン通知</h2>
        <p>以下の管理者アカウントにログインがありました。</p>

        <h3>■ ログイン情報</h3>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">アカウント</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${email} (${name})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">日時</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${timestamp.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">IPアドレス</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">場所</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">ブラウザ</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${userAgent}</td>
          </tr>
        </table>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>⚠️ 心当たりがない場合</strong><br>
            すぐにパスワードを変更し、2FAが有効になっているか確認してください。
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          管理画面: <a href="https://zairoku.com/admin/logs" style="color: #2563eb;">https://zairoku.com/admin/logs</a>
        </p>
      `,
    });

    console.log('[Login Notification] Sent successfully to system@zairoku.com');
    return true;
  } catch (error) {
    console.error('[Login Notification] Failed to send:', error);
    return false;
  }
}

/**
 * IPアドレスから場所を推定
 * TODO: MaxMind GeoIP2実装後に置き換え
 */
async function getLocationFromIP(ip: string): Promise<string> {
  // ローカルIPの場合
  if (ip === 'unknown' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1' || ip === '127.0.0.1') {
    return '不明（ローカルネットワーク）';
  }

  // TODO: MaxMind GeoIP2実装
  // 現状は簡易的に「日本」を返す
  return '日本（詳細不明）';
}
