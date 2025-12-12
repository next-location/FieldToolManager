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
  } = params;

  // カスタムテンプレートがある場合は変数を置換
  let bodyText = emailTemplate || `平素より格別のご高配を賜り、厚く御礼申し上げます。

{billing_period_start}〜{billing_period_end}分のご請求書をお送りいたします。
請求金額：{total_amount}円（税込）
お支払い期限：{due_date}

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
  <title>請求書のお知らせ</title>
</head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">請求書のお知らせ</h1>
    </div>

    <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 5px;">
      <p style="white-space: pre-line; margin: 0 0 20px 0;">${bodyText}</p>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">請求書番号：</td>
            <td style="padding: 5px 0; font-weight: bold;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">発行日：</td>
            <td style="padding: 5px 0;">${formatDate(invoiceDate)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">お支払い期限：</td>
            <td style="padding: 5px 0; color: #dc2626; font-weight: bold;">${formatDate(dueDate)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">請求期間：</td>
            <td style="padding: 5px 0;">${formatDate(billingPeriodStart)} 〜 ${formatDate(billingPeriodEnd)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">請求金額：</td>
            <td style="padding: 5px 0; font-size: 18px; font-weight: bold; color: #2563eb;">¥${formatCurrency(totalAmount)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
        添付の請求書PDFをご確認ください。<br>
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">
        株式会社ネクストロケーション<br>
        〒107-0062 東京都港区南青山2丁目2番15号 WinAoyamaビル917<br>
        TEL: 03-XXXX-XXXX
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams) {
  const { toEmail, organizationName, invoiceNumber, pdfBuffer, emailSubject } = params;

  logger.debug('[Invoice Email] Starting email send process', {
    to: toEmail,
    organization: organizationName,
    invoiceNumber,
    hasResendKey: !!process.env.RESEND_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
  });

  const subject = emailSubject?.replace(/{organization_name}/g, organizationName) ||
    `【${organizationName}】ご請求書のお知らせ`;
  const html = getEmailHtml(params);

  // PDFを Base64 エンコード
  const pdfBase64 = pdfBuffer.toString('base64');
  const fileName = `請求書_${invoiceNumber}.pdf`;

  // Resendを使用（本番環境）
  if (process.env.RESEND_API_KEY) {
    logger.info('[Invoice Email] Using Resend for email delivery');
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
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
