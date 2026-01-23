/**
 * 会社角印の生成
 */

export type SealFontStyle =
  | 'gothic' // ゴシック体
  | 'mincho' // 明朝体
  | 'classical' // 古印体風

interface SealOptions {
  companyName: string
  fontStyle: SealFontStyle
  size?: number // デフォルト 200px
  color?: string // デフォルト '#CC0000'（朱色）
}

// 書体別のフォント設定
const fontStyleConfig: Record<SealFontStyle, {
  fontFamily: string
  fontWeight: string
  letterSpacing?: string
  strokeWidth?: number
  googleFontUrl?: string
}> = {
  gothic: {
    fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',  // ゴシック体
    fontWeight: '900',
  },
  mincho: {
    fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", serif',  // 明朝体
    fontWeight: '900',
  },
  classical: {
    fontFamily: '"WDXL Lubrifont JP N", "YuKyokasho", serif',  // 古印体風（WDXL Lubrifont JP N）
    fontWeight: '400',
    letterSpacing: '-0.05em',
    googleFontUrl: 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=swap',  // 代替フォント
  },
}

/**
 * 会社名を正方形レイアウトに最適化して分割
 * 必要に応じて「之印」「の印」を追加
 */
function splitCompanyNameOptimized(name: string): string[][] {
  const length = name.length

  // 会社形態を識別（前株・後株を判定）
  const companyTypes = ['株式会社', '有限会社', '合同会社', '合資会社', '合名会社']
  let hasCompanyType = false
  let companyType = ''
  let baseName = name
  let isPrefix = false // 前株かどうか

  for (const type of companyTypes) {
    if (name.startsWith(type)) {
      // 前株の場合
      hasCompanyType = true
      companyType = type
      baseName = name.substring(type.length)
      isPrefix = true
      break
    } else if (name.endsWith(type)) {
      // 後株の場合
      hasCompanyType = true
      companyType = type
      baseName = name.substring(0, name.length - type.length)
      isPrefix = false
      break
    }
  }

  // 「株式会社」の特殊処理（前株・後株を保持）
  if (hasCompanyType && companyType === '株式会社') {
    const totalLength = name.length

    if (totalLength === 6) {
      // 6文字: 3×2が最適（例：株式会社AB）
      if (isPrefix) {
        return [
          ['株', '式'],
          ['会', '社'],
          [baseName[0], baseName[1]]
        ]
      } else {
        // 後株の場合（例：AB株式会社）
        return [
          [baseName[0], baseName[1]],
          ['株', '式'],
          ['会', '社']
        ]
      }
    } else if (totalLength === 7) {
      // 7文字: 「之印」を追加して9文字（3×3）にする
      if (isPrefix) {
        // 前株（例：株式会社ABC）
        return [
          ['株', '式', '会'],
          ['社', baseName[0], baseName[1]],
          [baseName[2], '之', '印']
        ]
      } else {
        // 後株（例：A建設株式会社）
        // baseName = "A建設" (3文字)
        return [
          [baseName[0], baseName[1], baseName[2]],
          ['株', '式', '会'],
          ['社', '之', '印']
        ]
      }
    } else if (totalLength === 8) {
      // 8文字: 「の印」を追加して10文字にして、3×3+1
      if (isPrefix) {
        // 前株
        return [
          ['株', '式', '会'],
          ['社', baseName[0], baseName[1]],
          [baseName[2], baseName[3], '印']
        ]
      } else {
        // 後株
        return [
          [baseName[0], baseName[1], baseName[2]],
          [baseName[3], '株', '式'],
          ['会', '社', '印']
        ]
      }
    } else if (totalLength === 9) {
      // 9文字: そのまま3×3
      if (isPrefix) {
        // 前株
        return [
          ['株', '式', '会'],
          ['社', baseName[0], baseName[1]],
          [baseName[2], baseName[3], baseName[4]]
        ]
      } else {
        // 後株（A建設株式会社 = 3文字 + 4文字 = 7文字）
        if (baseName.length === 3) {
          // 3文字の場合（例: A建設）
          return [
            [baseName[0], baseName[1], baseName[2]],
            ['株', '式', '会'],
            ['社', '之', '印']
          ]
        } else if (baseName.length === 5) {
          // 5文字の場合
          return [
            [baseName[0], baseName[1], baseName[2]],
            [baseName[3], baseName[4], '株'],
            ['式', '会', '社']
          ]
        } else {
          // その他のパターン
          return [
            [baseName[0], baseName[1], baseName[2]],
            [baseName[3], baseName[4], '株'],
            ['式', '会', '社']
          ]
        }
      }
    }
  }

  // その他の会社形態または一般的な名前
  // 文字数に応じて最適なレイアウトを選択
  if (length === 5) {
    // 5文字: 「之印」を追加して7文字→3×3にする
    const chars = name.split('')
    return [
      [chars[0], chars[1], chars[2]],
      [chars[3], chars[4], '之'],
      ['印', '', '']
    ]
  } else if (length === 6) {
    // 6文字: 3×2が最適
    return [
      [name[0], name[1]],
      [name[2], name[3]],
      [name[4], name[5]]
    ]
  } else if (length === 7) {
    // 7文字: 「之印」を追加して9文字（3×3）
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6], '之', '印']
    ]
  } else if (length === 8) {
    // 8文字: 3×3にする
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6], name[7], '印']
    ]
  } else if (length === 9) {
    // 9文字: 3×3が最適
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6], name[7], name[8]]
    ]
  } else if (length === 10 || length === 11) {
    // 10-11文字: 「之印」を追加して12文字（4×3）
    const withSuffix = name + '之印'
    return [
      [withSuffix[0], withSuffix[1], withSuffix[2]],
      [withSuffix[3], withSuffix[4], withSuffix[5]],
      [withSuffix[6], withSuffix[7], withSuffix[8]],
      [withSuffix[9], withSuffix[10], withSuffix[11] || '']
    ]
  } else if (length === 12) {
    // 12文字: そのまま4×3または3×4
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6], name[7], name[8]],
      [name[9], name[10], name[11]]
    ]
  } else if (length === 13 || length === 14) {
    // 13-14文字: 「之印」を追加して15文字または16文字（5×3または4×4）
    const withSuffix = name + '之印'
    const total = withSuffix.length
    if (total === 15) {
      // 15文字: 5×3
      return [
        [withSuffix[0], withSuffix[1], withSuffix[2]],
        [withSuffix[3], withSuffix[4], withSuffix[5]],
        [withSuffix[6], withSuffix[7], withSuffix[8]],
        [withSuffix[9], withSuffix[10], withSuffix[11]],
        [withSuffix[12], withSuffix[13], withSuffix[14]]
      ]
    } else {
      // 16文字: 4×4
      return [
        [withSuffix[0], withSuffix[1], withSuffix[2], withSuffix[3]],
        [withSuffix[4], withSuffix[5], withSuffix[6], withSuffix[7]],
        [withSuffix[8], withSuffix[9], withSuffix[10], withSuffix[11]],
        [withSuffix[12], withSuffix[13], withSuffix[14], withSuffix[15]]
      ]
    }
  } else if (length === 15) {
    // 15文字: そのまま5×3
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6], name[7], name[8]],
      [name[9], name[10], name[11]],
      [name[12], name[13], name[14]]
    ]
  } else if (length === 16) {
    // 16文字: 4×4が最適
    return [
      [name[0], name[1], name[2], name[3]],
      [name[4], name[5], name[6], name[7]],
      [name[8], name[9], name[10], name[11]],
      [name[12], name[13], name[14], name[15]]
    ]
  } else if (length <= 4) {
    // 4文字以下: 2×2
    const half = Math.ceil(length / 2)
    return [
      name.substring(0, half).split(''),
      name.substring(half).split('')
    ]
  } else {
    // 17文字以上: 適切な列数で配置
    // 正方形に近い配置を目指す（4×5、5×4、5×5など）
    const sqrt = Math.sqrt(length)
    const cols = Math.ceil(sqrt)
    const rows = Math.ceil(length / cols)

    const result: string[][] = []
    for (let i = 0; i < cols; i++) {
      const start = i * rows
      const end = Math.min(start + rows, length)
      if (start < length) {
        const column = name.substring(start, end).split('')
        // 行数を揃えるために空文字で埋める
        while (column.length < rows) {
          column.push('')
        }
        result.push(column)
      }
    }
    return result
  }
}

