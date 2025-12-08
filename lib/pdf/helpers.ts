import { jsPDF } from 'jspdf'
import { UserConfig } from 'jspdf-autotable'

/**
 * PDF生成用の共通ヘルパー関数
 */

/**
 * 自社名を描画（長い場合は会社種別を改行）
 *
 * @param doc - jsPDFインスタンス
 * @param companyName - 会社名
 * @param x - X座標
 * @param startY - 開始Y座標
 * @param maxWidth - 最大幅（mm）。これを超える場合に改行処理を行う
 * @param mainFontSize - メイン部分のフォントサイズ（デフォルト: 9）
 * @param companyTypeFontSize - 会社種別のフォントサイズ（デフォルト: 7）
 * @returns 次の描画開始Y座標
 */
export function drawCompanyName(
  doc: jsPDF,
  companyName: string,
  x: number,
  startY: number,
  maxWidth: number = 50,
  mainFontSize: number = 9,
  companyTypeFontSize: number = 7
): number {
  let yPos = startY

  // 会社種別のパターン（前株・後株）
  const companyTypePattern = /^(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人)(.+)$|^(.+)(株式会社|有限会社|合同会社|合資会社|合名会社)$/

  // 現在のフォント設定を保存
  const currentFont = doc.getFont()
  const currentFontSize = doc.getFontSize()

  // 会社名の幅を測定（mainFontSizeで）
  doc.setFontSize(mainFontSize)
  const fullNameWidth = doc.getTextWidth(companyName)

  // 幅がmaxWidthを超える場合のみ改行処理
  if (fullNameWidth > maxWidth) {
    const match = companyName.match(companyTypePattern)

    if (match) {
      // 会社種別が含まれる場合
      if (match[1]) {
        // 前株: 株式会社〇〇
        const companyType = match[1]
        const mainName = match[2]

        doc.setFontSize(companyTypeFontSize)
        doc.text(companyType, x, yPos)
        yPos += 3

        doc.setFontSize(mainFontSize)
        doc.text(mainName, x, yPos)
        yPos += 5
      } else if (match[4]) {
        // 後株: 〇〇株式会社
        const mainName = match[3]
        const companyType = match[4]

        doc.setFontSize(mainFontSize)
        doc.text(mainName, x, yPos)
        yPos += 4

        doc.setFontSize(companyTypeFontSize)
        doc.text(companyType, x, yPos)
        yPos += 4
      }
    } else {
      // 会社種別が含まれない場合はそのまま表示
      doc.setFontSize(mainFontSize)
      doc.text(companyName, x, yPos)
      yPos += 5
    }
  } else {
    // 幅が十分な場合はそのまま表示
    doc.setFontSize(mainFontSize)
    doc.text(companyName, x, yPos)
    yPos += 5
  }

  // フォント設定を復元
  doc.setFont(currentFont.fontName, currentFont.fontStyle)
  doc.setFontSize(currentFontSize)

  return yPos
}

/**
 * autoTableの共通スタイル設定（ページブレーク制御付き）
 *
 * @param options - カスタムオプション
 * @returns autoTableのUserConfig
 */
export function getTableConfig(options: {
  /** テーブルの種類 */
  type: 'info' | 'list' | 'content' | 'remarks'
  /** カスタムスタイル */
  customStyles?: Partial<UserConfig['styles']>
  /** カスタムヘッダースタイル */
  customHeadStyles?: Partial<UserConfig['headStyles']>
  /** その他のカスタム設定 */
  customConfig?: Partial<UserConfig>
}): Partial<UserConfig> {
  const { type, customStyles = {}, customHeadStyles = {}, customConfig = {} } = options

  // 共通スタイル
  const baseStyles: Partial<UserConfig['styles']> = {
    font: 'NotoSansJP',
    fontSize: 8,
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
  }

  // 共通ヘッダースタイル
  const baseHeadStyles: Partial<UserConfig['headStyles']> = {
    fillColor: [240, 240, 240],
    textColor: [0, 0, 0],
    fontStyle: 'normal',
    halign: 'center',
    minCellHeight: 4,
    cellPadding: 2,
  }

  // タイプ別のページブレーク設定
  let pageBreakConfig: Partial<UserConfig> = {}

  switch (type) {
    case 'info':
      // 作業日・作業人数等の情報テーブル
      pageBreakConfig = {
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        styles: {
          ...baseStyles,
          cellPadding: 2,
          minCellHeight: 5,
          ...customStyles,
        },
      }
      break

    case 'list':
      // 作業員リスト等のテーブル
      pageBreakConfig = {
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
        styles: {
          ...baseStyles,
          cellPadding: 1.5,
          minCellHeight: 6,
          ...customStyles,
        },
      }
      break

    case 'content':
      // 作業内容など改ページ可能なテーブル
      pageBreakConfig = {
        pageBreak: 'auto',
        rowPageBreak: 'auto',
        showHead: 'everyPage',
        styles: {
          ...baseStyles,
          cellPadding: 3,
          minCellHeight: 8,
          ...customStyles,
        },
      }
      break

    case 'remarks':
      // 特記事項・備考（改ページ避ける）
      pageBreakConfig = {
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        styles: {
          ...baseStyles,
          cellPadding: 3,
          minCellHeight: 20,
          fontSize: 8,
          ...customStyles,
        },
      }
      break

    default:
      pageBreakConfig = {
        styles: {
          ...baseStyles,
          ...customStyles,
        },
      }
  }

  return {
    ...pageBreakConfig,
    headStyles: {
      ...baseHeadStyles,
      ...customHeadStyles,
    },
    ...customConfig,
  }
}

