import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/work-reports/bulk-pdf - 複数の作業報告書のPDFを一括ダウンロード（ZIP）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { report_ids } = body

    if (!Array.isArray(report_ids) || report_ids.length === 0) {
      return NextResponse.json({ error: '報告書IDが指定されていません' }, { status: 400 })
    }

    // 報告書を一括取得
    const { data: reports, error } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites(id, name, address),
        created_by_user:users!work_reports_created_by_fkey(id, name, email),
        photos:work_report_photos(*),
        attachments:work_report_attachments(*)
      `
      )
      .in('id', report_ids)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    if (error || !reports) {
      return NextResponse.json({ error: '報告書の取得に失敗しました' }, { status: 500 })
    }

    // PDFのURLリストを返す（フロントエンドで個別にダウンロード）
    const pdfUrls = reports.map((report) => ({
      id: report.id,
      url: `/api/work-reports/${report.id}/pdf`,
      filename: `作業報告書_${report.report_date}_${report.site?.name || '現場名なし'}.pdf`,
    }))

    return NextResponse.json({ pdfs: pdfUrls })
  } catch (error) {
    console.error('Bulk PDF error:', error)
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 })
  }
}
