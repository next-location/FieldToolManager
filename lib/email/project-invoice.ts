import { Resend } from 'resend'
import * as nodemailer from 'nodemailer'
import { logger } from '@/lib/logger'

interface SendProjectInvoiceEmailParams {
  toEmail: string
  invoiceNumber: string
  clientName: string
  projectName?: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  message?: string
  pdfUrl?: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP').format(amount)
}

function getEmailHtml(params: SendProjectInvoiceEmailParams): string {
  const {
    clientName,
    projectName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    totalAmount,
    message,
  } = params

  const customMessage = message || `平素より格別のご高配を賜り、厚く御礼申し上げます。

下記の通りご請求申し上げます。
ご確認のほど、よろしくお願いいたします。`

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
      <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">📄 請求書のお知らせ</h1>
    </div>

    <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 5px;">
      <p style="margin: 0 0 20px 0;">
        ${clientName} 様
      </p>

      <p style="white-space: pre-line; margin: 0 0 20px 0;">${customMessage}</p>

      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">請求書番号：</td>
            <td style="padding: 5px 0; font-weight: bold;">${invoiceNumber}</td>
          </tr>
          ${projectName ? `
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">工事名：</td>
            <td style="padding: 5px 0;">${projectName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">請求日：</td>
            <td style="padding: 5px 0;">${formatDate(invoiceDate)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">お支払い期限：</td>
            <td style="padding: 5px 0; color: #dc2626; font-weight: bold;">${formatDate(dueDate)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">請求金額（税込）：</td>
            <td style="padding: 5px 0; font-size: 18px; font-weight: bold; color: #2563eb;">¥${formatCurrency(totalAmount)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
        ご不明な点がございましたら、お気軽にお問い合わせください。<br>
        今後とも何卒よろしくお願い申し上げます。
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
      <p style="margin: 0;">
        このメールは自動送信されています。<br>
        返信はできませんので、ご用件は担当者までご連絡ください。
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export async function sendProjectInvoiceEmail(params: SendProjectInvoiceEmailParams) {
  const { toEmail, invoiceNumber, clientName } = params

  logger.debug('[Project Invoice Email] Starting email send process', {
    to: toEmail,
    client: clientName,
    invoiceNumber,
    hasResendKey: !!process.env.RESEND_API_KEY,
    smtpHost: process.env.SMTP_HOST,
  })

  const subject = `【ご請求書】${invoiceNumber}`
  const html = getEmailHtml(params)

  // Resendを使用（本番環境）
  if (process.env.RESEND_API_KEY) {
    logger.info('[Project Invoice Email] Using Resend for email delivery')
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      const { data, error } = await resend.emails.send({
        from: 'noreply@zairoku.com',
        to: toEmail,
        subject,
        html,
      })

      if (error) {
        logger.error('[Resend] Project invoice email send error', { error })
        throw new Error(`Resend error: ${error.message}`)
      }

      logger.info('[Resend] Project invoice email sent successfully', { messageId: data?.id })
      return { success: true, provider: 'resend', messageId: data?.id }
    } catch (error: any) {
      logger.error('[Resend] Failed to send project invoice email', { error: error.message })
      throw error
    }
  }

  // Nodemailer/SMTP を使用（開発環境・Mailhog）
  if (process.env.SMTP_HOST) {
    logger.info('[Project Invoice Email] Using SMTP/Nodemailer for email delivery')
    logger.debug('[Project Invoice Email] SMTP connection details', {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 1025,
    })

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,
      ignoreTLS: true,
    })

    try {
      logger.debug('[Project Invoice Email] Sending email via SMTP...')
      const info = await transporter.sendMail({
        from: '"ザイロク" <noreply@zairoku.com>',
        to: toEmail,
        subject,
        html,
      })

      logger.info('[Project Invoice Email] ✅ Email sent successfully via SMTP', {
        messageId: info.messageId,
        mailhogUrl: 'http://localhost:8025',
      })
      return { success: true, provider: 'smtp', messageId: info.messageId }
    } catch (error: any) {
      logger.error('[Project Invoice Email] ❌ Failed to send via SMTP', {
        code: error.code,
        command: error.command,
        message: error.message,
      })
      throw error
    }
  }

  logger.error('[Project Invoice Email] ❌ No email provider configured')
  throw new Error('No email provider configured. Please set RESEND_API_KEY or SMTP_HOST.')
}
