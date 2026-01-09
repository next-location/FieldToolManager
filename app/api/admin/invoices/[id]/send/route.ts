import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { stripe } from '@/lib/stripe/client';
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

    if (!invoice.contracts?.billing_contact_email) {
      return NextResponse.json(
        { error: '請求先メールアドレスが登録されていません' },
        { status: 400 }
      );
    }

    // 見積もりの場合、Stripe Invoiceを確定してPDFを生成
    if (invoice.document_type === 'estimate' && invoice.stripe_invoice_id) {
      try {
        await stripe.invoices.finalizeInvoice(invoice.stripe_invoice_id);
        console.log('[Send Estimate] Stripe Invoice finalized:', invoice.stripe_invoice_id);
      } catch (error: any) {
        console.error('[Send Estimate] Failed to finalize Stripe Invoice:', error);
        return NextResponse.json(
          { error: 'Stripe請求書の確定に失敗しました', details: error.message },
          { status: 500 }
        );
      }
    }

    // PDF生成（同じロジックを使用）
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

    const organizationName = invoice.organizations?.name || '';
    const billingAddress = invoice.organizations?.billing_address || '';
    const contactName = invoice.contracts?.billing_contact_name || '';

    let yPos = 20;

    const documentTitle = invoice.document_type === 'estimate' ? '見 積 書' : '請 求 書';
    doc.setFontSize(20);
    doc.text(documentTitle, 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    const numberLabel = invoice.document_type === 'estimate' ? '見積書番号' : '請求書番号';
    doc.text(`${numberLabel}: ${invoice.invoice_number}`, 20, yPos);
    yPos += 6;
    doc.text(`発行日: ${formatDate(invoice.invoice_date)}`, 20, yPos);
    yPos += 6;
    doc.text(`お支払い期限: ${formatDate(invoice.due_date)}`, 20, yPos);
    yPos += 15;

    doc.setFontSize(11);
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
    doc.text('ご請求金額', 20, yPos);
    yPos += 8;
    doc.setFontSize(18);
    doc.text(`¥${formatCurrency(Number(invoice.total_amount))}`, 20, yPos);
    doc.setFontSize(10);
    doc.text('（税込）', 70, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.text('請求期間', 20, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.text(
      `${formatDate(invoice.billing_period_start)} 〜 ${formatDate(invoice.billing_period_end)}`,
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
    doc.text(`¥${formatCurrency(Number(invoice.amount))}`, 160, yPos, { align: 'right' });
    yPos += 7;

    doc.text('消費税（10%）', 25, yPos);
    doc.text(`¥${formatCurrency(Number(invoice.tax_amount))}`, 160, yPos, { align: 'right' });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(130, yPos - 3, 190, yPos - 3);

    doc.setFontSize(11);
    doc.text('合計金額', 25, yPos);
    doc.text(`¥${formatCurrency(Number(invoice.total_amount))}`, 160, yPos, { align: 'right' });
    yPos += 15;

    if (invoice.notes) {
      doc.setFontSize(10);
      doc.text('備考', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(invoice.notes, 170);
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

    // 角印を追加
    try {
      const stampPath = path.join(process.cwd(), 'public', 'company-stamp.png');
      const stampData = fs.readFileSync(stampPath);
      const stampBase64 = stampData.toString('base64');
      doc.addImage(`data:image/png;base64,${stampBase64}`, 'PNG', 160, 250, 30, 30);
    } catch (error) {
      console.error('[Send Invoice] Failed to add stamp image:', error);
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // メール送信
    try {
      await sendInvoiceEmail({
        toEmail: invoice.contracts.billing_contact_email,
        organizationName,
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        totalAmount: Number(invoice.total_amount),
        billingPeriodStart: invoice.billing_period_start,
        billingPeriodEnd: invoice.billing_period_end,
        pdfBuffer,
      });

      // 送信日時を更新（見積もりの場合はestimate_sent、請求書の場合はsent）
      const newStatus = invoice.document_type === 'estimate' ? 'estimate_sent' : 'sent';
      await supabase
        .from('invoices')
        .update({
          status: newStatus,
          sent_date: new Date().toISOString(),
        })
        .eq('id', id);

      const successMessage = invoice.document_type === 'estimate' ? '見積書を送信しました' : '請求書を送信しました';
      return NextResponse.json({
        success: true,
        message: successMessage,
      });
    } catch (emailError: any) {
      console.error('[Invoice Send] Email error:', emailError);
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Invoice Send API] Error:', error);
    return NextResponse.json(
      { error: '請求書送信に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
