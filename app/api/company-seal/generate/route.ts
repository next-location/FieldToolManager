import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { generateCompanySeal, sealToDataUrl, type SealFontStyle } from '@/lib/company-seal/generate-seal'

export async function POST(request: NextRequest) {
  try {
    const { companyName, fontStyle } = await request.json()

    if (!companyName) {
      return NextResponse.json(
        { error: '会社名は必須です' },
        { status: 400 }
      )
    }

    if (!fontStyle || !['gothic', 'mincho', 'classical'].includes(fontStyle)) {
      return NextResponse.json(
        { error: '有効な書体を選択してください' },
        { status: 400 }
      )
    }

    // 高解像度で生成（表示サイズの4倍）
    const displaySize = 200
    const generateSize = displaySize * 4 // 800px

    // SVGを生成
    const svg = generateCompanySeal({
      companyName,
      fontStyle: fontStyle as SealFontStyle,
      size: generateSize,
      color: '#CC0000'
    })

    // デバッグ用：SVGを確認
    console.log('Generated SVG length:', svg.length)

    // SVGをBufferに変換
    const svgBuffer = Buffer.from(svg)

    // SharpでSVGをPNGに変換（高品質）
    const pngBuffer = await sharp(svgBuffer)
      .resize(generateSize, generateSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({
        quality: 100,
        compressionLevel: 0 // 無圧縮で最高品質
      })
      .toBuffer()

    // Base64エンコード
    const base64 = pngBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({
      dataUrl,
      svg: sealToDataUrl(svg), // SVG版も返す（プレビュー用）
    })
  } catch (error) {
    console.error('角印生成エラー:', error)
    return NextResponse.json(
      { error: '角印の生成に失敗しました' },
      { status: 500 }
    )
  }
}