import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadNotoSansJP } from './font-loader';

/**
 * Stripe請求書PDFジェネレーター
 *
 * カスタムPDF請求書を生成します（Stripeのデフォルトは使用しない）
 * 支払方法別にテンプレートを切り替えます：
 * - 請求書払い（invoice）: 振込先情報、支払期限を表示
 * - カード払い（card）: 決済済み表示、カード下4桁を表示
 */

export interface StripeInvoiceData {
  // 請求書基本情報
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentMethod: 'invoice' | 'card';

  // 組織情報
  organization: {
    name: string;
    postalCode?: string;
    address?: string;
    phone?: string;
    email?: string;
  };

  // 請求明細
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  // 金額
  subtotal: number;
  tax: number;
  total: number;

  // カード決済情報（payment_method='card'の場合）
  cardInfo?: {
    last4: string;
    brand: string;
    paidAt: string;
  };

  // 備考
  notes?: string;
}

/**
 * Stripe請求書PDFを生成
 */
export async function generateStripeInvoicePDF(data: StripeInvoiceData): Promise<Buffer> {
  // jsPDFインスタンス作成
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 日本語フォントを読み込み
  await loadNotoSansJP(doc);
  doc.setFont('NotoSansJP', 'normal');

  let yPos = 20;

  // タイトル
  doc.setFontSize(20);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('請　求　書', 105, yPos, { align: 'center' });
  yPos += 15;

  // 請求書番号・発行日
  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.text(`請求書番号: ${data.invoiceNumber}`, 15, yPos);
  yPos += 6;
  doc.text(`発行日: ${formatDate(data.invoiceDate)}`, 15, yPos);
  yPos += 6;

  if (data.paymentMethod === 'invoice') {
    doc.text(`お支払期限: ${formatDate(data.dueDate)}`, 15, yPos);
    yPos += 10;
  } else {
    doc.setTextColor(0, 128, 0);
    doc.setFont('NotoSansJP', 'bold');
    doc.text(`決済済み（${formatDate(data.cardInfo!.paidAt)}）`, 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont('NotoSansJP', 'normal');
    yPos += 10;
  }

  // 請求先情報
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('【 請求先 】', 15, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.text(data.organization.name, 20, yPos);
  yPos += 6;

  if (data.organization.postalCode && data.organization.address) {
    doc.text(`〒${data.organization.postalCode}`, 20, yPos);
    yPos += 6;
    doc.text(data.organization.address, 20, yPos);
    yPos += 6;
  }

  if (data.organization.phone) {
    doc.text(`TEL: ${data.organization.phone}`, 20, yPos);
    yPos += 6;
  }

  if (data.organization.email) {
    doc.text(`Email: ${data.organization.email}`, 20, yPos);
    yPos += 6;
  }

  yPos += 5;

  // 請求金額（大きく表示）
  doc.setFontSize(14);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('ご請求金額', 15, yPos);

  doc.setFontSize(20);
  doc.text(`¥${data.total.toLocaleString('ja-JP')}`, 75, yPos);
  doc.setFontSize(10);
  doc.text('（税込）', 140, yPos);
  yPos += 15;

  // 請求明細テーブル
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'bold');
  doc.text('【 請求明細 】', 15, yPos);
  yPos += 5;

  const tableData = data.items.map(item => [
    item.description,
    item.quantity.toString(),
    `¥${item.unitPrice.toLocaleString('ja-JP')}`,
    `¥${item.amount.toLocaleString('ja-JP')}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['項目', '数量', '単価', '金額']],
    body: tableData,
    foot: [
      ['', '', '小計', `¥${data.subtotal.toLocaleString('ja-JP')}`],
      ['', '', '消費税（10%）', `¥${data.tax.toLocaleString('ja-JP')}`],
      ['', '', '合計', `¥${data.total.toLocaleString('ja-JP')}`],
    ],
    styles: {
      font: 'NotoSansJP',
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'right',
    },
    columnStyles: {
      0: { cellWidth: 80, halign: 'left' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: function (data) {
      data.cell.styles.font = 'NotoSansJP';
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 支払方法別の情報表示
  if (data.paymentMethod === 'invoice') {
    // 請求書払い: 振込先情報
    doc.setFontSize(12);
    doc.setFont('NotoSansJP', 'bold');
    doc.text('【 お振込先 】', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    doc.text('銀行名: ○○銀行', 20, yPos);
    yPos += 6;
    doc.text('支店名: ○○支店', 20, yPos);
    yPos += 6;
    doc.text('口座種別: 普通預金', 20, yPos);
    yPos += 6;
    doc.text('口座番号: 1234567', 20, yPos);
    yPos += 6;
    doc.text('口座名義: カ）フィールドツールマネージャー', 20, yPos);
    yPos += 10;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('※ 振込手数料はお客様ご負担でお願いいたします', 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

  } else {
    // カード払い: 決済情報
    doc.setFontSize(12);
    doc.setFont('NotoSansJP', 'bold');
    doc.text('【 決済情報 】', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    doc.text(`カード: ${data.cardInfo!.brand} **** **** **** ${data.cardInfo!.last4}`, 20, yPos);
    yPos += 6;
    doc.text(`決済日時: ${formatDate(data.cardInfo!.paidAt)}`, 20, yPos);
    yPos += 10;
  }

  // 備考
  if (data.notes) {
    doc.setFontSize(12);
    doc.setFont('NotoSansJP', 'bold');
    doc.text('【 備考 】', 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    const splitNotes = doc.splitTextToSize(data.notes, 180);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 6 + 10;
  }

  // フッター（発行元情報）
  const footerY = 280;
  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  doc.text('株式会社ザイロク', 15, footerY);
  doc.text('〒100-0001 東京都千代田区○○1-2-3', 15, footerY + 5);
  doc.text('TEL: 03-1234-5678  Email: billing@zairoku.com', 15, footerY + 10);

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
