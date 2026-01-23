import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { generateCompanySeal, sealToDataUrl, type SealFontStyle } from '@/lib/company-seal/generate-seal'

export async function POST(request: NextRequest) {
  try {
    const { companyName, fontStyle } = await request.json()

    console.log('[角印生成API] リクエスト:', { companyName, fontStyle })

    if (!companyName) {
      console.error('[角印生成API] エラー: 会社名なし')
      return NextResponse.json(
        { error: '会社名は必須です' },
        { status: 400 }
      )
    }

    if (!fontStyle || !['gothic', 'mincho', 'classical'].includes(fontStyle)) {
      console.error('[角印生成API] エラー: 無効な書体:', fontStyle)
      return NextResponse.json(
        { error: '有効な書体を選択してください' },
        { status: 400 }
      )
    }

    // 高解像度で生成（表示サイズの4倍）
    const displaySize = 200
    const generateSize = displaySize * 4 // 800px

    // SVGを生成
    console.log('[角印生成API] SVG生成開始')
    const svg = generateCompanySeal({
      companyName,
      fontStyle: fontStyle as SealFontStyle,
      size: generateSize,
      color: '#CC0000'
    })

    console.log('[角印生成API] SVG生成完了 (length:', svg.length, ')')

    // SVGをBufferに変換
    const svgBuffer = Buffer.from(svg)

    // SharpでSVGをPNGに変換（高品質）
    console.log('[角印生成API] PNG変換開始')
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

    console.log('[角印生成API] PNG変換完了 (size:', pngBuffer.length, 'bytes)')

    // Base64エンコード
    const base64 = pngBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    console.log('[角印生成API] 成功')
    return NextResponse.json({
      dataUrl,
      svg: sealToDataUrl(svg), // SVG版も返す（プレビュー用）
    })
  } catch (error) {
    console.error('[角印生成API] エラー:', error)
    return NextResponse.json(
      { error: '角印の生成に失敗しました', details: String(error) },
      { status: 500 }
    )
  }
}