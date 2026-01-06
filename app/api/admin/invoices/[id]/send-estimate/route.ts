import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 見積もりデータを取得
    const { data: estimate, error } = await supabase
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

    if (error || !estimate) {
      return NextResponse.json({ error: '見積もりが見つかりません' }, { status: 404 });
    }

    // document_typeがestimateであることを確認
    if (estimate.document_type !== 'estimate') {
      return NextResponse.json({ error: 'この文書は見積もりではありません' }, { status: 400 });
    }

    // statusがestimateであることを確認
    if (estimate.status !== 'estimate') {
      return NextResponse.json({
        error: `見積もりの送信はestimateステータスでのみ可能です。現在のステータス: ${estimate.status}`
      }, { status: 400 });
    }

    if (!estimate.contracts?.billing_contact_email) {
      return NextResponse.json(
        { error: '請求先メールアドレスが登録されていません' },
        { status: 400 }
      );
    }

    // PDF生成（見積もり用）
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    doc.setFont('NotoSansJP');

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ja-JP').format(amount);
    };

    const organizationName = estimate.organizations?.name || '';
    const billingAddress = estimate.organizations?.billing_address || '';
    const contactName = estimate.contracts?.billing_contact_name || '';

    let yPos = 20;

    doc.setFontSize(20);
    doc.text('お 見 積 書', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.text(`見積書番号: ${estimate.invoice_number}`, 20, yPos);
    yPos += 6;
    doc.text(`発行日: ${formatDate(estimate.invoice_date)}`, 20, yPos);
    yPos += 6;
    doc.text(`有効期限: ${formatDate(estimate.due_date)}`, 20, yPos);
    yPos += 15;

    doc.setFontSize(12);
    doc.text(organizationName + ' 御中', 20, yPos);
    yPos += 7;
    if (contactName) {
      doc.setFontSize(10);
      doc.text(`ご担当: ${contactName} 様`, 20, yPos);
      yPos += 7;
    }
    if (billingAddress) {
      doc.setFontSize(9);
      const addressLines = doc.splitTextToSize(billingAddress, 80);
      doc.text(addressLines, 20, yPos);
      yPos += addressLines.length * 5;
    }
    yPos += 10;

    doc.setFontSize(14);
    doc.text('お見積金額', 20, yPos);
    yPos += 8;
    doc.setFontSize(18);
    doc.text(`¥${formatCurrency(Number(estimate.total_amount))}`, 20, yPos);
    doc.setFontSize(10);
    doc.text('（税込）', 70, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.text('サービス期間', 20, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.text(
      `${formatDate(estimate.billing_period_start)} 〜 ${formatDate(estimate.billing_period_end)}`,
      20,
      yPos
    );
    yPos += 15;

    doc.setFontSize(11);
    doc.text('明細', 20, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 7, 'F');
    doc.text('項目', 25, yPos);
    doc.text('金額', 160, yPos, { align: 'right' });
    yPos += 10;

    doc.setFontSize(9);
    doc.text('サービス利用料', 25, yPos);
    doc.text(`¥${formatCurrency(Number(estimate.amount))}`, 160, yPos, { align: 'right' });
    yPos += 7;

    doc.text('消費税（10%）', 25, yPos);
    doc.text(`¥${formatCurrency(Number(estimate.tax_amount))}`, 160, yPos, { align: 'right' });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(130, yPos - 3, 190, yPos - 3);

    doc.setFontSize(11);
    doc.text('合計金額', 25, yPos);
    doc.text(`¥${formatCurrency(Number(estimate.total_amount))}`, 160, yPos, { align: 'right' });
    yPos += 15;

    if (estimate.notes) {
      doc.setFontSize(10);
      doc.text('備考', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(estimate.notes, 170);
      doc.text(notesLines, 20, yPos);
      yPos += notesLines.length * 5 + 10;
    }

    yPos += 10;
    doc.setFontSize(11);
    doc.text('お振込先', 20, yPos);
    yPos += 7;
    doc.setFontSize(9);
    doc.text('銀行名: ○○銀行', 25, yPos);
    yPos += 5;
    doc.text('支店名: ○○支店', 25, yPos);
    yPos += 5;
    doc.text('口座種別: 普通', 25, yPos);
    yPos += 5;
    doc.text('口座番号: 1234567', 25, yPos);
    yPos += 5;
    doc.text('口座名義: カ）ネクストロケーション', 25, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.text('株式会社ネクストロケーション', 20, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.text('〒107-0062 東京都港区南青山2丁目2番15号 WinAoyamaビル917', 20, yPos);
    yPos += 5;
    doc.text('TEL: 03-XXXX-XXXX', 20, yPos);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // メール送信
    try {
      await sendInvoiceEmail({
        toEmail: estimate.contracts.billing_contact_email,
        organizationName,
        invoiceNumber: estimate.invoice_number,
        invoiceDate: estimate.invoice_date,
        dueDate: estimate.due_date,
        totalAmount: Number(estimate.total_amount),
        billingPeriodStart: estimate.billing_period_start,
        billingPeriodEnd: estimate.billing_period_end,
        pdfBuffer,
        isEstimate: true,
      });

      // 送信日時を更新
      await supabase
        .from('invoices')
        .update({
          status: 'estimate_sent',
          sent_date: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: '見積もりを送信しました',
      });
    } catch (emailError: any) {
      console.error('[Estimate Send] Email error:', emailError);
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Estimate Send API] Error:', error);
    return NextResponse.json(
      { error: '見積もり送信に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
