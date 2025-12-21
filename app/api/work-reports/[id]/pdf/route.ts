import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'
import { drawCompanyName, getTableConfig, drawCustomFields, drawPhotos } from '@/lib/pdf/helpers'
import { svgToPngDataUrl } from '@/lib/pdf/svg-to-png'
import { generateCompanySeal } from '@/lib/company-seal/generate-seal'

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

    // 組織情報を取得（角印データも含む）
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, postal_code, address, phone, fax, company_seal_url')
      .eq('id', userData?.organization_id)
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
        created_by_user:users!work_reports_created_by_fkey(name, personal_seal_data),
        approved_by_user:users!work_reports_approved_by_fkey(name, personal_seal_data)
      `
      )
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (error || !report) {
      console.log('[PDF API] Report not found:', error)
      return NextResponse.json({ error: '作業報告書が見つかりません' }, { status: 404 })
    }

    // カスタムフィールド定義を取得
    const { data: customFieldDefinitions } = await supabase
      .from('work_report_custom_fields')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .or(`site_id.eq.${report.site_id},site_id.is.null`)
      .order('display_order', { ascending: true })

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

    // 担当印の印鑑画像を表示（作成者の印鑑データがある場合）
    if (report.created_by_user?.personal_seal_data) {
      try {
        const sealData = report.created_by_user.personal_seal_data
        // Data URLの形式チェック
        if (sealData.startsWith('data:image/svg+xml;base64,')) {
          // SVGをPNGに変換
          const pngDataUrl = await svgToPngDataUrl(sealData, stampBoxSize * 4, stampBoxSize * 4)
          doc.addImage(
            pngDataUrl,
            'PNG',
            personInChargeX + 1,
            stampY + stampHeaderHeight + 1,
            stampBoxSize - 2,
            stampBoxSize - 2
          )
        }
      } catch (err) {
        console.error('[PDF API] Error adding person in charge seal:', err)
        // エラー時は印鑑文字を表示
        try {
          const creatorName = report.created_by_user?.name || ''
          if (creatorName) {
            doc.setFontSize(8)
            doc.setTextColor(204, 0, 0) // 赤色
            doc.text(creatorName.substring(0, 2), personInChargeX + stampBoxSize / 2, stampY + stampHeaderHeight + stampBoxSize / 2, { align: 'center' })
            doc.setTextColor(0, 0, 0) // 黒色に戻す
          }
        } catch (textErr) {
          console.error('[PDF API] Error adding text seal:', textErr)
        }
      }
    }

    // 承認印の印鑑画像を表示（承認者の印鑑データがある場合）
    if (report.approved_by_user?.personal_seal_data && report.status === 'approved') {
      try {
        const sealData = report.approved_by_user.personal_seal_data
        if (sealData.startsWith('data:image/svg+xml;base64,')) {
          // SVGをPNGに変換
          const pngDataUrl = await svgToPngDataUrl(sealData, stampBoxSize * 4, stampBoxSize * 4)
          doc.addImage(
            pngDataUrl,
            'PNG',
            approvalX + 1,
            stampY + stampHeaderHeight + 1,
            stampBoxSize - 2,
            stampBoxSize - 2
          )
        }
      } catch (err) {
        console.error('[PDF API] Error adding approval seal:', err)
        // エラー時は印鑑文字を表示
        try {
          const approverName = report.approved_by_user?.name || ''
          if (approverName) {
            doc.setFontSize(8)
            doc.setTextColor(204, 0, 0) // 赤色
            doc.text(approverName.substring(0, 2), approvalX + stampBoxSize / 2, stampY + stampHeaderHeight + stampBoxSize / 2, { align: 'center' })
            doc.setTextColor(0, 0, 0) // 黒色に戻す
          }
        } catch (textErr) {
          console.error('[PDF API] Error adding text seal:', textErr)
        }
      }
    }

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

    // 保存された角印または新規生成した角印を表示
    try {
      let sealDataUrl: string | null = null

      // 1. まず保存された角印データがあるか確認
      if (organization.company_seal_url) {
        console.log('[PDF API] Using saved company seal')
        const savedSeal = organization.company_seal_url

        // Data URLの形式チェック
        if (savedSeal.startsWith('data:image/png;base64,')) {
          // すでにPNG形式なのでそのまま使用
          sealDataUrl = savedSeal
        } else if (savedSeal.startsWith('data:image/svg+xml;base64,')) {
          // SVG形式の場合はPNGに変換
          sealDataUrl = await svgToPngDataUrl(savedSeal, sealSize * 20, sealSize * 20)
        } else {
          console.error('[PDF API] Unknown seal format:', savedSeal.substring(0, 50))
        }
      } else {
        // 2. 保存された角印がない場合は新規生成
        console.log('[PDF API] Generating new company seal')
        const sealSvg = generateCompanySeal({
          companyName: organization.name,
          fontStyle: 'mincho', // デフォルトで明朝体を使用
          size: sealSize * 20, // 高解像度で生成（400px）
          color: '#CC0000'
        })

        // SVGをPNGに変換
        sealDataUrl = await svgToPngDataUrl(sealSvg, sealSize * 20, sealSize * 20)
      }

      // PDFに角印を追加
      if (sealDataUrl) {
        doc.addImage(
          sealDataUrl,
          'PNG',
          sealX,
          sealY,
          sealSize,
          sealSize
        )
        console.log('[PDF API] Company seal added successfully')
      } else {
        console.log('[PDF API] No seal data available')
      }
    } catch (err) {
      console.error('[PDF API] Error adding company seal:', err)
      // エラー時は枠なしで何も表示しない
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
    const tableConfig = getTableConfig({ type: 'info' })
    autoTable(doc, {
      ...(tableConfig as any),
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
        worker.overtime_hours !== undefined && worker.overtime_hours > 0 ? `${worker.overtime_hours}時間` : '-',
      ])

      autoTable(doc, {
        ...(getTableConfig({ type: 'list' }) as any),
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
      ...(getTableConfig({ type: 'content' }) as any),
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
      ...(getTableConfig({ type: 'content' }) as any),
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
      ...(getTableConfig({ type: 'remarks' }) as any),
      startY: yPos,
      head: [['特記事項', '備考']],
      body: [[report.special_notes || '', report.remarks || '']],
      columnStyles: {
        0: { cellWidth: 95 }, // 特記事項（左半分）
        1: { cellWidth: 95 }, // 備考（右半分）
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 5

    // カスタムフィールド（存在する場合のみ）
    if (customFieldDefinitions && customFieldDefinitions.length > 0) {
      console.log('[PDF API] Custom field definitions:', JSON.stringify(customFieldDefinitions, null, 2))
      console.log('[PDF API] Custom field data:', JSON.stringify(report.custom_fields_data, null, 2))

      // カスタムフィールド定義の形式を確認して修正
      const formattedDefinitions = customFieldDefinitions.map((field: any) => ({
        field_key: field.field_key,
        field_label: field.field_label,
        field_type: field.field_type || 'text',
        field_options: field.field_options || []
      }))

      console.log('[PDF API] Formatted definitions:', JSON.stringify(formattedDefinitions, null, 2))

      yPos = drawCustomFields(
        doc,
        autoTable,
        formattedDefinitions,
        report.custom_fields_data || {},
        yPos
      )
    }

    // 写真データを取得
    const { data: photos } = await supabase
      .from('work_report_photos')
      .select('id, storage_path, caption, display_order')
      .eq('work_report_id', id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    // 写真をPDFに埋め込み
    if (photos && photos.length > 0) {
      yPos = await drawPhotos(doc, photos, supabase, yPos)
    }

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
