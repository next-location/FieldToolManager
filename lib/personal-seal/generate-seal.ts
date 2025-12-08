/**
 * 個人印鑑（シャチハタ風）生成ヘルパー
 * 苗字から円形の印鑑SVGを生成
 */

export interface PersonalSealOptions {
  /** 苗字 */
  surname: string
  /** 印鑑の直径（px） */
  size?: number
  /** 線の太さ（px） */
  strokeWidth?: number
  /** 色（赤系統） */
  color?: string
}

/**
 * シャチハタ風の円形印鑑SVGを生成
 * @param options 印鑑生成オプション
 * @returns SVG文字列
 */
export function generatePersonalSealSVG(options: PersonalSealOptions): string {
  const {
    surname,
    size = 120,
    strokeWidth = 3,
    color = '#CC0000',
  } = options

  if (!surname || surname.length === 0) {
    throw new Error('苗字を入力してください')
  }

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - strokeWidth

  let textElements: string[] = []

  if (surname.length === 1) {
    // 1文字: 中央に大きく配置
    const fontSize = size * 0.45
    textElements.push(
      `<text x="${centerX}" y="${centerY + fontSize * 0.35}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname}</text>`
    )
  } else if (surname.length === 2) {
    // 2文字: 縦1列に配置
    const fontSize = size * 0.35
    const charHeight = fontSize * 1.1
    const startY = centerY - charHeight / 2 + fontSize * 0.35

    for (let i = 0; i < 2; i++) {
      textElements.push(
        `<text x="${centerX}" y="${startY + i * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }
  } else if (surname.length === 3) {
    // 3文字: 縦1列に配置
    const fontSize = size * 0.28
    const charHeight = fontSize * 1.05
    const totalHeight = charHeight * 2  // 3文字分の高さ
    const startY = centerY - totalHeight / 2 + fontSize * 0.3

    for (let i = 0; i < 3; i++) {
      textElements.push(
        `<text x="${centerX}" y="${startY + i * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }
  } else if (surname.length === 4) {
    // 4文字: 縦2列に配置（2文字×2列）- 右から読む
    const fontSize = size * 0.24
    const charHeight = fontSize * 1.1
    const columnSpace = fontSize * 1.0
    const startY = centerY - charHeight / 2 + fontSize * 0.3

    // 右列（最初の2文字）
    const rightX = centerX + columnSpace / 2
    for (let i = 0; i < 2; i++) {
      textElements.push(
        `<text x="${rightX}" y="${startY + i * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }

    // 左列（後の2文字）
    const leftX = centerX - columnSpace / 2
    for (let i = 2; i < 4; i++) {
      textElements.push(
        `<text x="${leftX}" y="${startY + (i - 2) * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }
  } else if (surname.length === 5) {
    // 5文字: 縦2列に配置（右3文字、左2文字）
    const fontSize = size * 0.20
    const charHeight = fontSize * 1.05
    const columnSpace = fontSize * 0.9

    // 右列（最初の3文字）
    const rightX = centerX + columnSpace / 2
    const rightStartY = centerY - charHeight + fontSize * 0.25
    for (let i = 0; i < 3; i++) {
      textElements.push(
        `<text x="${rightX}" y="${rightStartY + i * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }

    // 左列（後の2文字）
    const leftX = centerX - columnSpace / 2
    const leftStartY = centerY - charHeight / 2 + fontSize * 0.25
    for (let i = 3; i < 5; i++) {
      textElements.push(
        `<text x="${leftX}" y="${leftStartY + (i - 3) * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }
  } else if (surname.length === 6) {
    // 6文字: 縦2列に配置（3文字×2列）
    const fontSize = size * 0.18
    const charHeight = fontSize * 1.05
    const columnSpace = fontSize * 0.8
    const startY = centerY - charHeight + fontSize * 0.2

    // 右列（最初の3文字）
    const rightX = centerX + columnSpace / 2
    for (let i = 0; i < 3; i++) {
      textElements.push(
        `<text x="${rightX}" y="${startY + i * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }

    // 左列（後の3文字）
    const leftX = centerX - columnSpace / 2
    for (let i = 3; i < 6; i++) {
      textElements.push(
        `<text x="${leftX}" y="${startY + (i - 3) * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }
  } else {
    // 7文字以上: 縦2列に配置（右に多く）
    const charPerColumn = Math.ceil(surname.length / 2)
    const fontSize = Math.min(size * 0.16, size * 0.35 / charPerColumn)
    const charHeight = fontSize * 1.0
    const columnSpace = fontSize * 0.7

    // 右列
    const rightX = centerX + columnSpace / 2
    const rightCount = charPerColumn
    const rightStartY = centerY - (rightCount - 1) * charHeight / 2 + fontSize * 0.2
    for (let i = 0; i < rightCount && i < surname.length; i++) {
      textElements.push(
        `<text x="${rightX}" y="${rightStartY + i * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }

    // 左列
    const leftX = centerX - columnSpace / 2
    const leftCount = surname.length - rightCount
    const leftStartY = centerY - (leftCount - 1) * charHeight / 2 + fontSize * 0.2
    for (let i = rightCount; i < surname.length; i++) {
      textElements.push(
        `<text x="${leftX}" y="${leftStartY + (i - rightCount) * charHeight}" text-anchor="middle" font-family="serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${surname[i]}</text>`
      )
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- 外円 -->
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
  <!-- 文字 -->
  ${textElements.join('\n  ')}
</svg>`
}

/**
 * SVGをBase64エンコードされたData URLに変換
 * @param svg SVG文字列
 * @returns data:image/svg+xml;base64,... 形式
 */
export function svgToDataURL(svg: string): string {
  const base64 = Buffer.from(svg, 'utf-8').toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * 苗字から印鑑データを生成（Base64 Data URL）
 * @param surname 苗字
 * @param size 印鑑サイズ（デフォルト: 120px）
 * @returns Base64エンコードされたSVG Data URL
 */
export function generatePersonalSeal(surname: string, size?: number): string {
  const svg = generatePersonalSealSVG({ surname, size })
  return svgToDataURL(svg)
}