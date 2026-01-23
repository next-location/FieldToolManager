import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, registerFont } from 'canvas'
import path from 'path'
import type { SealFontStyle } from '@/lib/company-seal/generate-seal'
import { splitCompanyNameOptimized } from '@/lib/company-seal/generate-seal'

// フォントを登録（Noto Sans JP - 複数ウェイト）
const fontsDir = path.join(process.cwd(), 'lib', 'pdf', 'fonts')
try {
  // ゴシック体用（太字）
  registerFont(path.join(fontsDir, 'NotoSansJP-Bold.ttf'), { family: 'Noto Sans JP Gothic' })
  // 明朝体用（中字）
  registerFont(path.join(fontsDir, 'NotoSansJP-Medium.ttf'), { family: 'Noto Sans JP Mincho' })
  console.log('[角印生成API] フォント登録成功')
} catch (error) {
  console.error('[角印生成API] フォント登録エラー:', error)
}

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

    // 高解像度で生成
    const size = 800
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    console.log('[角印生成API] Canvas生成開始')

    // 背景（白）
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)

    // 角印の枠線
    const borderWidth = size * 0.02
    const borderRadius = size * 0.02
    const padding = size * 0.02

    ctx.strokeStyle = '#CC0000'
    ctx.lineWidth = borderWidth
    ctx.beginPath()
    ctx.roundRect(
      borderWidth / 2,
      borderWidth / 2,
      size - borderWidth,
      size - borderWidth,
      borderRadius
    )
    ctx.stroke()

    // テキスト描画（元の最適化ロジックを使用）
    const textAreaSize = size - (padding * 2) - (borderWidth * 2)
    const nameColumns = splitCompanyNameOptimized(companyName)
    const columnCount = nameColumns.length
    const maxRowCount = Math.max(...nameColumns.map(col => col.filter((c: string) => c && c !== '').length))

    const availableWidth = textAreaSize / columnCount
    const availableHeight = textAreaSize / maxRowCount
    const baseCharSize = Math.min(availableWidth * 0.9, availableHeight * 0.9)

    // フォントスタイルに応じたフォントファミリー設定
    const fontFamily = fontStyle === 'mincho' ? 'Noto Sans JP Mincho' : 'Noto Sans JP Gothic'

    ctx.fillStyle = '#CC0000'
    ctx.font = `${baseCharSize}px "${fontFamily}"`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    console.log('[角印生成API] レイアウト:', {
      fontStyle,
      fontFamily,
      columns: columnCount,
      maxRows: maxRowCount,
      charSize: baseCharSize,
      nameColumns
    })

    nameColumns.forEach((column: string[], colIndex: number) => {
      const columnX = size - padding - borderWidth - (colIndex * availableWidth) - (availableWidth / 2)
      const actualChars = column.filter((c: string) => c && c !== '')
      const charSpacing = baseCharSize * 1.05  // 文字間隔を少し詰める
      const totalHeight = (actualChars.length - 1) * charSpacing
      const centerY = size / 2
      // textBaseline: 'middle'なのでオフセット不要、真ん中に配置
      const startY = centerY - (totalHeight / 2)

      actualChars.forEach((char: string, charIndex: number) => {
        const charY = startY + (charIndex * charSpacing)

        // 長音記号「ー」や「〜」は縦書き時に90度回転
        const needsRotation = char === 'ー' || char === '〜' || char === '−'

        if (needsRotation) {
          ctx.save()
          ctx.translate(columnX, charY)
          ctx.rotate(Math.PI / 2) // 90度回転
          ctx.fillText(char, 0, 0)
          ctx.restore()
        } else {
          ctx.fillText(char, columnX, charY)
        }
      })
    })

    console.log('[角印生成API] Canvas描画完了')

    // PNGに変換
    const buffer = canvas.toBuffer('image/png')
    const base64 = buffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    console.log('[角印生成API] 成功 (size:', buffer.length, 'bytes)')

    return NextResponse.json({
      dataUrl,
    })
  } catch (error) {
    console.error('[角印生成API] エラー:', error)
    return NextResponse.json(
      { error: '角印の生成に失敗しました', details: String(error) },
      { status: 500 }
    )
  }
}