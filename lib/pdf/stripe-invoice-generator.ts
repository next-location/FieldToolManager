import { jsPDF } from 'jspdf';
import { loadNotoSansJP } from './font-loader';
import fs from 'fs';
import path from 'path';

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
 * Stripe請求書PDFを生成（管理画面ダウンロード用と同じデザイン）
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

  // 青色定義（薄く変更）
  const primaryBlue = [100, 149, 237]; // #6495ED CornflowerBlue（薄い青）
  const lightBlue = [240, 248, 255]; // #F0F8FF AliceBlue（より薄い青）

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  const leftColumnX = 15;
  const rightColumnX = 115;
  let yPos = 25;

  // ========================================
  // ヘッダー部分
  // ========================================

  // 左上: 大きな「請求書」タイトル
  doc.setFontSize(28);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('請　求　書', leftColumnX, yPos);

  // 右上: 日付と請求書番号
  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(data.invoiceDate), 195, yPos - 5, { align: 'right' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text(`請求書番号: ${data.invoiceNumber}`, 195, yPos + 2, { align: 'right' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text('登録番号：T2040001105536', 195, yPos + 9, { align: 'right' });

  yPos += 15;

  // ========================================
  // 請求先 & 発行者情報（2カラム）
  // ========================================

  // 左側: 請求先情報
  let leftY = yPos + 3;

  doc.setFontSize(16);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${data.organization.name} 様`, leftColumnX + 5, leftY);
  leftY += 4;

  // 取引先名の下に青い下線
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.line(leftColumnX, leftY, 105, leftY);

  leftY += 6;

  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  if (data.organization.address) {
    const addressLines = doc.splitTextToSize(data.organization.address, 90);
    doc.text(addressLines, leftColumnX, leftY);
    leftY += addressLines.length * 5;
  }

  // 右側: 発行者情報
  let rightY = yPos + 10;

  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('株式会社ネクストロケーション', rightColumnX, rightY);
  rightY += 6;

  doc.setFontSize(8);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('〒107-0062', rightColumnX, rightY);
  rightY += 4;
  doc.setFont('NotoSansJP', 'normal');
  doc.text('東京都港区南青山2丁目2番15号', rightColumnX, rightY);
  rightY += 4;
  doc.setFont('NotoSansJP', 'normal');
  doc.text('WinAoyamaビル917', rightColumnX, rightY);
  rightY += 5;
  doc.setFont('NotoSansJP', 'normal');
  doc.text('電話番号： 03-6869-1887', rightColumnX, rightY);
  rightY += 4;
  doc.setFont('NotoSansJP', 'normal');
  doc.text('billing@zairoku.com', rightColumnX, rightY);

  // 角印（画像を読み込んで配置）
  try {
    // プロジェクトルートのpublic/imagesから読み込む
    const sealImagePath = path.join(process.cwd(), 'public', 'images', 'company-seal.png');

    if (!fs.existsSync(sealImagePath)) {
      throw new Error(`角印画像が見つかりません: ${sealImagePath}`);
    }

    const sealImageData = fs.readFileSync(sealImagePath);
    const sealImageBase64 = sealImageData.toString('base64');
    doc.addImage(sealImageBase64, 'PNG', rightColumnX + 60, yPos + 15, 20, 20);
    console.log('[PDF] Company seal image loaded successfully');
  } catch (error) {
    console.error('[PDF] Failed to load company seal image:', error);
    throw error; // 角印は必須なのでエラーを投げる
  }

  yPos += 45;

  // ========================================
  // ご請求金額ボックス
  // ========================================

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('下記のとおりご請求申し上げます。', leftColumnX, yPos);
  yPos += 7;

  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(leftColumnX, yPos, 35, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('NotoSansJP', 'normal');
  doc.text('ご請求金額', leftColumnX + 17.5, yPos + 8, { align: 'center' });

  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.text(`¥ ${formatCurrency(data.total)} -`, leftColumnX + 40, yPos + 9);

  // 金額の下線
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);
  doc.line(leftColumnX, yPos + 12, 140, yPos + 12);

  yPos += 20;

  // ========================================
  // 請求明細テーブル
  // ========================================

  // テーブルデータ
  let tableRows: string[][] = data.items.map(item => [
    item.description,
    `${item.quantity}`,
    formatCurrency(item.unitPrice),
    formatCurrency(item.amount)
  ]);

  // 空行を追加（合計8行にする）
  for (let i = tableRows.length; i < 8; i++) {
    tableRows.push(['', '', '', '']);
  }

  // ヘッダー
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setTextColor(255, 255, 255);
  doc.rect(leftColumnX, yPos, 100, 8, 'F');
  doc.rect(leftColumnX + 100, yPos, 30, 8, 'F');
  doc.rect(leftColumnX + 130, yPos, 30, 8, 'F');
  doc.rect(leftColumnX + 160, yPos, 30, 8, 'F');

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.text('品番・品名', leftColumnX + 50, yPos + 5.5, { align: 'center' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text('数量', leftColumnX + 115, yPos + 5.5, { align: 'center' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text('単価', leftColumnX + 145, yPos + 5.5, { align: 'center' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text('金額', leftColumnX + 175, yPos + 5.5, { align: 'center' });

  yPos += 8;

  // ボディ
  doc.setTextColor(0, 0, 0);
  tableRows.forEach((row, index) => {
    // 縞模様
    if (index % 2 === 1) {
      doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
      doc.rect(leftColumnX, yPos, 190, 8, 'F');
    }

    // 枠線
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.3);
    doc.rect(leftColumnX, yPos, 100, 8);
    doc.rect(leftColumnX + 100, yPos, 30, 8);
    doc.rect(leftColumnX + 130, yPos, 30, 8);
    doc.rect(leftColumnX + 160, yPos, 30, 8);

    // テキスト
    doc.setFont('NotoSansJP', 'normal');
    doc.text(row[0], leftColumnX + 2, yPos + 5.5);
    doc.setFont('NotoSansJP', 'normal');
    doc.text(row[1], leftColumnX + 115, yPos + 5.5, { align: 'center' });
    doc.setFont('NotoSansJP', 'normal');
    doc.text(row[2], leftColumnX + 157, yPos + 5.5, { align: 'right' });
    doc.setFont('NotoSansJP', 'normal');
    doc.text(row[3], leftColumnX + 187, yPos + 5.5, { align: 'right' });

    yPos += 8;
  });

  yPos += 2;

  // ========================================
  // 小計・消費税・合計
  // ========================================

  const summaryLabelX = leftColumnX + 130;
  const summaryValueX = leftColumnX + 160;
  const summaryWidth = 30;

  // 小計
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.3);
  doc.rect(summaryLabelX, yPos, summaryWidth, 8);
  doc.rect(summaryValueX, yPos, summaryWidth, 8);

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('小計', summaryLabelX + summaryWidth / 2, yPos + 5.5, { align: 'center' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text(formatCurrency(data.subtotal), summaryValueX + summaryWidth - 3, yPos + 5.5, { align: 'right' });

  yPos += 8;

  // 消費税
  doc.rect(summaryLabelX, yPos, summaryWidth, 8);
  doc.rect(summaryValueX, yPos, summaryWidth, 8);
  doc.setFont('NotoSansJP', 'normal');
  doc.text('消費税(10%)', summaryLabelX + summaryWidth / 2, yPos + 5.5, { align: 'center' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text(formatCurrency(data.tax), summaryValueX + summaryWidth - 3, yPos + 5.5, { align: 'right' });

  yPos += 8;

  // 合計
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.rect(summaryLabelX, yPos, summaryWidth, 8, 'FD');
  doc.rect(summaryValueX, yPos, summaryWidth, 8, 'FD');
  doc.setFont('NotoSansJP', 'normal');
  doc.text('合計', summaryLabelX + summaryWidth / 2, yPos + 5.5, { align: 'center' });
  doc.setFont('NotoSansJP', 'normal');
  doc.text(formatCurrency(data.total), summaryValueX + summaryWidth - 3, yPos + 5.5, { align: 'right' });

  yPos += 15;

  // ========================================
  // お支払期限・振込先情報・備考
  // ========================================

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`お支払期限: ${formatDate(data.dueDate)}`, leftColumnX, yPos);
  yPos += 10;

  // 振込先情報（1行表示）
  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  doc.text('お振込先：りそな銀行 市川支店 （普）1452536 ｶ) ﾈｸｽﾄﾛｹｰｼｮﾝ ﾀﾞｲﾋｮｳﾄﾘｼﾏﾘﾔｸ ｱｶｼﾖｳｲﾁ', leftColumnX, yPos);
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('※ 振込手数料はお客様ご負担でお願いいたします', leftColumnX, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  // 備考（青枠内）
  doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setLineWidth(0.5);

  const notesContent = data.notes || 'なし';
  const notesLines = doc.splitTextToSize(notesContent, 180);
  const notesHeight = Math.max(36, notesLines.length * 5 + 10);

  doc.rect(leftColumnX, yPos, 190, notesHeight);

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text('備考', leftColumnX + 3, yPos + 6);

  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(notesLines, leftColumnX + 3, yPos + 12);

  // ========================================
  // フッター
  // ========================================
  const footerY = 285;
  doc.setFontSize(7);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('© ザイロク 請求書発行サービス', 195, footerY, { align: 'right' });

  // PDFをバッファに変換
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

// ヘルパー関数
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
