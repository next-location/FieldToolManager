import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface WorkReportPDFData {
  id: string
  report_date: string
  weather: string
  site_name: string
  site_address?: string
  description: string
  work_location?: string
  progress_rate?: number
  workers: Array<{
    name: string
    work_hours?: number
  }>
  materials_used?: string[]
  created_by_name: string
  created_at: string
  status: string
  custom_fields?: Record<string, any>
  photos?: Array<{
    photo_type: string
    caption?: string
    photo_url: string
  }>
  attachments?: Array<{
    file_name: string
    file_size: number
  }>
}

export function generateWorkReportPDF(data: WorkReportPDFData): jsPDF {
  const doc = new jsPDF()

  // フォントサイズ設定
  const titleFontSize = 18
  const headingFontSize = 14
  const bodyFontSize = 10

  let yPosition = 20

  // タイトル
  doc.setFontSize(titleFontSize)
  doc.text('作業報告書', 105, yPosition, { align: 'center' })
  yPosition += 15

  // 基本情報セクション
  doc.setFontSize(headingFontSize)
  doc.text('基本情報', 20, yPosition)
  yPosition += 8

  doc.setFontSize(bodyFontSize)

  // 作業日
  const reportDate = new Date(data.report_date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  doc.text(`作業日: ${reportDate}`, 25, yPosition)
  yPosition += 7

  // 天気
  const weatherMap: Record<string, string> = {
    sunny: '晴れ',
    cloudy: '曇り',
    rainy: '雨',
    snowy: '雪',
    '': '不明',
  }
  doc.text(`天気: ${weatherMap[data.weather] || '不明'}`, 25, yPosition)
  yPosition += 7

  // 現場
  doc.text(`現場: ${data.site_name}`, 25, yPosition)
  yPosition += 7
  if (data.site_address) {
    doc.text(`住所: ${data.site_address}`, 25, yPosition)
    yPosition += 7
  }

  // 作業場所
  if (data.work_location) {
    doc.text(`作業場所: ${data.work_location}`, 25, yPosition)
    yPosition += 7
  }

  // 進捗率
  if (data.progress_rate !== undefined && data.progress_rate !== null) {
    doc.text(`進捗率: ${data.progress_rate}%`, 25, yPosition)
    yPosition += 7
  }

  // ステータス
  const statusMap: Record<string, string> = {
    draft: '下書き',
    submitted: '提出済',
    approved: '承認済',
    rejected: '差戻',
  }
  doc.text(`ステータス: ${statusMap[data.status] || data.status}`, 25, yPosition)
  yPosition += 10

  // 作業員セクション
  if (data.workers && data.workers.length > 0) {
    doc.setFontSize(headingFontSize)
    doc.text('作業員', 20, yPosition)
    yPosition += 8

    const workerRows = data.workers.map((worker) => [
      worker.name,
      worker.work_hours !== undefined ? `${worker.work_hours}時間` : '-',
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['氏名', '作業時間']],
      body: workerRows,
      theme: 'grid',
      styles: { fontSize: bodyFontSize, font: 'helvetica' },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 25 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // カスタムフィールドセクション
  if (data.custom_fields && Object.keys(data.custom_fields).length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    doc.setFontSize(headingFontSize)
    doc.text('業種固有項目', 20, yPosition)
    yPosition += 8

    doc.setFontSize(bodyFontSize)
    Object.entries(data.custom_fields).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean'
        ? (value ? 'はい' : 'いいえ')
        : value?.toString() || '-'
      doc.text(`${key}: ${displayValue}`, 25, yPosition)
      yPosition += 7
    })
    yPosition += 5
  }

  // 作業内容セクション
  doc.setFontSize(headingFontSize)
  if (yPosition > 250) {
    doc.addPage()
    yPosition = 20
  }
  doc.text('作業内容', 20, yPosition)
  yPosition += 8

  doc.setFontSize(bodyFontSize)
  const descriptionLines = doc.splitTextToSize(data.description, 170)
  doc.text(descriptionLines, 25, yPosition)
  yPosition += descriptionLines.length * 7 + 10

  // 使用資材セクション
  if (data.materials_used && data.materials_used.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    doc.setFontSize(headingFontSize)
    doc.text('使用資材', 20, yPosition)
    yPosition += 8

    doc.setFontSize(bodyFontSize)
    data.materials_used.forEach((material) => {
      doc.text(`- ${material}`, 25, yPosition)
      yPosition += 7
    })
    yPosition += 5
  }

  // 写真セクション
  if (data.photos && data.photos.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    doc.setFontSize(headingFontSize)
    doc.text('写真', 20, yPosition)
    yPosition += 8

    doc.setFontSize(bodyFontSize)
    const photoTypeLabels: Record<string, string> = {
      before: '作業前',
      during: '作業中',
      after: '作業後',
      equipment: '使用機材',
      other: 'その他',
    }

    data.photos.forEach((photo, index) => {
      const label = photoTypeLabels[photo.photo_type] || photo.photo_type
      const caption = photo.caption ? ` - ${photo.caption}` : ''
      doc.text(`${index + 1}. ${label}${caption}`, 25, yPosition)
      yPosition += 7
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
    })
    yPosition += 5
  }

  // 添付資料セクション
  if (data.attachments && data.attachments.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    doc.setFontSize(headingFontSize)
    doc.text('添付資料', 20, yPosition)
    yPosition += 8

    doc.setFontSize(bodyFontSize)
    data.attachments.forEach((attachment, index) => {
      const sizeInKB = Math.round(attachment.file_size / 1024)
      doc.text(`${index + 1}. ${attachment.file_name} (${sizeInKB} KB)`, 25, yPosition)
      yPosition += 7
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
    })
    yPosition += 5
  }

  // フッター
  if (yPosition > 250) {
    doc.addPage()
    yPosition = 20
  }
  doc.setFontSize(8)
  doc.text(`作成者: ${data.created_by_name}`, 25, yPosition)
  yPosition += 5
  doc.text(
    `作成日時: ${new Date(data.created_at).toLocaleString('ja-JP')}`,
    25,
    yPosition
  )

  return doc
}