/**
 * 角印のSVGを生成
 */
export function generateCompanySeal(options: SealOptions): string {
  const {
    companyName,
    fontStyle,
    size = 200,
    color = '#CC0000'
  } = options

  const fontConfig = fontStyleConfig[fontStyle]
  const borderRadius = size * 0.02 // 角丸を小さく（2%）
  const borderWidth = size * 0.02 // 枠線の太さ（2%）
  const padding = size * 0.02 // 余白を更に最小限に（2%）

  // テキストエリアのサイズ
  const textAreaSize = size - (padding * 2) - (borderWidth * 2)

  // 会社名を分割（最適化版）
  const nameColumns = splitCompanyNameOptimized(companyName)
  const columnCount = nameColumns.length

  // 実際に文字がある行数を計算（空文字を除外）
  const maxRowCount = Math.max(...nameColumns.map(col =>
    col.filter(c => c && c !== '').length
  ))

  // SVGの生成
  const textElements: string[] = []

  // 文字サイズを最大化（余白を最小限に）
  const availableWidth = textAreaSize / columnCount
  const availableHeight = textAreaSize / maxRowCount
  const baseCharSize = Math.min(availableWidth * 0.9, availableHeight * 0.9)

  nameColumns.forEach((column, colIndex) => {
    // 右から左へ配置（縦書きは右から読む）
    const columnX = size - padding - borderWidth - (colIndex * availableWidth) - (availableWidth / 2)

    // 空文字を除外した実際の文字数
    const actualChars = column.filter(c => c && c !== '')
    const actualCharCount = actualChars.length

    // 文字間隔を計算
    const charSpacing = baseCharSize * 1.1  // 文字間隔を適度に

    // 全体の高さを計算
    const totalColumnHeight = (actualCharCount - 1) * charSpacing

    // 中央のY座標を計算して、フォントサイズの約35%下にオフセット（経験値）
    const centerY = size / 2
    const fontOffset = baseCharSize * 0.35  // フォントの視覚的な中心へのオフセット

    // 最初の文字のY座標を計算（全体を中央に配置＋オフセット）
    const startY = centerY - (totalColumnHeight / 2) + fontOffset

    actualChars.forEach((char, charIndex) => {
      // 各文字のY座標を計算
      const charY = startY + (charIndex * charSpacing)

      // 書体ごとの特別な設定
      let extraStyle = ''
      if (fontStyle === 'classical') {
        // 古印体は特殊フォントを使用
        extraStyle = `style="font-feature-settings: 'palt' 1;"`
      }

      textElements.push(`
        <text
          x="${columnX}"
          y="${charY}"
          font-family='${fontConfig.fontFamily}'
          font-size="${baseCharSize}"
          font-weight="${fontConfig.fontWeight}"
          ${fontConfig.letterSpacing ? `letter-spacing="${fontConfig.letterSpacing}"` : ''}
          text-anchor="middle"
          fill="${color}"
          ${extraStyle}
        >${char}</text>
      `)
    })
  })

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <!-- 背景（白） -->
      <rect width="${size}" height="${size}" fill="white"/>

      ${textElements.join('')}

      <!-- 角丸の正方形の枠（最後に描画）- 正確な正方形 -->
      <rect
        x="${borderWidth / 2}"
        y="${borderWidth / 2}"
        width="${size - borderWidth}"
        height="${size - borderWidth}"
        rx="${borderRadius}"
        ry="${borderRadius}"
        fill="none"
        stroke="${color}"
        stroke-width="${borderWidth}"
        shape-rendering="geometricPrecision"
      />
    </svg>
  `

  return svg.replace(/\s+/g, ' ').trim()
}

/**
 * 角印のSVGをData URLに変換
 */
export function sealToDataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}