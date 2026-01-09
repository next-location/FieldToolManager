import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

interface SendInvoiceEmailParams {
  toEmail: string;
  organizationName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  pdfBuffer: Buffer;
  emailSubject?: string;
  emailTemplate?: string;
  isEstimate?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount);
}

function getEmailHtml(params: SendInvoiceEmailParams): string {
  const {
    organizationName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    billingPeriodStart,
    billingPeriodEnd,
    emailTemplate,
    isEstimate = false,
  } = params;

  const documentType = isEstimate ? '見積書' : '請求書';
  const documentLabel = isEstimate ? '見積もり金額' : '請求金額';
  const dateLabel = isEstimate ? '有効期限' : 'お支払い期限';

  // カスタムテンプレートがある場合は変数を置換
  let bodyText = emailTemplate || `平素より格別のご高配を賜り、厚く御礼申し上げます。

{billing_period_start}〜{billing_period_end}分の${documentType}をお送りいたします。
${documentLabel}：{total_amount}円（税込）
${dateLabel}：{due_date}

ご確認のほど、よろしくお願いいたします。`;

  bodyText = bodyText
    .replace(/{organization_name}/g, organizationName)
    .replace(/{billing_period_start}/g, formatDate(billingPeriodStart))
    .replace(/{billing_period_end}/g, formatDate(billingPeriodEnd))
    .replace(/{total_amount}/g, formatCurrency(totalAmount))
    .replace(/{due_date}/g, formatDate(dueDate))
    .replace(/{invoice_number}/g, invoiceNumber);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentType}のお知らせ</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">${documentType}のお知らせ</h1>
    </div>

    <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 5px;">
      <p style="white-space: pre-line; margin: 0 0 20px 0;">${bodyText}</p>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <div style="margin-bottom: 12px;">
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${documentType}番号</div>
          <div style="font-weight: bold; font-size: 14px;">${invoiceNumber}</div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">発行日</div>
          <div style="font-size: 14px;">${formatDate(invoiceDate)}</div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${dateLabel}</div>
          <div style="color: #dc2626; font-weight: bold; font-size: 14px;">${formatDate(dueDate)}</div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">期間</div>
          <div style="font-size: 14px;">${formatDate(billingPeriodStart)} 〜 ${formatDate(billingPeriodEnd)}</div>
        </div>
        <div style="border-top: 1px solid #d1d5db; padding-top: 12px; margin-top: 12px;">
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${documentLabel}</div>
          <div style="font-size: 20px; font-weight: bold; color: #2563eb;">¥${formatCurrency(totalAmount)}</div>
        </div>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
        添付の${documentType}PDFをご確認ください。<br>
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">
        ザイロク<br>
        Email: info@zairoku.com<br>
        Web: https://zairoku.com
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams) {
  const { toEmail, organizationName, invoiceNumber, pdfBuffer, emailSubject, isEstimate = false } = params;

  const documentType = isEstimate ? '見積書' : '請求書';

  logger.debug('[Invoice Email] Starting email send process', {
    to: toEmail,
    organization: organizationName,
    invoiceNumber,
    documentType,
    hasResendKey: !!process.env.RESEND_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
  });

  const subject = emailSubject?.replace(/{organization_name}/g, organizationName) ||
    `【ザイロク】お${documentType}のお知らせ`;
  const html = getEmailHtml(params);

  // PDFを Base64 エンコード
  const pdfBase64 = pdfBuffer.toString('base64');
  const fileName = `${documentType}_${invoiceNumber}.pdf`;

  // Resendを使用（本番環境）
  if (process.env.RESEND_API_KEY) {
    logger.info('[Invoice Email] Using Resend for email delivery');
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    try {
      if (!resend) {
        console.warn("Resend API is not configured. Skipping email send.");
        return { success: false, error: "Email service not configured" };
      }
      const { data, error } = await resend.emails.send({
        from: 'noreply@zairoku.com',
        to: toEmail,
        subject,
        html,
        attachments: [
          {
            filename: fileName,
            content: pdfBase64,
          },
        ],
      });

      if (error) {
        logger.error('[Resend] Email send error', { error });
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info('[Resend] Invoice email sent successfully', { messageId: data?.id });
      return { success: true, provider: 'resend', messageId: data?.id };
    } catch (error: any) {
      logger.error('[Resend] Failed to send invoice email', { error: error.message });
      throw error;
    }
  }

  // Nodemailer/SMTP を使用（開発環境・Mailhog）
  if (process.env.SMTP_HOST) {
    logger.info('[Invoice Email] Using SMTP/Nodemailer for email delivery');
    logger.debug('[Invoice Email] SMTP connection details', {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 1025,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,
      ignoreTLS: true,
    });

    try {
      logger.debug('[Invoice Email] Sending email via SMTP...');
      const info = await transporter.sendMail({
        from: '"ザイロク" <noreply@zairoku.com>',
        to: toEmail,
        subject,
        html,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
          },
        ],
      });

      logger.info('[Invoice Email] ✅ Email sent successfully via SMTP', {
        messageId: info.messageId,
        mailhogUrl: 'http://localhost:8025',
      });
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error: any) {
      logger.error('[Invoice Email] ❌ Failed to send via SMTP', {
        code: error.code,
        command: error.command,
        message: error.message,
      });
      throw error;
    }
  }

  logger.error('[Invoice Email] ❌ No email provider configured');
  throw new Error('No email provider configured. Please set RESEND_API_KEY or SMTP_HOST.');
}

