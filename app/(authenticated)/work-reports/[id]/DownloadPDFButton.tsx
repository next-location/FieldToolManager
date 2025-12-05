'use client'

import { useState } from 'react'
import { generateWorkReportPDF } from '@/lib/pdf/work-report-pdf'
import type { WorkReport } from '@/types/work-reports'

interface DownloadPDFButtonProps {
  report: WorkReport & {
    site?: { name: string; address?: string }
    created_by_user?: { name: string }
  }
}

export function DownloadPDFButton({ report }: DownloadPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)

    try {
      // 写真と添付資料を取得
      const [photosResponse, attachmentsResponse] = await Promise.all([
        fetch(`/api/work-reports/${report.id}/photos`),
        fetch(`/api/work-reports/${report.id}/attachments`),
      ])

      const photos = photosResponse.ok ? await photosResponse.json() : []
      const attachments = attachmentsResponse.ok ? await attachmentsResponse.json() : []

      const pdfData = {
        id: report.id,
        report_date: report.report_date,
        weather: report.weather,
        site_name: report.site?.name || '不明',
        site_address: report.site?.address,
        description: report.description,
        work_location: report.work_location,
        progress_rate: report.progress_rate,
        workers: Array.isArray(report.workers) ? report.workers : [],
        materials_used: Array.isArray(report.materials_used) ? report.materials_used : undefined,
        created_by_name: report.created_by_user?.name || '不明',
        created_at: report.created_at,
        status: report.status,
        custom_fields: report.custom_fields,
        photos: photos,
        attachments: attachments,
      }

      const pdf = generateWorkReportPDF(pdfData)

      // ファイル名を生成
      const dateStr = new Date(report.report_date).toLocaleDateString('ja-JP').replace(/\//g, '-')
      const fileName = `作業報告書_${report.site?.name || '不明'}_${dateStr}.pdf`

      pdf.save(fileName)
    } catch (error) {
      console.error('PDF生成エラー:', error)
      alert('PDFの生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
    >
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {isGenerating ? 'PDF生成中...' : 'PDF出力'}
    </button>
  )
}
