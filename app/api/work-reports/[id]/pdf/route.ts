import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'
import { drawCompanyName, getTableConfig } from '@/lib/pdf/helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[PDF API] Starting PDF generation for report:', id)
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('[PDF API] User:', user?.id)

    if (!user) {
      console.log('[PDF API] No user found - returning 401')
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

    // 組織情報を取得
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, postal_code, address, phone, fax')
      .eq('id', userData.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json({ error: '組織情報が見つかりません' }, { status: 404 })
    }

    // 作業報告書を取得（リレーション名を明示的に指定）
    const { data: report, error } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites!work_reports_site_id_fkey(
          id,
          name,
          address,
          client:clients!sites_client_id_fkey(
            name,
            address
          )
        ),
        created_by_user:users!work_reports_created_by_fkey(name)
      `
      )
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !report) {
      console.log('[PDF API] Report not found:', error)
      return NextResponse.json({ error: '作業報告書が見つかりません' }, { status: 404 })
    }

    console.log('[PDF API] Report found, generating PDF with jsPDF...')

    // jsPDFでPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // 日本語フォントを読み込んでBase64に変換
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
    console.log('[PDF API] Loading font from:', fontPath)
    const fontData = fs.readFileSync(fontPath)
    console.log('[PDF API] Font file size:', fontData.length, 'bytes')
    const fontBase64 = fontData.toString('base64')
    console.log('[PDF API] Base64 length:', fontBase64.length)

    // 日本語フォントを登録
    try {
      doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64)
      console.log('[PDF API] Font added to VFS')
      doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal')
      console.log('[PDF API] Font registered')
      doc.setFont('NotoSansJP')
      console.log('[PDF API] Font set to NotoSansJP')
    } catch (fontError) {
      console.error('[PDF API] Font registration error:', fontError)
      // フォント登録に失敗してもPDF生成は続行（デフォルトフォント使用）
    }

    let yPos = 15

    // ========================================
    // ヘッダー部分
    // ========================================

    // タイトル（中央配置）
    doc.setFontSize(16)
    doc.setFont('NotoSansJP', 'normal')
    doc.text('作業報告書', 105, yPos, { align: 'center' })

    // 作成日（左端、タイトル上部に揃える）
    doc.setFontSize(8)
    doc.setFont('NotoSansJP', 'normal')
    const createdDate = new Date(report.created_at).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`作成日: ${createdDate}`, 15, yPos)

    // 作業報告書ナンバー（作成日の下）
    doc.text(`報告書No: ${report.report_number || report.id.substring(0, 8)}`, 15, yPos + 4)

    // 角印の右端位置を基準にする
    const sealRightEdge = 185 + 20 // sealX + sealSize

    // 担当印・承認印（角印の右端に揃える）
    const stampBoxSize = 12 // 正方形のサイズ
    const stampHeaderHeight = 4 // 名称エリアの高さ
    const stampY = yPos - 4 // タイトルと高さを揃える

    // 承認印（角印の右端に揃える）
    const approvalX = sealRightEdge - stampBoxSize
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1) // 細く

    // 名称部分（背景グレー）
    doc.setFillColor(240, 240, 240) // 薄いグレー
    doc.rect(approvalX, stampY, stampBoxSize, stampHeaderHeight, 'FD') // F=fill, D=draw
    // 捺印部分（正方形）
    doc.rect(approvalX, stampY + stampHeaderHeight, stampBoxSize, stampBoxSize)
    // 名称テキスト（小さく、上下中央配置）
    doc.setFontSize(5)
    doc.text('承認印', approvalX + stampBoxSize / 2, stampY + stampHeaderHeight / 2 + 1, { align: 'center' })

    // 担当印（承認印の左隣）
    const personInChargeX = approvalX - stampBoxSize - 2
    // 名称部分（背景グレー）
    doc.setFillColor(240, 240, 240)
    doc.rect(personInChargeX, stampY, stampBoxSize, stampHeaderHeight, 'FD')
    // 捺印部分（正方形）
    doc.rect(personInChargeX, stampY + stampHeaderHeight, stampBoxSize, stampBoxSize)
    // 名称テキスト（小さく、上下中央配置）
    doc.text('担当印', personInChargeX + stampBoxSize / 2, stampY + stampHeaderHeight / 2 + 1, { align: 'center' })

    yPos += 8

    // 自社情報と角印（担当印・承認印の下に配置、余白を設ける）
    const stampTotalHeight = stampY + stampHeaderHeight + stampBoxSize
    const companyInfoStartY = stampTotalHeight + 8 // 余白を増やす（5→8）

    // 自社情報（さらに右寄せ）
    const companyInfoX = 150
    let companyInfoY = companyInfoStartY

    // 社名（少し大きく）- 長い場合は会社種別を改行
    doc.setFont('NotoSansJP', 'normal')
    companyInfoY = drawCompanyName(doc, organization.name, companyInfoX, companyInfoY, 50, 9, 7)

    // その他の情報（小さく）
    doc.setFontSize(7)
    doc.text(`〒${organization.postal_code || '-'}`, companyInfoX, companyInfoY)
    companyInfoY += 3.5
    doc.text(organization.address || '-', companyInfoX, companyInfoY)
    companyInfoY += 3.5
    doc.text(`TEL: ${organization.phone || '-'}`, companyInfoX, companyInfoY)
    companyInfoY += 3.5
    if (organization.fax) {
      doc.text(`FAX: ${organization.fax}`, companyInfoX, companyInfoY)
      companyInfoY += 3.5
    }
    doc.text(`作成者: ${report.created_by_user?.name || '-'}`, companyInfoX, companyInfoY)

    // 角印の位置（自社情報の右側）
    const sealX = 185
    const sealY = companyInfoStartY
    const sealSize = 20

    // 角印の枠（将来的に画像に置き換え）
    if (organization.company_seal_url) {
      // TODO: 画像読み込みと配置（将来実装）
      // doc.addImage(sealImage, 'PNG', sealX, sealY, sealSize, sealSize)
    } else {
      // 仮の枠表示
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.rect(sealX, sealY, sealSize, sealSize)
      doc.setFontSize(6)
      doc.setTextColor(150, 150, 150)
      doc.text('角印', sealX + 7, sealY + 11)
      doc.setTextColor(0, 0, 0)
    }

    // 自社情報エリアの高さを計算
    const companyInfoHeight = companyInfoY - companyInfoStartY
    const sealHeight = sealSize
    const companyInfoAreaHeight = Math.max(companyInfoHeight, sealHeight)

    // 取引先情報（自社情報エリアと上下中央揃え）
    const clientInfoStartY = companyInfoStartY + (companyInfoAreaHeight / 2) - 10 // 中央揃え調整

    // 社名ラベル（小さく）+ 社名（大きく）
    let clientYPos = clientInfoStartY
    doc.setFontSize(6)
    doc.setFont('NotoSansJP', 'normal')
    doc.text('社名：', 15, clientYPos)

    doc.setFontSize(12)
    const clientName = report.site?.client?.name || '-'
    doc.text(`${clientName} 様`, 25, clientYPos)
    clientYPos += 2

    // 社名の下に細い線を引く
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    doc.line(15, clientYPos, 120, clientYPos)
    clientYPos += 6

    // 作業現場ラベル（小さく）+ 現場名（通常サイズ）
    doc.setFontSize(6)
    doc.text('作業現場：', 15, clientYPos)

    doc.setFontSize(10)
    const siteName = report.site?.name || '-'
    doc.text(siteName, 33, clientYPos)
    clientYPos += 2

    // 下線を引く（細く）
    doc.setLineWidth(0.1)
    doc.line(15, clientYPos, 120, clientYPos)
    clientYPos += 6

    // 作業場所（詳細）ラベル（小さく）+ 作業場所（通常サイズ）
    doc.setFontSize(6)
    doc.text('作業場所：', 15, clientYPos)

    doc.setFontSize(10)
    const workLocation = report.work_location || '-'
    doc.text(workLocation, 33, clientYPos)
    clientYPos += 2

    // 下線を引く（細く）
    doc.setLineWidth(0.1)
    doc.line(15, clientYPos, 120, clientYPos)
    clientYPos += 3

    // yPosを更新（取引先情報と自社情報エリアの下）
    yPos = Math.max(clientYPos, companyInfoStartY + companyInfoAreaHeight + 8) // 余白を増やす（3→8）

    // ========================================
    // 本文部分（作業内容）
    // ========================================

    // 天気マップ
    const weatherMap: Record<string, string> = {
      sunny: '晴れ',
      cloudy: '曇り',
      rainy: '雨',
      snowy: '雪',
    }

    // 作業日・天気・進捗率
    const reportDate = new Date(report.report_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    // 作業人数（workers配列の長さ）
    const workerCount = report.workers && Array.isArray(report.workers) ? report.workers.length : 0

    // 2列レイアウト: 左側3項目、右側3項目
    autoTable(doc, {
      ...getTableConfig({ type: 'info' }),
      startY: yPos,
      body: [
        [
          '作業日',
          reportDate,
          '作業人数',
          `${workerCount}名`,
        ],
        [
          '開始時間',
          report.work_start_time || '-',
          '天気',
          weatherMap[report.weather as keyof typeof weatherMap] || '-',
        ],
        [
          '終了時間',
          report.work_end_time || '-',
          '進捗率',
          report.progress_rate !== null ? `${report.progress_rate}%` : '-',
        ],
      ],
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'normal', fillColor: [240, 240, 240] },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, fontStyle: 'normal', fillColor: [240, 240, 240] },
        3: { cellWidth: 70 },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 5

    // 作業員（帯同作業員がいる場合のみ表示）
    // TODO: 帯同作業員機能実装後に有効化
    // 現在はworkersに自分以外のデータがある場合のみ表示
    if (report.workers && Array.isArray(report.workers) && report.workers.length > 1) {
      // 作成者を最初に配置、それ以外を帯同作業員として後ろに配置
      const creatorId = report.created_by
      const creatorWorker = report.workers.find((w: any) => w.user_id === creatorId)
      const accompaniedWorkers = report.workers.filter((w: any) => w.user_id !== creatorId)

      const sortedWorkers = []
      if (creatorWorker) {
        sortedWorkers.push(creatorWorker)
      }
      sortedWorkers.push(...accompaniedWorkers)

      const workerRows = sortedWorkers.map((worker: any, index: number) => [
        (index + 1).toString(), // No.
        worker.name || '-',
        worker.work_hours !== undefined ? `${worker.work_hours}時間` : '-',
        '-', // 時間外（TODO: データベースに追加予定）
      ])

      autoTable(doc, {
        ...getTableConfig({ type: 'list' }),
        startY: yPos,
        head: [['No.', '作業員', '作業時間', '時間外']],
        body: workerRows,
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // No.
          1: { cellWidth: 70 }, // 作業員
          2: { cellWidth: 52.5, halign: 'center' }, // 作業時間
          3: { cellWidth: 52.5, halign: 'center' }, // 時間外
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 5
    }

    // 作業内容
    autoTable(doc, {
      ...getTableConfig({ type: 'content' }),
      startY: yPos,
      head: [['作業内容']],
      body: [[report.description || '-']],
      columnStyles: {
        0: { cellWidth: 190 },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 5

    // 使用資材・使用道具
    const materialsText = report.materials_used && Array.isArray(report.materials_used)
      ? report.materials_used.join('\n')
      : '-'

    autoTable(doc, {
      ...getTableConfig({ type: 'content' }),
      startY: yPos,
      head: [['使用資材']],
      body: [[materialsText]],
      columnStyles: {
        0: { cellWidth: 190 },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 5

    // 特記事項と備考エリア（2列レイアウト）
    autoTable(doc, {
      ...getTableConfig({ type: 'remarks' }),
      startY: yPos,
      head: [['特記事項', '備考']],
      body: [[report.special_notes || '', report.remarks || '']],
      columnStyles: {
        0: { cellWidth: 95 }, // 特記事項（左半分）
        1: { cellWidth: 95 }, // 備考（右半分）
      },
    })

    // ========================================
    // フッター部分（ページ番号のみ）
    // ========================================
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
    const dateStr = new Date(report.report_date).toISOString().split('T')[0]
    const fileName = `作業報告書_${report.site?.name || '不明'}_${dateStr}.pdf`

    // PDFを返す
    console.log('[PDF API] PDF generated successfully with jsPDF, returning file...')
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('[PDF API] Error generating PDF:', error)
    return NextResponse.json(
      {
        error: 'PDF生成に失敗しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
