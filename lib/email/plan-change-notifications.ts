/**
 * プラン変更通知メール送信関数
 *
 * 通知タイミング:
 * 1. 請求日20日前: 初回警告（ユーザー数超過の場合）
 * 2. 切り替え3日前: 直前警告
 * 3. 切り替え日: プラン切り替え完了通知
 * 4. 猶予期間中（1-3日目）: 毎日警告
 * 5. 猶予期限翌日: 自動無効化完了通知
 */

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface PlanChangeWarningEmailParams {
  to: string;
  organizationName: string;
  effectiveDate: string; // YYYY-MM-DD
  currentPlan: string;
  newPlan: string;
  currentUserLimit: number;
  newUserLimit: number;
  currentUserCount: number;
  excessCount: number;
  graceDeadline: string; // YYYY-MM-DD
  daysRemaining?: number; // 猶予残日数
}

/**
 * 初回警告メール（請求書送信時）
 */
export async function sendInitialPlanChangeWarning(params: PlanChangeWarningEmailParams) {
  if (!resend) {
    console.error('[Email] Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `【重要】プラン変更に伴うユーザー数調整のお願い - ${params.organizationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .info-table td:first-child { font-weight: bold; width: 40%; background-color: #f9fafb; }
    .action-required { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ プラン変更通知</h1>
    </div>
    <div class="content">
      <p>ザイロクをご利用いただき、ありがとうございます。</p>

      <p>${params.effectiveDate}より、プランが変更されます。</p>

      <table class="info-table">
        <tr>
          <td>現在のプラン</td>
          <td>${params.currentPlan}プラン（上限${params.currentUserLimit}名）</td>
        </tr>
        <tr>
          <td>新しいプラン</td>
          <td>${params.newPlan}プラン（上限${params.newUserLimit}名）</td>
        </tr>
        <tr>
          <td>切り替え日</td>
          <td>${params.effectiveDate}</td>
        </tr>
        <tr>
          <td>現在のユーザー数</td>
          <td><strong style="color: #dc2626;">${params.currentUserCount}名</strong></td>
        </tr>
      </table>

      <div class="action-required">
        <h3 style="margin-top: 0; color: #dc2626;">🚨 対応が必要です</h3>
        <p><strong>現在${params.currentUserCount}名のユーザーが登録されていますが、新プランの上限は${params.newUserLimit}名です。</strong></p>
        <p><strong style="font-size: 18px; color: #dc2626;">${params.excessCount}名を削減してください。</strong></p>
      </div>

      <div class="warning-box">
        <h3 style="margin-top: 0;">📅 重要な日程</h3>
        <ul>
          <li><strong>${params.effectiveDate}</strong>: プラン切り替え日</li>
          <li><strong>${params.effectiveDate} 〜 ${params.graceDeadline}</strong>: 猶予期間（3日間）</li>
          <li><strong>${params.graceDeadline}の翌日</strong>: この日までに削減されない場合、自動的に新しく登録された順に${params.excessCount}名が無効化されます</li>
        </ul>
      </div>

      <h3>対応方法</h3>
      <ol>
        <li>管理画面にログイン</li>
        <li>「スタッフ管理」メニューを開く</li>
        <li>不要なユーザーを${params.excessCount}名削除</li>
      </ol>

      <p style="color: #6b7280; font-size: 14px;">
        ※ ユーザーを削除しても、過去の作業報告書や請求書のデータは保持されます。
      </p>

      <div class="footer">
        <p>このメールはシステムから自動送信されています。</p>
        <p>© 2025 ザイロク (Zairoku). All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: params.to,
      subject,
      html
    });

    console.log('[Email] Initial plan change warning sent:', result);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send initial plan change warning:', error);
    return { success: false, error };
  }
}

/**
 * 切り替え3日前警告メール
 */
export async function sendThreeDaysBeforeWarning(params: PlanChangeWarningEmailParams) {
  if (!resend) {
    console.error('[Email] Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `【3日前】プラン切り替え直前のお知らせ - ${params.organizationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .countdown { background-color: #fee2e2; border: 2px solid #dc2626; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .countdown h2 { color: #dc2626; margin: 0; font-size: 32px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⏰ プラン切り替え3日前</h1>
    </div>
    <div class="content">
      <p>${params.organizationName} 様</p>

      <div class="countdown">
        <p style="margin: 0; font-size: 16px;">プラン切り替えまで</p>
        <h2>あと3日</h2>
      </div>

      <p><strong>${params.effectiveDate}にプランが${params.newPlan}に変更されます。</strong></p>

      <p style="font-size: 18px; color: #dc2626;">
        ⚠️ 現在も${params.currentUserCount}名のユーザーが登録されています。<br>
        新プランの上限${params.newUserLimit}名を${params.excessCount}名超過しています。
      </p>

      <p><strong>至急、${params.excessCount}名を削減してください。</strong></p>

      <p style="background-color: #fef3c7; padding: 15px; border-radius: 4px;">
        ${params.graceDeadline}までに削減されない場合、自動的に新しく登録された順に無効化されます。
      </p>

      <div class="footer">
        <p>© 2025 ザイロク (Zairoku). All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: params.to,
      subject,
      html
    });

    console.log('[Email] Three days before warning sent:', result);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send three days before warning:', error);
    return { success: false, error };
  }
}

