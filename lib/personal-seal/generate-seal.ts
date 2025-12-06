/**
 * 個人印鑑（シャチハタ風）生成ヘルパー
 * 苗字から円形の印鑑SVGを生成
 */

export interface PersonalSealOptions {
  /** 苗字（1〜4文字） */
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

  if (!surname || surname.length === 0 || surname.length > 4) {
    throw new Error('苗字は1〜4文字で指定してください')
  }

  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - strokeWidth
  const fontSize = size * 0.35

  // 縦書きレイアウト計算
  const charHeight = fontSize * 1.1
  const totalHeight = charHeight * surname.length
  const startY = centerY - totalHeight / 2 + fontSize * 0.8

  // 文字のY座標配列
  const charPositions = Array.from({ length: surname.length }, (_, i) => ({
    char: surname[i],
    y: startY + i * charHeight,
  }))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- 外円 -->
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />

  <!-- 苗字（縦書き） -->
  <text x="${centerX}" text-anchor="middle" font-family="'Noto Serif JP', serif" font-size="${fontSize}" font-weight="bold" fill="${color}">
    ${charPositions.map(({ char, y }) => `<tspan x="${centerX}" y="${y}">${char}</tspan>`).join('\n    ')}
  </text>
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
