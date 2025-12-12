import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 請求書データを取得
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        organizations (
          name,
          billing_address
        ),
        contracts (
          billing_contact_name,
          billing_contact_email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
    }

    // 請求書明細を取得
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });

    // jsPDFでPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 日本語フォントを読み込んでBase64に変換
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    // 日本語フォントを登録
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    doc.setFont('NotoSansJP');

    // 青色定義（薄く変更）
    const primaryBlue = [100, 149, 237]; // #6495ED CornflowerBlue（薄い青）
    const lightBlue = [240, 248, 255]; // #F0F8FF AliceBlue（より薄い青）

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ja-JP').format(amount);
    };

    const organizationName = invoice.organizations?.name || '';
    const billingAddress = invoice.organizations?.billing_address || '';
    const contactName = invoice.contracts?.billing_contact_name || '';

    let yPos = 25;
    const leftColumnX = 15;
    const rightColumnX = 115;

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
    doc.text(formatDate(invoice.invoice_date), 195, yPos - 5, { align: 'right' });
    doc.setFont('NotoSansJP', 'normal');
    doc.text(`請求書番号: ${invoice.invoice_number}`, 195, yPos + 2, { align: 'right' });
    doc.setFont('NotoSansJP', 'normal');
    doc.text('登録番号：T2040001105536', 195, yPos + 9, { align: 'right' });

    yPos += 15;

    // ========================================
    // 請求先 & 発行者情報（2カラム）
    // ========================================

    // 左側: 請求先情報
    let leftY = yPos + 3; // 3mm下にずらす

    doc.setFontSize(16);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${organizationName} 様`, leftColumnX + 5, leftY); // 5mm右にずらす
    leftY += 4; // 青線を近づける（7mmから4mmに変更）

    // 取引先名の下に青い下線（ページ半分まで）
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.5);
    doc.line(leftColumnX, leftY, 105, leftY); // 210mm / 2 = 105mm（青線の位置は変えない）

    leftY += 6;

    doc.setFontSize(9);
    doc.setFont('NotoSansJP', 'normal');
    if (billingAddress) {
      const addressLines = doc.splitTextToSize(billingAddress, 90);
      doc.text(addressLines, leftColumnX, leftY);
      leftY += addressLines.length * 5;
    }

    // 右側: 発行者情報（1cm下にずらす）
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
      const sealImagePath = path.join(process.env.HOME || '/Users/youichiakashi', 'Desktop', '角印.png');
      const sealImageData = fs.readFileSync(sealImagePath);
      const sealImageBase64 = sealImageData.toString('base64');
      doc.addImage(sealImageBase64, 'PNG', rightColumnX + 60, yPos + 15, 20, 20);
    } catch (error) {
      console.error('角印画像の読み込みに失敗しました:', error);
      // フォールバック: 赤い四角を表示
      doc.setDrawColor(200, 50, 50);
      doc.setFillColor(255, 255, 255);
      doc.setLineWidth(1.5);
      doc.rect(rightColumnX + 60, yPos + 15, 20, 20, 'FD');
      doc.setFontSize(7);
      doc.setFont('NotoSansJP', 'normal');
      doc.setTextColor(200, 50, 50);
      doc.text('角印', rightColumnX + 65, yPos + 25);
    }

    yPos += 45;

    // ========================================
    // ご請求金額ボックス
    // ========================================

    // 「下記の通りご請求申し上げます。」文言
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
    doc.text(`¥ ${formatCurrency(Number(invoice.total_amount))} -`, leftColumnX + 40, yPos + 9);

    // 金額の下線（青色、青い四角の底辺から伸びる）
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.5);
    doc.line(leftColumnX, yPos + 12, 140, yPos + 12);

    yPos += 20;

    // ========================================
    // 請求明細テーブル
    // ========================================

    // テーブルデータ（invoice_itemsから取得、なければデフォルト表示）
    let tableRows: string[][] = [];

    if (invoiceItems && invoiceItems.length > 0) {
      // 明細がある場合は詳細を表示
      tableRows = invoiceItems.map(item => [
        item.description || '',
        `${item.quantity || 1}`,
        formatCurrency(Number(item.unit_price || 0)),
        formatCurrency(Number(item.amount || 0))
      ]);
    } else {
      // 明細がない場合はデフォルト表示
      tableRows = [
        ['サービス利用料', '1', formatCurrency(Number(invoice.amount)), formatCurrency(Number(invoice.amount))],
      ];
    }

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

      // 枠線（内側の線）
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
    // 小計・消費税・合計（上の表の単価・金額列に正確に合わせる）
    // ========================================

    // 上の表の構造：
    // 品番・品名: leftColumnX (15mm), width 100mm (15-115mm)
    // 数量: leftColumnX + 100 (115mm), width 30mm (115-145mm)
    // 単価: leftColumnX + 130 (145mm), width 30mm (145-175mm)
    // 金額: leftColumnX + 160 (175mm), width 30mm (175-205mm)

    const summaryLabelX = leftColumnX + 130; // 単価列の開始位置 (145mm)
    const summaryValueX = leftColumnX + 160; // 金額列の開始位置 (175mm)
    const summaryWidth = 30; // 両列とも30mm幅

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
    doc.text(formatCurrency(Number(invoice.amount)), summaryValueX + summaryWidth - 3, yPos + 5.5, { align: 'right' });

    yPos += 8;

    // 消費税
    doc.rect(summaryLabelX, yPos, summaryWidth, 8);
    doc.rect(summaryValueX, yPos, summaryWidth, 8);
    doc.setFont('NotoSansJP', 'normal');
    doc.text('消費税(10%)', summaryLabelX + summaryWidth / 2, yPos + 5.5, { align: 'center' });
    doc.setFont('NotoSansJP', 'normal');
    doc.text(formatCurrency(Number(invoice.tax_amount)), summaryValueX + summaryWidth - 3, yPos + 5.5, { align: 'right' });

    yPos += 8;

    // 合計
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
    doc.rect(summaryLabelX, yPos, summaryWidth, 8, 'FD');
    doc.rect(summaryValueX, yPos, summaryWidth, 8, 'FD');
    doc.setFont('NotoSansJP', 'normal');
    doc.text('合計', summaryLabelX + summaryWidth / 2, yPos + 5.5, { align: 'center' });
    doc.setFont('NotoSansJP', 'normal');
    doc.text(formatCurrency(Number(invoice.total_amount)), summaryValueX + summaryWidth - 3, yPos + 5.5, { align: 'right' });

    yPos += 15;

    // ========================================
    // お支払期限・振込先情報・備考
    // ========================================

    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`お支払期限: ${formatDate(invoice.due_date)}`, leftColumnX, yPos);
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

    // 備考（青枠内）- 表の幅いっぱい、高さ1.8倍
    doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setLineWidth(0.5);

    const notesContent = invoice.notes || 'なし';
    const notesLines = doc.splitTextToSize(notesContent, 180);
    const notesHeight = Math.max(36, notesLines.length * 5 + 10); // 20 * 1.8 = 36

    doc.rect(leftColumnX, yPos, 190, notesHeight); // 表の幅190mmに合わせる

    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]); // タイトルは青色
    doc.text('備考', leftColumnX + 3, yPos + 6);

    doc.setFontSize(9);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(0, 0, 0); // 内容は黒色
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

    // ファイル名をエンコード（日本語対応）
    const fileName = `請求書_${invoice.invoice_number}_${organizationName}.pdf`;
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodedFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('[Invoice PDF API] Error:', error);
    return NextResponse.json(
      { error: 'PDF生成に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
