import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import { svgToPngDataUrl } from '@/lib/pdf/svg-to-png'
import { generateCompanySeal } from '@/lib/company-seal/generate-seal'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[RECEIPT API] START - Route handler called')
  const resolvedParams = await params
  console.log('[RECEIPT API] Resolved params:', resolvedParams)

  const supabase = await createClient()
  console.log('[RECEIPT API] Supabase client created')

  try {
    // ユーザー認証チェック
    console.log('[RECEIPT API] Starting auth check...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[RECEIPT API] Auth result:', { hasUser: !!user, authError })

    if (authError || !user) {
      console.log('[RECEIPT API] Auth failed, returning 401')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // ユーザー情報取得
    console.log('[RECEIPT API] Fetching user data...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, name')
      .eq('id', user.id)
      .single()

    console.log('[RECEIPT API] User data result:', {
      hasUserData: !!userData,
      userError,
      org_id: userData?.organization_id
    })

    if (userError || !userData) {
      console.log('[RECEIPT API] User not found, returning 404')
      return new NextResponse('User not found', { status: 404 })
    }

    // 組織情報を取得（インボイス登録番号も含む）
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, postal_code, address, phone, fax, company_seal_url, invoice_registration_number')
      .eq('id', userData?.organization_id)
      .single()

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 })
    }

    // 入金データ取得（領収書は入金のみ）
    console.log('[RECEIPT API] Fetching payment:', {
      id: resolvedParams.id,
      organization_id: userData.organization_id
    })

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:billing_invoices(
          invoice_number,
          subtotal,
          tax_amount,
          total_amount,
          client:clients(name)
        )
      `)
      .eq('id', resolvedParams.id)
      .eq('organization_id', userData.organization_id)
      .eq('payment_type', 'receipt')
      .single()

    console.log('[RECEIPT API] Payment result:', { payment, error: paymentError })

    if (paymentError || !payment) {
      console.log('[RECEIPT API] Payment not found or error')
      return new NextResponse('Payment not found', { status: 404 })
    }

    // PDF生成（A5横向き）
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
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
      console.error('[RECEIPT API] Font registration error:', fontError)
    }

    let yPos = 20

    // ========================================
    // タイトル（中央）
    // ========================================
    doc.setFontSize(16)
    doc.setFont('NotoSansJP', 'normal')
    doc.text('領　収　書', 105, yPos, { align: 'center' })

    yPos += 20 // タイトルから下の間隔を広げる

    // ========================================
    // 左側：取引先情報
    // ========================================
    const leftX = 15
    const rightEdge = 195
    const pageWidth = 210 // A5横向きの幅

    // 取引先名（大きく）
    doc.setFontSize(13)
    const clientName = payment.invoice?.client?.name || '-'
    doc.text(`${clientName} 様`, leftX, yPos)

    // 下線（細く、少し離す）
    yPos += 3
    doc.setLineWidth(0.2)
    doc.line(leftX, yPos, leftX + 80, yPos)
    yPos += 6

    yPos += 10 // 取引先名の下の間隔を広げる

    // 領収金額ボックス（1.5倍の幅で中央配置、高さ1.25倍）
    const boxWidth = 85 * 1.5 // 127.5mm
    const boxHeight = 18 * 1.25 // 22.5mm
    const boxX = (pageWidth - boxWidth) / 2 // 中央配置

    // 説明文（青い四角の左に揃える）
    doc.setFontSize(7)
    doc.text('下記の金額を領収いたしました。', boxX, yPos)
    yPos += 5

    doc.setFillColor(239, 246, 255) // 薄い青色
    doc.rect(boxX, yPos, boxWidth, boxHeight, 'F')
    doc.setFontSize(8)
    doc.text('領収金額', boxX + 2, yPos + 5)
    doc.setFontSize(21.6) // 18 * 1.2
    // 金額を中央寄せ
    doc.text(`¥${Math.floor(payment.amount).toLocaleString()}`, pageWidth / 2, yPos + 16, { align: 'center' })

    // ========================================
    // 右上：発行日・領収書番号・インボイス登録番号
    // ========================================
    let rightY = 20

    // 発行日・領収書番号・インボイス登録番号（右端寄せ）
    const receiptNumber = `R${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${payment.id.substring(0, 8).toUpperCase()}`
    doc.setFontSize(6)
    doc.text(`発行日: ${new Date().toLocaleDateString('ja-JP')}`, rightEdge, rightY, { align: 'right' })
    rightY += 3
    doc.text(`領収書番号: ${receiptNumber}`, rightEdge, rightY, { align: 'right' })
    rightY += 3
    if (organization.invoice_registration_number) {
      doc.text(`登録番号: ${organization.invoice_registration_number}`, rightEdge, rightY, { align: 'right' })
      rightY += 3
    }

    // ========================================
    // 左下：収入印紙枠（点線）
    // ========================================
    const pageHeight = 148 // A5横向きの高さ
    const stampBoxX = leftX
    const stampBoxY = pageHeight - 30
    const stampBoxWidth = 21 // 2.1cm
    const stampBoxHeight = 25 // 2.5cm

    // 点線で枠を描画（細かい点線）
    doc.setLineDash([1, 1]) // より細かい点線パターン
    doc.setLineWidth(0.2)
    doc.rect(stampBoxX, stampBoxY, stampBoxWidth, stampBoxHeight)
    doc.setLineDash([]) // 点線を解除

    // 収入印紙テキスト（2行、小さく）
    doc.setFontSize(6)
    doc.text('収入', stampBoxX + stampBoxWidth / 2, stampBoxY + stampBoxHeight / 2 - 1, { align: 'center' })
    doc.text('印紙', stampBoxX + stampBoxWidth / 2, stampBoxY + stampBoxHeight / 2 + 2, { align: 'center' })

    // ========================================
    // 収入印紙の右側：内訳
    // ========================================
    const breakdownX = stampBoxX + stampBoxWidth + 10
    let breakdownY = stampBoxY + 4

    // 請求書から税抜金額と消費税額を取得、なければ計算
    const subtotal = payment.invoice?.subtotal || Math.floor(payment.amount / 1.1)
    const taxAmount = payment.invoice?.tax_amount || payment.amount - subtotal
    const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 10

    doc.setFontSize(9)
    doc.text('内訳', breakdownX, breakdownY)
    breakdownY += 6

    // 各項目のY座標を保存（自社情報の配置に使用）
    const taxExcludedY = breakdownY
    doc.setFontSize(8)
    doc.text(`税抜金額: ¥${Math.floor(subtotal).toLocaleString()}`, breakdownX, breakdownY)
    breakdownY += 5

    const taxAmountY = breakdownY
    doc.text(`消費税額: ¥${Math.floor(taxAmount).toLocaleString()}`, breakdownX, breakdownY)
    breakdownY += 5

    const taxRateY = breakdownY
    doc.text(`消費税率: ${taxRate.toFixed(0)}%`, breakdownX, breakdownY)

    // ========================================
    // 右下：自社情報と角印（内訳と高さを揃える）
    // ========================================
    // 角印のサイズと位置（自社情報の右側）
    const sealSize = 17
    const sealX = rightEdge - sealSize
    const sealY = taxRateY - sealSize + 3 // 消費税率の位置に合わせる

    // 自社情報（角印の左側、右寄せ）
    const companyInfoX = sealX - 5 // 角印の左側に5mm空ける

    // 担当者 - 消費税率と同じ高さ、内訳と同じサイズ
    doc.setFontSize(8)
    if (userData?.name) {
      doc.text(`担当: ${userData.name}`, companyInfoX, taxRateY, { align: 'right' })
    }

    // 電話番号 - 消費税額と同じ高さ、内訳と同じサイズ
    if (organization.phone) {
      doc.text(`TEL: ${organization.phone}`, companyInfoX, taxAmountY, { align: 'right' })
    }

    // 住所 - 税抜金額と同じ高さ、内訳と同じサイズ
    if (organization.address) {
      doc.text(organization.address, companyInfoX, taxExcludedY, { align: 'right' })
    }

    // 会社名（大きく、住所の上に配置）
    const companyNameY = taxExcludedY - 6
    doc.setFontSize(11)
    doc.text(organization.name, companyInfoX, companyNameY, { align: 'right' })

    // 角印を表示（自社情報の右側）
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
      console.error('[RECEIPT API] Error adding company seal:', err)
    }

    // 但し書き（青い四角の左に揃える、小さく）
    yPos += boxHeight + 5
    doc.setFontSize(7)
    const description = payment.invoice?.invoice_number
      ? `但し、請求書番号 ${payment.invoice.invoice_number} に対する入金として`
      : '但し、入金として'
    doc.text(description, boxX, yPos)

    yPos += 8

    // 備考
    if (payment.notes) {
      const notesBoxX = 15
      const notesBoxWidth = 180
      const notesPadding = 3

      doc.setFontSize(8)
      const noteLines = doc.splitTextToSize(payment.notes, notesBoxWidth - (notesPadding * 2))

      const lineHeight = 4
      const titleHeight = 6
      const minBoxHeight = 25
      const contentHeight = noteLines.length * lineHeight
      const boxHeight = Math.max(minBoxHeight, contentHeight + titleHeight + (notesPadding * 2))

      doc.setLineWidth(0.2)
      doc.rect(notesBoxX, yPos, notesBoxWidth, boxHeight)

      doc.setFontSize(9)
      doc.text('備考', notesBoxX + notesPadding, yPos + notesPadding + 3)

      doc.setFontSize(8)
      doc.text(noteLines, notesBoxX + notesPadding, yPos + notesPadding + titleHeight + 3)

      yPos += boxHeight
    }

    // PDFをバイト配列として取得
    const pdfBytes = doc.output('arraybuffer')

    // ファイル名を生成
    const dateStr = new Date(payment.payment_date).toISOString().split('T')[0]
    const fileName = `領収書_${receiptNumber}_${dateStr}.pdf`

    // PDFを返す（ダウンロード形式）
    console.log('[RECEIPT API] PDF generated successfully')
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })

  } catch (error) {
    console.error('[RECEIPT API] ERROR - Exception caught:', error)
    return new NextResponse('Error generating PDF', { status: 500 })
  }
}
