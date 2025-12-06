import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

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

    // 作業報告書を取得（リレーション名を明示的に指定）
    const { data: report, error } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites!work_reports_site_id_fkey(name, address),
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

    let yPos = 20

    // タイトル
    doc.setFontSize(20)
    doc.text('作業報告書', 105, yPos, { align: 'center' })
    yPos += 15

    // 天気マップ
    const weatherMap: Record<string, string> = {
      sunny: '晴れ',
      cloudy: '曇り',
      rainy: '雨',
      snowy: '雪',
    }

    // ステータスマップ
    const statusMap: Record<string, string> = {
      draft: '下書き',
      submitted: '提出済',
      approved: '承認済',
      rejected: '差戻',
    }

    // 基本情報
    doc.setFontSize(14)
    doc.text('■ 基本情報', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    const reportDate = new Date(report.report_date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    const basicInfo = [
      `作業日: ${reportDate}`,
      `天気: ${weatherMap[report.weather] || '不明'}`,
      `現場: ${report.site?.name || '不明'}`,
    ]

    if (report.site?.address) {
      basicInfo.push(`住所: ${report.site.address}`)
    }

    if (report.work_location) {
      basicInfo.push(`作業場所（詳細）: ${report.work_location}`)
    }

    if (report.progress_rate !== null && report.progress_rate !== undefined) {
      basicInfo.push(`進捗率: ${report.progress_rate}%`)
    }

    basicInfo.push(`ステータス: ${statusMap[report.status] || report.status}`)

    for (const info of basicInfo) {
      doc.text(info, 25, yPos)
      yPos += 7
    }

    yPos += 5

    // 作業員
    if (report.workers && Array.isArray(report.workers) && report.workers.length > 0) {
      doc.setFontSize(14)
      doc.text('■ 作業員', 20, yPos)
      yPos += 10

      doc.setFontSize(10)
      for (const worker of report.workers) {
        const workHours = worker.work_hours !== undefined ? `${worker.work_hours}時間` : '-'
        doc.text(`${worker.name}: ${workHours}`, 25, yPos)
        yPos += 7
      }

      yPos += 5
    }

    // 作業内容
    doc.setFontSize(14)
    doc.text('■ 作業内容', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    const splitDescription = doc.splitTextToSize(report.description, 170)
    doc.text(splitDescription, 25, yPos)
    yPos += splitDescription.length * 7 + 5

    // 使用資材
    if (report.materials) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.text('■ 使用資材', 20, yPos)
      yPos += 10

      doc.setFontSize(10)
      const splitMaterials = doc.splitTextToSize(report.materials, 170)
      doc.text(splitMaterials, 25, yPos)
      yPos += splitMaterials.length * 7 + 5
    }

    // 使用道具
    if (report.tools) {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.text('■ 使用道具', 20, yPos)
      yPos += 10

      doc.setFontSize(10)
      const splitTools = doc.splitTextToSize(report.tools, 170)
      doc.text(splitTools, 25, yPos)
      yPos += splitTools.length * 7 + 5
    }

    // フッター
    doc.setFontSize(8)
    doc.text(`作成者: ${report.created_by_user?.name || '不明'}`, 20, 280)
    doc.text(`作成日時: ${new Date(report.created_at).toLocaleString('ja-JP')}`, 20, 285)

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
