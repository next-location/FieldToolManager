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
        rowPageBreak: 'auto',
        styles: {
          ...baseStyles,
          cellPadding: 3,
          ...customStyles,
        },
        headStyles: {
          ...baseHeadStyles,
          ...customHeadStyles,
        },
      }
      break

    case 'content':
      // 作業内容・使用資材等の長文テーブル
      pageBreakConfig = {
        pageBreak: 'auto',
        rowPageBreak: 'auto',
        styles: {
          ...baseStyles,
          cellPadding: 3,
          ...customStyles,
        },
        headStyles: {
          ...baseHeadStyles,
          ...customHeadStyles,
        },
      }
      break

    case 'remarks':
      // 特記事項・備考等の固定高さテーブル
      pageBreakConfig = {
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        styles: {
          ...baseStyles,
          cellPadding: 3,
          minCellHeight: 30,
          ...customStyles,
        },
        headStyles: {
          ...baseHeadStyles,
          ...customHeadStyles,
        },
      }
      break
  }

  return {
    theme: 'grid',
    ...pageBreakConfig,
    ...customConfig,
  }
}

/**
 * カスタムフィールドデータをテーブル形式で描画
 *
 * @param doc - jsPDFインスタンス
 * @param autoTable - autoTable関数
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

    customFieldRows.push([field.field_label, displayValue])
  })

  // テーブルとして描画（2列: ラベル | 値）
  autoTable(doc, {
    startY: startY,
    head: [['項目', '内容']],
    body: customFieldRows,
    ...getTableConfig({
      type: 'content', // 改ページ許可
      customStyles: {
        cellPadding: 2,
      },
    }),
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' }, // ラベル列（太字）
      1: { cellWidth: 'auto' }, // 値列（自動幅）
    },
  })

  return (doc as any).lastAutoTable.finalY
}