/**
 * 猶予期間中の毎日警告メール
 */
export async function sendGracePeriodDailyWarning(params: PlanChangeWarningEmailParams & { daysRemaining: number }) {
  if (!resend) {
    console.error('[Email] Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `【残り${params.daysRemaining}日】ユーザー数削減のお願い - ${params.organizationName}`;

  const urgencyColor = params.daysRemaining === 0 ? '#7f1d1d' : '#dc2626';
  const urgencyMessage = params.daysRemaining === 0
    ? '本日が最終日です！'
    : `残り${params.daysRemaining}日です`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .urgent { background-color: #fee2e2; border: 3px solid ${urgencyColor}; padding: 20px; text-align: center; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🚨 緊急：ユーザー数削減期限</h1>
    </div>
    <div class="content">
      <p>${params.organizationName} 様</p>

      <div class="urgent">
        <h2 style="color: ${urgencyColor}; margin: 0; font-size: 28px;">${urgencyMessage}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px;">自動無効化まで残り${params.daysRemaining}日</p>
      </div>

      <p style="font-size: 18px; color: ${urgencyColor};">
        現在${params.currentUserCount}名のユーザーが登録されていますが、<br>
        新プランの上限は${params.newUserLimit}名です。<br>
        <strong>${params.excessCount}名を削減してください。</strong>
      </p>

      <p style="background-color: #fef3c7; padding: 15px; border-radius: 4px;">
        ${params.graceDeadline}の翌日（明日）、自動的に新しく登録された順に${params.excessCount}名が無効化されます。
      </p>

      <div class="footer">
        <p>© 2025 ザイロク (Zairoku). All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: params.to,
      subject,
      html
    });

    console.log('[Email] Grace period daily warning sent:', result);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send grace period warning:', error);
    return { success: false, error };
  }
}

/**
 * 自動無効化完了通知メール
 */
export async function sendAutoDeactivationNotice(params: {
  to: string;
  organizationName: string;
  deactivatedUsers: Array<{ name: string; email: string }>;
  newUserLimit: number;
}) {
  if (!resend) {
    console.error('[Email] Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `【完了】ユーザー自動無効化のお知らせ - ${params.organizationName}`;

  const userList = params.deactivatedUsers
    .map((user, index) => `<li>${index + 1}. ${user.name} (${user.email})</li>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .user-list { background-color: #f9fafb; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✓ ユーザー自動無効化完了</h1>
    </div>
    <div class="content">
      <p>${params.organizationName} 様</p>

      <p>プラン変更に伴い、以下のユーザーが自動的に無効化されました。</p>

      <div class="user-list">
        <h3 style="margin-top: 0;">無効化されたユーザー（${params.deactivatedUsers.length}名）</h3>
        <ol style="margin: 0; padding-left: 20px;">
          ${userList}
        </ol>
      </div>

      <p><strong>現在のユーザー上限：${params.newUserLimit}名</strong></p>

      <p style="color: #6b7280; font-size: 14px;">
        ※ 無効化されたユーザーはログインできませんが、過去の作業報告書や請求書のデータは保持されます。<br>
        ※ 無効化されたユーザーには個別に通知メールが送信されています。
      </p>

      <div class="footer">
        <p>© 2025 ザイロク (Zairoku). All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: params.to,
      subject,
      html
    });

    console.log('[Email] Auto deactivation notice sent:', result);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send auto deactivation notice:', error);
    return { success: false, error };
  }
}

/**
 * 無効化されたユーザーへの個別通知メール
 */
export async function sendUserDeactivatedNotice(params: {
  to: string;
  userName: string;
  organizationName: string;
  reason: string;
}) {
  if (!resend) {
    console.error('[Email] Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `【重要】アカウント無効化のお知らせ - ${params.organizationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">アカウント無効化通知</h1>
    </div>
    <div class="content">
      <p>${params.userName} 様</p>

      <p>ザイロクをご利用いただき、ありがとうございました。</p>

      <p>以下の理由により、あなたのアカウントが無効化されました。</p>

      <p style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #6b7280;">
        ${params.reason}
      </p>

      <p><strong>今後、このアカウントでログインすることはできません。</strong></p>

      <p style="color: #6b7280; font-size: 14px;">
        ※ あなたが作成した過去の作業報告書や請求書のデータは、${params.organizationName}の管理画面に引き続き表示されます。
      </p>

      <p>詳細につきましては、${params.organizationName}の管理者にお問い合わせください。</p>

      <div class="footer">
        <p>© 2025 ザイロク (Zairoku). All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: params.to,
      subject,
      html
    });

    console.log('[Email] User deactivated notice sent:', result);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send user deactivated notice:', error);
    return { success: false, error };
  }
}
