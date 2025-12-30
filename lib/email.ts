import { Resend } from 'resend'

// Resendクライアントの初期化
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface LowStockAlertEmailData {
  toolName: string
  modelNumber?: string
  currentStock: number
  minimumStock: number
  organizationName: string
  dashboardUrl: string
}

export interface WarrantyExpirationEmailData {
  toolName: string
  modelNumber?: string
  warrantyExpirationDate: string
  daysUntilExpiration: number
  organizationName: string
  dashboardUrl: string
}

/**
 * 低在庫アラートメールを送信
 */
export async function sendLowStockAlertEmail(
  to: string,
  data: LowStockAlertEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { toolName, modelNumber, currentStock, minimumStock, organizationName, dashboardUrl } = data

    const subject = `【在庫アラート】${toolName}の在庫が不足しています`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .alert-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .tool-info {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .tool-info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .tool-info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      color: #111827;
      font-weight: 500;
    }
    .stock-warning {
      color: #dc2626;
      font-weight: 700;
      font-size: 1.1em;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">⚠️ 低在庫アラート</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
  </div>

  <div class="content">
    <div class="alert-box">
      <strong>在庫不足の通知</strong><br>
      以下の道具の在庫が最小在庫数を下回っています。早急な補充をご検討ください。
    </div>

    <div class="tool-info">
      <div class="tool-info-row">
        <span class="label">道具名</span>
        <span class="value">${toolName}</span>
      </div>
      ${modelNumber ? `
      <div class="tool-info-row">
        <span class="label">型番</span>
        <span class="value">${modelNumber}</span>
      </div>
      ` : ''}
      <div class="tool-info-row">
        <span class="label">現在の在庫数</span>
        <span class="stock-warning">${currentStock}個</span>
      </div>
      <div class="tool-info-row">
        <span class="label">最小在庫数</span>
        <span class="value">${minimumStock}個</span>
      </div>
    </div>

    <p>
      <strong>推奨アクション：</strong><br>
      • 在庫補充の発注手続きを開始してください<br>
      • 現場での使用予定を確認してください<br>
      • 必要に応じて代替品の検討も行ってください
    </p>

    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="button">ダッシュボードを確認</a>
    </div>

    <div class="footer">
      <p>このメールはザイロクから自動送信されています。</p>
      <p>通知設定を変更する場合は、ダッシュボードの組織設定から行ってください。</p>
    </div>
  </div>
</body>
</html>
`

    const text = `
【在庫アラート】${toolName}の在庫が不足しています

${organizationName}

在庫不足の通知：
以下の道具の在庫が最小在庫数を下回っています。早急な補充をご検討ください。

道具名: ${toolName}
${modelNumber ? `型番: ${modelNumber}\n` : ''}現在の在庫数: ${currentStock}個
最小在庫数: ${minimumStock}個

推奨アクション：
• 在庫補充の発注手続きを開始してください
• 現場での使用予定を確認してください
• 必要に応じて代替品の検討も行ってください

ダッシュボードを確認: ${dashboardUrl}

---
このメールはザイロクから自動送信されています。
通知設定を変更する場合は、ダッシュボードの組織設定から行ってください。
`

    if (!resend) {
      console.warn('Resend not configured')
      return { success: false, error: 'メールサービスが設定されていません' }
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@fieldtoolmanager.com',
      to,
      subject,
      html,
      text,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error.message || 'メール送信に失敗しました',
    }
  }
}

/**
 * 保証期限切れアラートメールを送信
 */
export async function sendWarrantyExpirationEmail(
  to: string,
  data: WarrantyExpirationEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { toolName, modelNumber, warrantyExpirationDate, daysUntilExpiration, organizationName, dashboardUrl } = data

    const isExpired = daysUntilExpiration <= 0
    const subject = isExpired
      ? `【保証期限切れ】${toolName}の保証期限が切れています`
      : `【保証期限アラート】${toolName}の保証期限が間もなく切れます（残り${daysUntilExpiration}日）`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
      color: white;
      padding: 30px 20px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .alert-box {
      background: ${isExpired ? '#fef2f2' : '#fef3c7'};
      border-left: 4px solid ${isExpired ? '#dc2626' : '#f59e0b'};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .tool-info {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .tool-info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .tool-info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      color: #111827;
      font-weight: 500;
    }
    .warranty-warning {
      color: ${isExpired ? '#dc2626' : '#f59e0b'};
      font-weight: 700;
      font-size: 1.1em;
    }
    .button {
      display: inline-block;
      background: #2563eb;
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">${isExpired ? '⚠️ 保証期限切れ' : '⏰ 保証期限アラート'}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
  </div>

  <div class="content">
    <div class="alert-box">
      <strong>${isExpired ? '保証期限が切れています' : '保証期限が間もなく切れます'}</strong><br>
      ${isExpired
        ? '以下の道具の保証期限が切れています。必要に応じて延長保証の手続きや買い替えをご検討ください。'
        : `以下の道具の保証期限が残り${daysUntilExpiration}日で切れます。必要に応じて延長保証の手続きをご検討ください。`
      }
    </div>

    <div class="tool-info">
      <div class="tool-info-row">
        <span class="label">道具名</span>
        <span class="value">${toolName}</span>
      </div>
      ${modelNumber ? `
      <div class="tool-info-row">
        <span class="label">型番</span>
        <span class="value">${modelNumber}</span>
      </div>
      ` : ''}
      <div class="tool-info-row">
        <span class="label">保証期限</span>
        <span class="warranty-warning">${warrantyExpirationDate}</span>
      </div>
      <div class="tool-info-row">
        <span class="label">残り日数</span>
        <span class="warranty-warning">${isExpired ? '期限切れ' : `${daysUntilExpiration}日`}</span>
      </div>
    </div>

    <p>
      <strong>推奨アクション：</strong><br>
      ${isExpired
        ? '• メーカーに連絡して延長保証を検討してください<br>• 修理が必要な場合は有償対応となる可能性があります<br>• 必要に応じて代替品の購入を検討してください'
        : '• メーカーに連絡して延長保証の手続きを検討してください<br>• 保証書の内容を確認してください<br>• 必要に応じて買い替えを検討してください'
      }
    </p>

    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="button">ダッシュボードを確認</a>
    </div>

    <div class="footer">
      <p>このメールはザイロクから自動送信されています。</p>
      <p>通知設定を変更する場合は、ダッシュボードの組織設定から行ってください。</p>
    </div>
  </div>
</body>
</html>
`

    const text = `
【保証期限${isExpired ? '切れ' : 'アラート'}】${toolName}の保証期限が${isExpired ? '切れています' : '間もなく切れます'}

${organizationName}

${isExpired ? '保証期限が切れています' : '保証期限が間もなく切れます'}：
${isExpired
  ? '以下の道具の保証期限が切れています。必要に応じて延長保証の手続きや買い替えをご検討ください。'
  : `以下の道具の保証期限が残り${daysUntilExpiration}日で切れます。必要に応じて延長保証の手続きをご検討ください。`
}

道具名: ${toolName}
${modelNumber ? `型番: ${modelNumber}\n` : ''}保証期限: ${warrantyExpirationDate}
残り日数: ${isExpired ? '期限切れ' : `${daysUntilExpiration}日`}

推奨アクション：
${isExpired
  ? '• メーカーに連絡して延長保証を検討してください\n• 修理が必要な場合は有償対応となる可能性があります\n• 必要に応じて代替品の購入を検討してください'
  : '• メーカーに連絡して延長保証の手続きを検討してください\n• 保証書の内容を確認してください\n• 必要に応じて買い替えを検討してください'
}

ダッシュボードを確認: ${dashboardUrl}

---
このメールはザイロクから自動送信されています。
通知設定を変更する場合は、ダッシュボードの組織設定から行ってください。
`

    if (!resend) {
      console.warn('Resend not configured')
      return { success: false, error: 'メールサービスが設定されていません' }
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@fieldtoolmanager.com',
      to,
      subject,
      html,
      text,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Warranty expiration email sending error:', error)
    return {
      success: false,
      error: error.message || 'メール送信に失敗しました',
    }
  }
}