/**
 * 請求書発行前リマインダーメール送信
 */
interface SendInvoiceReminderEmailParams {
  to: string;
  organizationName: string;
  plan: string;
  nextInvoiceDate: string;
  estimatedAmount: number;
  billingDay: number;
}

function getReminderEmailHtml(params: SendInvoiceReminderEmailParams): string {
  const { organizationName, plan, nextInvoiceDate, estimatedAmount, billingDay } = params;

  const planNameMap: Record<string, string> = {
    basic: 'ベーシックプラン',
    standard: 'スタンダードプラン',
    premium: 'プレミアムプラン',
  };

  const planName = planNameMap[plan] || plan;
  const formattedDate = formatDate(nextInvoiceDate);
  const formattedAmount = formatCurrency(estimatedAmount);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求書発行予定のお知らせ</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">📧 請求書発行予定のお知らせ</h1>
    </div>

    <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 5px;">
      <p style="margin: 0 0 20px 0;">
        ${organizationName} 様<br><br>
        平素より格別のご高配を賜り、厚く御礼申し上げます。<br><br>
        貴社の次回請求書発行日が近づいてまいりましたので、お知らせいたします。
      </p>

      <div style="background-color: #eff6ff; padding: 20px; border-left: 4px solid #2563eb; border-radius: 5px; margin: 20px 0;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1e40af;">請求予定情報</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">ご契約プラン：</td>
            <td style="padding: 8px 0; font-weight: bold;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">請求書発行日：</td>
            <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">請求予定金額（税込）：</td>
            <td style="padding: 8px 0; font-size: 20px; font-weight: bold; color: #2563eb;">¥${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">毎月の請求日：</td>
            <td style="padding: 8px 0;">毎月${billingDay}日</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>📌 ご確認ください</strong><br>
          請求書は発行日に自動的にメールでお送りいたします。<br>
          お支払い方法が「請求書払い（銀行振込）」の場合、お支払い期限は発行日から30日以内となります。
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
        ご不明な点やご変更のご希望がございましたら、お気軽にお問い合わせください。<br>
        今後とも変わらぬご愛顧のほど、よろしくお願い申し上げます。
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">
        ザイロク<br>
        Email: info@zairoku.com<br>
        Web: https://zairoku.com
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendInvoiceReminderEmail(params: SendInvoiceReminderEmailParams) {
  const { to, organizationName } = params;

  logger.debug('[Invoice Reminder] Starting email send process', {
    to,
    organization: organizationName,
    hasResendKey: !!process.env.RESEND_API_KEY,
    smtpHost: process.env.SMTP_HOST,
  });

  const subject = `【${organizationName}】請求書発行予定のお知らせ（3日後）`;
  const html = getReminderEmailHtml(params);

  // Resendを使用（本番環境）
  if (process.env.RESEND_API_KEY) {
    logger.info('[Invoice Reminder] Using Resend for email delivery');
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    try {
      if (!resend) {
        console.warn("Resend API is not configured. Skipping email send.");
        return { success: false, error: "Email service not configured" };
      }
      const { data, error } = await resend.emails.send({
        from: 'noreply@zairoku.com',
        to,
        subject,
        html,
      });

      if (error) {
        logger.error('[Resend] Reminder email send error', { error });
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info('[Resend] Reminder email sent successfully', { messageId: data?.id });
      return { success: true, provider: 'resend', messageId: data?.id };
    } catch (error: any) {
      logger.error('[Resend] Failed to send reminder email', { error: error.message });
      throw error;
    }
  }

  // Nodemailer/SMTP を使用（開発環境・Mailhog）
  if (process.env.SMTP_HOST) {
    logger.info('[Invoice Reminder] Using SMTP/Nodemailer for email delivery');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,
      ignoreTLS: true,
    });

    try {
      const info = await transporter.sendMail({
        from: '"ザイロク" <noreply@zairoku.com>',
        to,
        subject,
        html,
      });

      logger.info('[Invoice Reminder] ✅ Email sent successfully via SMTP', {
        messageId: info.messageId,
        mailhogUrl: 'http://localhost:8025',
      });
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error: any) {
      logger.error('[Invoice Reminder] ❌ Failed to send via SMTP', {
        code: error.code,
        message: error.message,
      });
      throw error;
    }
  }

  logger.error('[Invoice Reminder] ❌ No email provider configured');
  throw new Error('No email provider configured. Please set RESEND_API_KEY or SMTP_HOST.');
}
