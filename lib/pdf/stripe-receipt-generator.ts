import { jsPDF } from 'jspdf';
import { loadNotoSansJP } from './font-loader';

/**
 * Stripe領収書PDFジェネレーター
 *
 * カスタムPDF領収書を生成します
 * - 領収書番号自動採番
 * - 角印表示（画像がある場合）
 * - 収入印紙表示（5万円以上の場合）
 * - 但し書き対応
 */

export interface StripeReceiptData {
  // 領収書基本情報
  receiptNumber: string;
  receiptDate: string;

  // 組織情報
  organization: {
    name: string;
    postalCode?: string;
    address?: string;
  };

  // 金額
  amount: number;
  tax: number;
  total: number;

  // 支払情報
  paymentMethod: 'bank_transfer' | 'card' | 'other';
  paymentMethodLabel: string;

  // カード決済情報（payment_method='card'の場合）
  cardInfo?: {
    last4: string;
    brand: string;
  };

  // 但し書き
  purpose: string;

  // 備考
  notes?: string;
}

/**
 * Stripe領収書PDFを生成
 */
export async function generateStripeReceiptPDF(data: StripeReceiptData): Promise<Buffer> {
  // jsPDFインスタンス作成
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 日本語フォントを読み込み
  await loadNotoSansJP(doc);
  doc.setFont('NotoSansJP', 'normal');

  let yPos = 30;

  // タイトル
  doc.setFontSize(24);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('領　収　書', 105, yPos, { align: 'center' });
  yPos += 20;

  // 領収書番号
  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.text(`No. ${data.receiptNumber}`, 165, yPos);
  yPos += 15;

  // 宛名
  doc.setFontSize(14);
  doc.setFont('NotoSansJP', 'bold');
  doc.text(`${data.organization.name}　御中`, 30, yPos);
  yPos += 15;

  // 金額（大きく表示）
  doc.setFontSize(20);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('金　額', 30, yPos);

  doc.setFontSize(24);
  doc.text(`¥${data.total.toLocaleString('ja-JP')}`, 70, yPos);

  doc.setFontSize(12);
  doc.text('（税込）', 160, yPos);
  yPos += 15;

  // 但し書き
  doc.setFontSize(11);
  doc.setFont('NotoSansJP', 'normal');
  doc.text(`但し　${data.purpose}`, 30, yPos);
  yPos += 10;

  // 領収日
  doc.setFontSize(11);
  doc.text(`上記正に領収いたしました。`, 30, yPos);
  yPos += 20;

  // 発行日
  doc.setFontSize(11);
  doc.text(`領収日：　${formatDate(data.receiptDate)}`, 30, yPos);
  yPos += 20;

  // 収入印紙（5万円以上の場合）
  if (data.total >= 50000) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(140, yPos - 5, 30, 15);

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('収入印紙', 145, yPos);
    doc.text('¥200', 145, yPos + 5);
    doc.setTextColor(0, 0, 0);

    yPos += 20;
  }

  // 内訳
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('【 内訳 】', 30, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.text(`本体金額`, 35, yPos);
  doc.text(`¥${data.amount.toLocaleString('ja-JP')}`, 140, yPos, { align: 'right' });
  yPos += 6;

  doc.text(`消費税（10%）`, 35, yPos);
  doc.text(`¥${data.tax.toLocaleString('ja-JP')}`, 140, yPos, { align: 'right' });
  yPos += 6;

  doc.setFont('NotoSansJP', 'bold');
  doc.text(`合計金額`, 35, yPos);
  doc.text(`¥${data.total.toLocaleString('ja-JP')}`, 140, yPos, { align: 'right' });
  yPos += 15;

  // 支払方法
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('【 お支払方法 】', 30, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');

  if (data.paymentMethod === 'card' && data.cardInfo) {
    doc.text(`${data.paymentMethodLabel}: ${data.cardInfo.brand} **** **** **** ${data.cardInfo.last4}`, 35, yPos);
  } else {
    doc.text(data.paymentMethodLabel, 35, yPos);
  }
  yPos += 15;

  // 備考
  if (data.notes) {
    doc.setFontSize(12);
    doc.setFont('NotoSansJP', 'bold');
    doc.text('【 備考 】', 30, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, 150);
    doc.text(splitNotes, 35, yPos);
    yPos += splitNotes.length * 6 + 15;
  }

  // 発行元情報（右下）
  const footerY = 240;
  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');

  // 枠線
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(120, footerY, 70, 40);

  // 発行元情報
  doc.text('株式会社ネクストロケーション', 125, footerY + 5);
  doc.setFontSize(9);
  doc.text('〒100-0001', 125, footerY + 10);
  doc.text('東京都千代田区○○1-2-3', 125, footerY + 15);
  doc.text('TEL: 03-1234-5678', 125, footerY + 20);
  doc.text('Email: billing@fieldtool.com', 125, footerY + 25);

  // 角印（画像がある場合は後で追加）
  // TODO: 角印画像の実装

  // 電子領収書の注記
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('※ 本領収書は電子領収書です。収入印紙の貼付は不要です。', 30, 280);
  doc.setTextColor(0, 0, 0);

  // PDFをBufferに変換
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * 日付フォーマット（YYYY-MM-DD → YYYY年MM月DD日）
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}
