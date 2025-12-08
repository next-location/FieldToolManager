/**
 * SVGデータURLをPNGデータURLに変換
 * Node.js環境で動作するサーバーサイド変換
 */

/**
 * SVG Data URLをPNG Data URLに変換（Canvas API使用）
 * @param svgDataUrl SVGのData URL
 * @param width 画像の幅
 * @param height 画像の高さ
 * @returns PNG Data URL
 */
export async function svgToPngDataUrl(
  svgDataUrl: string,
  width: number = 120,
  height: number = 120
): Promise<string> {
  try {
    // sharp パッケージを動的インポート
    const sharp = await import('sharp')

    // Data URLからBase64部分を抽出
    const base64Data = svgDataUrl.split(',')[1]
    if (!base64Data) {
      throw new Error('Invalid SVG data URL')
    }

    // Base64をBufferに変換
    const svgBuffer = Buffer.from(base64Data, 'base64')

    // SharpでSVGをPNGに変換
    const pngBuffer = await sharp.default(svgBuffer)
      .resize(width, height)
      .png()
      .toBuffer()

    // PNG BufferをData URLに変換
    const pngBase64 = pngBuffer.toString('base64')
    return `data:image/png;base64,${pngBase64}`
  } catch (error) {
    console.error('Error converting SVG to PNG:', error)
    // エラー時は元のSVGを返す
    return svgDataUrl
  }
}