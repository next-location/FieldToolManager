import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'
import { drawCompanyName, getTableConfig } from '@/lib/pdf/helpers'
import { svgToPngDataUrl } from '@/lib/pdf/svg-to-png'
import { generateCompanySeal } from '@/lib/company-seal/generate-seal'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[Invoice PDF API] Starting PDF generation for invoice:', id)

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 組織情報を取得（角印データも含む）
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, postal_code, address, phone, fax, company_seal_url, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder')
      .eq('id', userData.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json({ error: '組織情報が見つかりません' }, { status: 404 })
    }

    // 請求書を取得
    const { data: invoice, error } = await supabase
      .from('billing_invoices')
      .select(`
        *,
        client:clients(name, address, postal_code),
        project:projects(project_name),
        billing_invoice_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !invoice) {
      console.log('[Invoice PDF API] Invoice not found:', error)
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    console.log('[Invoice PDF API] Invoice found, generating PDF...')

    // jsPDFでPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // 日本語フォントを読み込んでBase64に変換
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
    const fontData = fs.readFileSync(fontPath)
    const fontBase64 = fontData.toString('base64')

    // 日本語フォントを登録
    try {
      doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64)
      doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal')
      doc.setFont('NotoSansJP')
    } catch (fontError) {
      console.error('[Invoice PDF API] Font registration error:', fontError)
    }

    let yPos = 15

    // ========================================
    // ヘッダー部分
    // ========================================

    // タイトル（中央配置）
    doc.setFontSize(18)
    doc.setFont('NotoSansJP', 'normal')
    doc.text('請 求 書', 105, yPos, { align: 'center' })

    yPos += 15

    // 取引先情報（左側）
    doc.setFontSize(12)
    const clientName = invoice.client?.name || '-'
    doc.text(`${clientName} 御中`, 15, yPos)

    yPos += 2
    doc.setLineWidth(0.2)
    doc.line(15, yPos, 100, yPos)

    yPos += 8

    // 請求金額（強調表示）
    doc.setFontSize(10)
    doc.text('下記の通りご請求申し上げます', 15, yPos)

    yPos += 8

    doc.setFontSize(10)
    doc.text('ご請求金額', 15, yPos)
    doc.setFontSize(16)
    doc.text(`¥${invoice.total_amount.toLocaleString()}`, 50, yPos)
    doc.setFontSize(10)
    doc.text('（税込）', 100, yPos)

    // 自社情報と角印（右側）
    const companyInfoStartY = 35
    const companyInfoX = 130

    let companyInfoY = companyInfoStartY

    // 社名
    doc.setFont('NotoSansJP', 'normal')
    companyInfoY = drawCompanyName(doc, organization.name, companyInfoX, companyInfoY, 60, 11, 8)

    // その他の情報
    doc.setFontSize(8)
    doc.text(`〒${organization.postal_code || '-'}`, companyInfoX, companyInfoY)
    companyInfoY += 4
    doc.text(organization.address || '-', companyInfoX, companyInfoY)
    companyInfoY += 4
    doc.text(`TEL: ${organization.phone || '-'}`, companyInfoX, companyInfoY)
    companyInfoY += 4
    if (organization.fax) {
      doc.text(`FAX: ${organization.fax}`, companyInfoX, companyInfoY)
      companyInfoY += 4
    }

    // 角印の位置（自社情報の右側）
    const sealX = 175
    const sealY = companyInfoStartY
    const sealSize = 25

    // 角印を表示
    try {
      let sealDataUrl: string | null = null

      if (organization.company_seal_url) {
        const savedSeal = organization.company_seal_url
        if (savedSeal.startsWith('data:image/png;base64,')) {
          sealDataUrl = savedSeal
        } else if (savedSeal.startsWith('data:image/svg+xml;base64,')) {
          sealDataUrl = await svgToPngDataUrl(savedSeal, sealSize * 20, sealSize * 20)
        }
      } else {
        const sealSvg = generateCompanySeal({
          companyName: organization.name,
          fontStyle: 'mincho',
          size: sealSize * 20,
          color: '#CC0000'
        })
        sealDataUrl = await svgToPngDataUrl(sealSvg, sealSize * 20, sealSize * 20)
      }

      if (sealDataUrl) {
        doc.addImage(
          sealDataUrl,
          'PNG',
          sealX,
          sealY,
          sealSize,
          sealSize
        )
      }
    } catch (err) {
      console.error('[Invoice PDF API] Error adding company seal:', err)
    }

    yPos = Math.max(yPos, companyInfoY) + 10

    // 請求情報
    autoTable(doc, {
      ...getTableConfig({ type: 'info' }),
      startY: yPos,
      body: [
        ['請求番号', invoice.invoice_number, '請求日', new Date(invoice.invoice_date).toLocaleDateString('ja-JP')],
        ['工事名', invoice.project?.project_name || invoice.title, '支払期日', new Date(invoice.due_date).toLocaleDateString('ja-JP')],
      ],
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'normal', fillColor: [240, 240, 240] },
        1: { cellWidth: 65 },
        2: { cellWidth: 30, fontStyle: 'normal', fillColor: [240, 240, 240] },
        3: { cellWidth: 65 },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // 件名
    if (invoice.title) {
      doc.setFontSize(11)
      doc.setFont('NotoSansJP', 'normal')
      doc.text(`件名: ${invoice.title}`, 15, yPos)
      yPos += 8
    }

    // 明細テーブル
    const items = invoice.billing_invoice_items?.sort((a: any, b: any) => a.display_order - b.display_order) || []

    const tableData = items.map((item: any) => [
      item.item_name,
      item.description || '',
      item.quantity.toString(),
      item.unit,
      `¥${item.unit_price.toLocaleString()}`,
      `¥${item.amount.toLocaleString()}`,
    ])

    autoTable(doc, {
      ...getTableConfig({ type: 'list' }),
      startY: yPos,
      head: [['項目', '仕様・備考', '数量', '単位', '単価', '金額']],
      body: tableData,
      foot: [
        ['', '', '', '', '小計', `¥${invoice.subtotal.toLocaleString()}`],
        ['', '', '', '', `消費税（${items[0]?.tax_rate || 10}%）`, `¥${invoice.tax_amount.toLocaleString()}`],
        ['', '', '', '', 'ご請求金額', `¥${invoice.total_amount.toLocaleString()}`],
      ],
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 15 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' },
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        lineWidth: 0.1,
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // お振込先情報
    if (organization.bank_name) {
      autoTable(doc, {
        ...getTableConfig({ type: 'info' }),
        startY: yPos,
        head: [['お振込先']],
        body: [
          ['銀行名', organization.bank_name || '-'],
          ['支店名', organization.bank_branch || '-'],
          ['口座種別', organization.bank_account_type === 'savings' ? '普通預金' : organization.bank_account_type === 'current' ? '当座預金' : '-'],
          ['口座番号', organization.bank_account_number || '-'],
          ['口座名義', organization.bank_account_holder || '-'],
        ],
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'normal', fillColor: [240, 240, 240] },
          1: { cellWidth: 150 },
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 5
    }

    // 備考
    if (invoice.notes) {
      autoTable(doc, {
        ...getTableConfig({ type: 'content' }),
        startY: yPos,
        head: [['備考']],
        body: [[invoice.notes]],
        columnStyles: {
          0: { cellWidth: 190 },
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 5
    }

    // 適格請求書の記載
    if (invoice.is_qualified_invoice && invoice.invoice_registration_number) {
      yPos += 5
      doc.setFontSize(8)
      doc.text('※この請求書は適格請求書の記載事項を満たしています。', 15, yPos)
      yPos += 4
      doc.text(`　登録番号: ${invoice.invoice_registration_number}`, 15, yPos)
    }

    // フッター（ページ番号）
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('NotoSansJP', 'normal')
      doc.text(`ページ ${i} / ${pageCount}`, 195, 290, { align: 'right' })
    }

    // PDFをバイト配列として取得
    const pdfBytes = doc.output('arraybuffer')

    // ファイル名を生成
    const dateStr = new Date(invoice.invoice_date).toISOString().split('T')[0]
    const fileName = `請求書_${invoice.invoice_number}_${dateStr}.pdf`

    // PDFを返す
    console.log('[Invoice PDF API] PDF generated successfully')
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('[Invoice PDF API] Error generating PDF:', error)
    return NextResponse.json(
      {
        error: 'PDF生成に失敗しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
