import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { logger } from '@/lib/logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Stripe請求書メール送信
 */
export async function sendStripeInvoiceEmail(params: {
  to: string;
  organizationName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  pdfBuffer: Buffer;
  paymentMethod: 'invoice' | 'card';
}): Promise<void> {
  const {
    to,
    organizationName,
    invoiceNumber,
    amount,
    dueDate,
    pdfBuffer,
    paymentMethod,
  } = params;

  const subject = `【ザイロク】ご請求書（${invoiceNumber}）`;

  const bodyText = paymentMethod === 'invoice'
    ? `
${organizationName} 御中

いつもザイロクをご利用いただき、誠にありがとうございます。

今月分のご請求書をお送りいたします。
添付のPDFファイルをご確認の上、期日までにお支払いくださいますようお願い申し上げます。

━━━━━━━━━━━━━━━━━━━━━━━━
■ 請求内容
━━━━━━━━━━━━━━━━━━━━━━━━

請求書番号: ${invoiceNumber}
ご請求金額: ¥${amount.toLocaleString('ja-JP')}（税込）
お支払期限: ${dueDate}

━━━━━━━━━━━━━━━━━━━━━━━━
■ お振込先
━━━━━━━━━━━━━━━━━━━━━━━━

銀行名: ○○銀行
支店名: ○○支店
口座種別: 普通預金
口座番号: 1234567
口座名義: カ）ザイロク

※ 振込手数料はお客様ご負担でお願いいたします

━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともザイロクをよろしくお願いいたします。

────────────────────────────
株式会社ネクストロケーション
〒100-0001 東京都千代田区○○1-2-3
TEL: 03-1234-5678
Email: billing@zairoku.com
Web: https://zairoku.com
────────────────────────────

※ このメールは自動送信されています。
`
    : `
${organizationName} 御中

いつもザイロクをご利用いただき、誠にありがとうございます。

今月分のお支払いが完了いたしました。
領収書は別途お送りいたします。

━━━━━━━━━━━━━━━━━━━━━━━━
■ 決済内容
━━━━━━━━━━━━━━━━━━━━━━━━

請求書番号: ${invoiceNumber}
決済金額: ¥${amount.toLocaleString('ja-JP')}（税込）
決済日: ${dueDate}
決済方法: クレジットカード

━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともザイロクをよろしくお願いいたします。

────────────────────────────
株式会社ネクストロケーション
〒100-0001 東京都千代田区○○1-2-3
TEL: 03-1234-5678
Email: billing@zairoku.com
Web: https://zairoku.com
────────────────────────────

※ このメールは自動送信されています。
`;

  try {
    if (resend) {
      // Resend使用（本番環境）
      await resend.emails.send({
        from: 'ザイロク <billing@zairoku.com>',
        to,
        subject,
        text: bodyText,
        attachments: [
          {
            filename: `invoice-${invoiceNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      logger.info('Stripe invoice email sent successfully via Resend', {
        to,
        invoiceNumber,
        paymentMethod,
      });
    } else {
      // Nodemailer使用（開発環境）
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025'),
        secure: false,
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@fieldtool.local',
        to,
        subject,
        text: bodyText,
        attachments: [
          {
            filename: `invoice-${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      logger.info('Stripe invoice email sent successfully via Nodemailer', {
        to,
        invoiceNumber,
        paymentMethod,
      });
    }

  } catch (error) {
    logger.error('Failed to send Stripe invoice email', {
      to,
      invoiceNumber,
      error,
    });
    throw new Error('請求書メールの送信に失敗しました');
  }
}

/**
 * Stripe領収書メール送信
 */
export async function sendStripeReceiptEmail(params: {
  to: string;
  organizationName: string;
  receiptNumber: string;
  amount: number;
  pdfBuffer: Buffer;
  paymentMethod: 'bank_transfer' | 'card' | 'other';
}): Promise<void> {
  const {
    to,
    organizationName,
    receiptNumber,
    amount,
    pdfBuffer,
    paymentMethod,
  } = params;

  // Nodemailer設定
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: false,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    } : undefined,
  });

  const subject = `【ザイロク】領収書（${receiptNumber}）`;

  const paymentMethodLabel =
    paymentMethod === 'bank_transfer' ? '銀行振込' :
    paymentMethod === 'card' ? 'クレジットカード' :
    'その他';

  const bodyText = `
${organizationName} 御中

いつもザイロクをご利用いただき、誠にありがとうございます。

ご入金を確認いたしましたので、領収書をお送りいたします。
添付のPDFファイルをご確認ください。

━━━━━━━━━━━━━━━━━━━━━━━━
■ 領収内容
━━━━━━━━━━━━━━━━━━━━━━━━

領収書番号: ${receiptNumber}
領収金額: ¥${amount.toLocaleString('ja-JP')}（税込）
お支払方法: ${paymentMethodLabel}

━━━━━━━━━━━━━━━━━━━━━━━━

※ 本領収書は電子領収書です。収入印紙の貼付は不要です。

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともザイロクをよろしくお願いいたします。

────────────────────────────
株式会社ネクストロケーション
〒100-0001 東京都千代田区○○1-2-3
TEL: 03-1234-5678
Email: billing@zairoku.com
Web: https://zairoku.com
────────────────────────────

※ このメールは自動送信されています。
`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@fieldtool.local',
      to,
      subject,
      text: bodyText,
      attachments: [
        {
          filename: `receipt-${receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    logger.info('Stripe receipt email sent successfully', {
      to,
      receiptNumber,
      paymentMethod,
    });

  } catch (error) {
    logger.error('Failed to send Stripe receipt email', {
      to,
      receiptNumber,
      error,
    });
    throw new Error('領収書メールの送信に失敗しました');
  }
}