/**
 * カスタムフィールドをPDFに描画
 *
 * @param doc - jsPDFインスタンス
 * @param autoTable - autoTableライブラリ
 * @param customFieldDefinitions - カスタムフィールド定義配列
 * @param customFieldsData - カスタムフィールド実データ（JSONB）
 * @param startY - 開始Y座標
 * @returns 次の描画開始Y座標
 */
export function drawCustomFields(
  doc: jsPDF,
  autoTable: any,
  customFieldDefinitions: Array<{
    field_key: string
    field_label: string
    field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
    field_options?: string[]
  }>,
  customFieldsData: Record<string, any>,
  startY: number
): number {
  if (!customFieldDefinitions || customFieldDefinitions.length === 0) {
    return startY
  }

  // カスタムフィールドの行データを作成
  const customFieldRows: string[][] = []

  customFieldDefinitions.forEach((field) => {
    const value = customFieldsData[field.field_key]
    let displayValue = '-'

    if (value !== undefined && value !== null && value !== '') {
      if (field.field_type === 'checkbox' && Array.isArray(value)) {
        // チェックボックス: 配列を「,」区切りで表示
        displayValue = value.join(', ')
      } else if (field.field_type === 'date' && typeof value === 'string') {
        // 日付: YYYY-MM-DD形式をそのまま表示
        displayValue = value
      } else {
        displayValue = String(value)
      }
    }

    // field_labelを直接使用（データベースから正しく取得されているはず）
    customFieldRows.push([field.field_label || field.field_key, displayValue])
  })

  // jsPDFのフォントを再設定
  doc.setFont('NotoSansJP', 'normal')

  // テーブルとして描画（2列: ラベル | 値）- 特記事項・備考と同じ横幅
  autoTable(doc, {
    startY: startY,
    head: [['項目', '内容']],
    body: customFieldRows,
    styles: {
      font: 'NotoSansJP',
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      halign: 'center',
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'normal',
      font: 'NotoSansJP',
      halign: 'center',
    },
    bodyStyles: {
      font: 'NotoSansJP',
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: {
        cellWidth: 60,
        fontStyle: 'bold',
        font: 'NotoSansJP',
        halign: 'center',
      },
      1: {
        cellWidth: 130,
        font: 'NotoSansJP',
        halign: 'center',
      },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    // フォントの前処理を行う
    didParseCell: function (data: any) {
      // 全てのセルに対してフォントを明示的に設定
      data.cell.styles.font = 'NotoSansJP'
    },
    // 描画前にフォントを再設定
    willDrawCell: function (data: any) {
      doc.setFont('NotoSansJP', 'normal')
    },
  })

  return (doc as any).lastAutoTable.finalY + 5
}

/**
 * 写真をPDFに埋め込む
 *
 * @param doc - jsPDFインスタンス
 * @param photos - 写真データ（storage_path, caption等を含む）
 * @param supabase - Supabaseクライアント
 * @param startY - 開始Y座標
 * @returns 次の描画開始Y座標
 */
export async function drawPhotos(
  doc: jsPDF,
  photos: Array<{
    id: string
    storage_path: string
    caption?: string | null
  }>,
  supabase: any,
  startY: number
): number {
  if (!photos || photos.length === 0) {
    return startY
  }

  let yPos = startY

  // 写真タイトル
  doc.setFontSize(10)
  doc.setFont('NotoSansJP', 'bold')
  doc.text('写真', 15, yPos)
  yPos += 10

  // 写真を2列で配置
  const photoWidth = 80 // 写真の幅（mm）
  const photoHeight = 60 // 写真の高さ（mm）
  const spacing = 10 // 写真間のスペース
  const leftX = 15 // 左側の写真のX座標
  const rightX = leftX + photoWidth + spacing // 右側の写真のX座標

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const isLeftColumn = i % 2 === 0
    const x = isLeftColumn ? leftX : rightX

    // 新しい行の開始（右列の場合はスキップ）
    if (isLeftColumn && i > 0) {
      yPos += photoHeight + spacing + 10 // 10mmは写真キャプション用
    }

    // ページブレークチェック
    if (yPos + photoHeight + 10 > 280) {
      doc.addPage()
      yPos = 20
    }

    try {
      // Supabase Storageから写真URLを取得
      const { data: urlData } = supabase.storage.from('work-report-photos').getPublicUrl(photo.storage_path)

      if (urlData?.publicUrl) {
        // 写真を配置（エラー時はスキップ）
        try {
          doc.addImage(urlData.publicUrl, 'JPEG', x, yPos, photoWidth, photoHeight)
        } catch (imgError) {
          // 画像追加エラー時は枠だけ表示
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.5)
          doc.rect(x, yPos, photoWidth, photoHeight)
          doc.setFontSize(8)
          doc.setTextColor(150, 150, 150)
          doc.text('画像読み込みエラー', x + photoWidth / 2, yPos + photoHeight / 2, { align: 'center' })
          doc.setTextColor(0, 0, 0)
        }
      } else {
        // 写真が見つからない場合は枠だけ表示
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.rect(x, yPos, photoWidth, photoHeight)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text('写真なし', x + photoWidth / 2, yPos + photoHeight / 2, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // キャプション
      if (photo.caption) {
        doc.setFontSize(8)
        doc.setFont('NotoSansJP', 'normal')
        doc.text(photo.caption, x, yPos + photoHeight + 3)
      }
    } catch (error) {
      console.error('Photo processing error:', error)
    }
  }

  // 最終行の処理
  if (photos.length > 0) {
    const lastRowHasLeftPhoto = (photos.length - 1) % 2 === 0
    yPos += photoHeight + (lastRowHasLeftPhoto ? 10 : 0) + spacing
  }

  return yPos
}