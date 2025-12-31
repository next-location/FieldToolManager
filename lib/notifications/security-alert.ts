/**
 * セキュリティ警告通知ユーティリティ
 */

import { Resend } from 'resend';
import { getGeoIPInfo } from '@/lib/security/geoip';

interface SecurityAlertParams {
  type: 'login_failure' | 'foreign_ip' | '2fa_failure';
  email?: string;
  ipAddress: string;
  userAgent: string;
  details?: string;
  timestamp?: Date;
}

/**
 * セキュリティ警告をsystem@zairoku.comに送信
 */
export async function sendSecurityAlert(params: SecurityAlertParams) {
  const { type, email, ipAddress, userAgent, details, timestamp = new Date() } = params;

  try {
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (!resend) {
      console.error('[Security Alert] Resend API key not configured');
      return false;
    }

    const warningType = getWarningType(type);
    const location = await getLocationFromIP(ipAddress);

    await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: 'system@zairoku.com',
      subject: '【重要】ザイロク管理者アカウントへの不正アクセスの可能性',
      html: `
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #991b1b; margin: 0 0 8px 0;">🚨 セキュリティ警告</h2>
          <p style="margin: 0; color: #991b1b;">不審なアクティビティが検出されました。</p>
        </div>

        <h3>■ 警告内容</h3>
        <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; width: 150px;">種類</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${warningType}</td>
          </tr>
          ${email ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">対象アカウント</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${email}</td>
          </tr>
          ` : ''}
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
          ${details ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600;">詳細</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${details}</td>
          </tr>
          ` : ''}
        </table>

        <h3>■ 推奨対応</h3>
        <ol style="color: #374151; line-height: 1.6;">
          <li>すぐにパスワードを変更してください</li>
          <li>2FAが無効の場合は有効化してください</li>
          <li>不明なログイン履歴がないか確認してください</li>
          <li>必要に応じてセッションをすべてログアウトしてください</li>
        </ol>

        <p style="margin-top: 24px;">
          管理画面ログイン: <a href="https://zairoku.com/admin/login" style="color: #2563eb;">https://zairoku.com/admin/login</a><br>
          操作ログ確認: <a href="https://zairoku.com/admin/logs" style="color: #2563eb;">https://zairoku.com/admin/logs</a>
        </p>
      `,
    });

    console.log('[Security Alert] Sent successfully to system@zairoku.com');
    return true;
  } catch (error) {
    console.error('[Security Alert] Failed to send:', error);
    return false;
  }
}

function getWarningType(type: string): string {
  switch (type) {
    case 'login_failure':
      return 'ログイン失敗5回連続';
    case 'foreign_ip':
      return '日本国外からのアクセス';
    case '2fa_failure':
      return '2FA認証失敗';
    default:
      return '不明な警告';
  }
}

async function getLocationFromIP(ip: string): Promise<string> {
  const geoInfo = await getGeoIPInfo(ip);

  if (geoInfo.country === 'UNKNOWN') {
    return '不明';
  }

  // 国名、地域、都市を表示
  const parts: string[] = [geoInfo.countryName];
  if (geoInfo.region) {
    parts.push(geoInfo.region);
  }
  if (geoInfo.city) {
    parts.push(geoInfo.city);
  }

  return parts.join(' - ');
}
