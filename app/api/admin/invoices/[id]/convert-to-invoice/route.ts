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

/**
 * 見積もりから請求書への変換API
 *
 * POST /api/admin/invoices/[id]/convert-to-invoice
 *
 * 承認された見積もりを請求書に変換します。
 * - 新しい請求書レコードを作成（converted_from_invoice_id に見積もりIDを設定）
 * - 見積もりの status は変更しない（履歴として保持）
 * - 請求書PDFを生成してメール送信
 */
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

    // statusがestimate_sentであることを確認
    if (estimate.status !== 'estimate_sent') {
      return NextResponse.json({
        error: `請求書への変換はestimate_sentステータスでのみ可能です。現在のステータス: ${estimate.status}`
      }, { status: 400 });
    }

    if (!estimate.contracts?.billing_contact_email) {
      return NextResponse.json(
        { error: '請求先メールアドレスが登録されていません' },
        { status: 400 }
      );
    }

    // 請求書番号を生成
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toISOString().split('T')[0];

    // 新しい請求書レコードを作成
    // stripe_invoice_idはnullにする（見積もりのStripe Invoiceは再利用しない）
    const { data: newInvoice, error: createError } = await supabase
      .from('invoices')
      .insert({
        organization_id: estimate.organization_id,
        contract_id: estimate.contract_id,
        stripe_invoice_id: null,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        billing_period_start: estimate.billing_period_start,
        billing_period_end: estimate.billing_period_end,
        amount: estimate.amount,
        tax_amount: estimate.tax_amount,
        total_amount: estimate.total_amount,
        status: 'sent',
        document_type: 'invoice',
        converted_from_invoice_id: estimate.id,
        due_date: estimate.due_date,
        is_initial_invoice: estimate.is_initial_invoice,
        notes: estimate.notes,
        sent_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newInvoice) {
      console.error('[Convert to Invoice] Create error:', createError);
      return NextResponse.json(
        { error: '請求書の作成に失敗しました', details: createError?.message },
        { status: 500 }
      );
    }

    // 見積もりの明細をコピー
    const { data: estimateItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', estimate.id);

    if (estimateItems && estimateItems.length > 0) {
      const itemsToInsert = estimateItems.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }));

      await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
    }

    // PDF生成（請求書用）
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
    doc.text('請 求 書', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.text(`請求書番号: ${invoiceNumber}`, 20, yPos);
    yPos += 6;
    doc.text(`発行日: ${formatDate(invoiceDate)}`, 20, yPos);
    yPos += 6;
    doc.text(`お支払い期限: ${formatDate(newInvoice.due_date)}`, 20, yPos);
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
    doc.text('ご請求金額', 20, yPos);
    yPos += 8;
    doc.setFontSize(18);
    doc.text(`¥${formatCurrency(Number(newInvoice.total_amount))}`, 20, yPos);
    doc.setFontSize(10);
    doc.text('（税込）', 70, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.text('請求期間', 20, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.text(
      `${formatDate(newInvoice.billing_period_start)} 〜 ${formatDate(newInvoice.billing_period_end)}`,
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
    doc.text(`¥${formatCurrency(Number(newInvoice.amount))}`, 160, yPos, { align: 'right' });
    yPos += 7;

    doc.text('消費税（10%）', 25, yPos);
    doc.text(`¥${formatCurrency(Number(newInvoice.tax_amount))}`, 160, yPos, { align: 'right' });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(130, yPos - 3, 190, yPos - 3);

    doc.setFontSize(11);
    doc.text('合計金額', 25, yPos);
    doc.text(`¥${formatCurrency(Number(newInvoice.total_amount))}`, 160, yPos, { align: 'right' });
    yPos += 15;

    if (newInvoice.notes) {
      doc.setFontSize(10);
      doc.text('備考', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(newInvoice.notes, 170);
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
        invoiceNumber,
        invoiceDate,
        dueDate: newInvoice.due_date,
        totalAmount: Number(newInvoice.total_amount),
        billingPeriodStart: newInvoice.billing_period_start,
        billingPeriodEnd: newInvoice.billing_period_end,
        pdfBuffer,
        isEstimate: false,
      });

      // ログを記録
      await supabase
        .from('super_admin_logs')
        .insert({
          super_admin_id: session.id,
          action: 'convert_estimate_to_invoice',
          details: {
            estimate_id: estimate.id,
            estimate_number: estimate.invoice_number,
            invoice_id: newInvoice.id,
            invoice_number: newInvoice.invoice_number,
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent'),
        });

      return NextResponse.json({
        success: true,
        message: '見積もりを請求書に変換し、送信しました',
        invoice_id: newInvoice.id,
        invoice_number: newInvoice.invoice_number,
      });
    } catch (emailError: any) {
      console.error('[Convert to Invoice] Email error:', emailError);
      return NextResponse.json(
        { error: 'メール送信に失敗しました: ' + emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Convert to Invoice API] Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
