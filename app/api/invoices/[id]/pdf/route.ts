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
      .select('organization_id, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 組織情報を取得（角印データ・インボイス番号も含む）
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, postal_code, address, phone, fax, company_seal_url, invoice_registration_number')
      .eq('id', userData?.organization_id)
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
      .eq('organization_id', userData?.organization_id)
      .single()

    if (error || !invoice) {
      console.log('[Invoice PDF API] Invoice not found:', error)
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // 承認チェック: 下書き・提出済み状態の請求書は承認済みのみPDF出力可能
    if ((invoice.status === 'draft' || invoice.status === 'submitted')) {
      console.log('[Invoice PDF API] Invoice not approved yet')
      return NextResponse.json({
        error: 'この請求書は未承認のため、PDF出力できません。上司の承認が必要です。'
      }, { status: 403 })
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

    let yPos = 20

    // ========================================
    // タイトル（中央）
    // ========================================
    doc.setFontSize(16)
    doc.setFont('NotoSansJP', 'normal')
    doc.text('請　求　書', 105, yPos, { align: 'center' })

    yPos += 15

    // ========================================
    // 左側：取引先情報
    // ========================================
    const leftX = 15
    const rightEdge = 195

    // 取引先名（大きく）
    doc.setFontSize(13)
    const clientName = invoice.client?.name || '-'
    doc.text(`${clientName} 様`, leftX, yPos)

    // 下線（細く、少し離す）
    yPos += 3
    doc.setLineWidth(0.2)
    doc.line(leftX, yPos, leftX + 80, yPos)
    yPos += 6

    // 取引先住所
    if (invoice.client?.postal_code) {
      doc.setFontSize(8)
      doc.text(`〒${invoice.client.postal_code}`, leftX, yPos)
      yPos += 4
    }
    if (invoice.client?.address) {
      doc.setFontSize(8)
      doc.text(invoice.client.address, leftX, yPos)
      yPos += 4
    }

    yPos += 8

    // 説明文（金額ボックスの少し上、小さく）
    doc.setFontSize(8)
    doc.text('下記のとおりご請求申し上げます。', leftX, yPos)
    yPos += 5

    // 請求金額ボックス
    doc.setFillColor(239, 246, 255) // 薄い青色
    doc.rect(leftX, yPos, 85, 18, 'F')
    doc.setFontSize(8)
    doc.text('ご請求金額（税込）', leftX + 2, yPos + 5)
    doc.setFontSize(16)
    doc.text(`¥${Math.floor(invoice.total_amount).toLocaleString()}`, leftX + 2, yPos + 14)

    // ========================================
    // 右側：発行者情報（右端寄せ）
    // ========================================
    let rightY = 20

    // 請求番号・登録番号・日付（さらに小さく、右端寄せ）
    doc.setFontSize(6)
    doc.text(`請求番号: ${invoice.invoice_number}`, rightEdge, rightY, { align: 'right' })
    rightY += 3
    if (organization.invoice_registration_number) {
      doc.text(`登録番号: ${organization.invoice_registration_number}`, rightEdge, rightY, { align: 'right' })
      rightY += 3
    }
    doc.text(`請求日: ${new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}`, rightEdge, rightY, { align: 'right' })
    rightY += 3
    doc.text(`支払期日: ${new Date(invoice.due_date).toLocaleDateString('ja-JP')}`, rightEdge, rightY, { align: 'right' })
    rightY += 3

    rightY += 6

    // 会社名（右端寄せ、少し小さく）
    doc.setFontSize(9)
    doc.text(organization.name, rightEdge, rightY, { align: 'right' })
    rightY += 5

    // 住所・電話（右端寄せ）
    doc.setFontSize(8)
    if (organization.address) {
      doc.text(organization.address, rightEdge, rightY, { align: 'right' })
      rightY += 4
    }
    if (organization.phone) {
      doc.text(`TEL: ${organization.phone}`, rightEdge, rightY, { align: 'right' })
      rightY += 4
    }
    if (userData?.name) {
      doc.text(`担当: ${userData.name}`, rightEdge, rightY, { align: 'right' })
      rightY += 4
    }

    // 角印の位置（自社情報の下、右寄せ、少し上に配置）
    const sealSize = 17  // 25 * 2/3 ≈ 17
    const sealX = rightEdge - sealSize
    const sealY = rightY - 2  // 少し上に移動

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

    // 件名セクション（上に移動、小さく）
    yPos = 95

    doc.setFontSize(8)
    doc.text('件名', 15, yPos)
    yPos += 5
    doc.setFontSize(9)
    doc.text(invoice.title, 15, yPos)

    if (invoice.project) {
      yPos += 4
      doc.setFontSize(7)
      doc.text(`工事: ${invoice.project.project_name}`, 15, yPos)
    }

    yPos += 8

    // 明細テーブル（税率列を削除、「明細」テキストを削除）
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
      startY: yPos,
      head: [['項目', '説明', '数量', '単位', '単価', '金額']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 52 },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 26, halign: 'right' },
      },
      headStyles: {
        fillColor: [240, 240, 240],  // 薄いグレーの背景色
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        lineWidth: 0.1,
        font: 'NotoSansJP',
        fontSize: 8,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],  // 白背景（ストライプなし）
        font: 'NotoSansJP',
        fontSize: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],  // 白背景（ストライプなし）
      },
      tableWidth: 180,
      margin: { left: 15 },
      pageBreak: 'auto',           // 自動改ページを許可
      rowPageBreak: 'auto',        // 行の途中での改ページも許可
      showHead: 'everyPage',       // 各ページで見出し行を表示
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // 合計セクション（右寄せ、下に移動）
    const summaryX = 130
    const summaryWidth = 65

    doc.setFontSize(9)
    doc.text('小計:', summaryX, yPos)
    doc.text(`¥${invoice.subtotal.toLocaleString()}`, summaryX + summaryWidth, yPos, { align: 'right' })
    yPos += 5

    doc.text('消費税:', summaryX, yPos)
    doc.text(`¥${Math.floor(invoice.tax_amount).toLocaleString()}`, summaryX + summaryWidth, yPos, { align: 'right' })
    yPos += 5

    doc.setLineWidth(0.3)
    doc.line(summaryX, yPos, summaryX + summaryWidth, yPos)
    yPos += 5

    doc.setFontSize(11)
    doc.text('合計:', summaryX, yPos)
    doc.text(`¥${Math.floor(invoice.total_amount).toLocaleString()}`, summaryX + summaryWidth, yPos, { align: 'right' })

    yPos += 15

    // 備考（一番下部に配置、枠で囲む）
    if (invoice.notes) {
      const notesBoxX = 15
      const notesBoxWidth = 180
      const notesPadding = 3

      // テキストを分割
      doc.setFontSize(8)
      const noteLines = doc.splitTextToSize(invoice.notes, notesBoxWidth - (notesPadding * 2))

      // 枠の高さを計算（タイトル分を追加、最低25mm）
      const lineHeight = 4
      const titleHeight = 6  // タイトル「備考」の高さ
      const minBoxHeight = 25
      const contentHeight = noteLines.length * lineHeight
      const boxHeight = Math.max(minBoxHeight, contentHeight + titleHeight + (notesPadding * 2))

      // 枠を描画
      doc.setLineWidth(0.2)
      doc.rect(notesBoxX, yPos, notesBoxWidth, boxHeight)

      // 備考タイトルを枠内に描画
      doc.setFontSize(9)
      doc.text('備考', notesBoxX + notesPadding, yPos + notesPadding + 3)

      // テキストを枠内に描画（タイトルの下）
      doc.setFontSize(8)
      doc.text(noteLines, notesBoxX + notesPadding, yPos + notesPadding + titleHeight + 3)

      yPos += boxHeight
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