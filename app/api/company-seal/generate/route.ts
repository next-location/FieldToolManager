import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, registerFont } from 'canvas'
import path from 'path'
import type { SealFontStyle } from '@/lib/company-seal/generate-seal'

// フォントを登録（Noto Sans JP）
const fontPath = path.join(process.cwd(), 'lib', 'pdf', 'fonts', 'NotoSansJP-Regular.ttf')
try {
  registerFont(fontPath, { family: 'Noto Sans JP' })
  console.log('[角印生成API] フォント登録成功:', fontPath)
} catch (error) {
  console.error('[角印生成API] フォント登録エラー:', error)
}

// 会社名を縦書き用に分割（簡略版）
function splitCompanyName(name: string): string[][] {
  const length = name.length

  if (length <= 4) {
    // 2x2
    const half = Math.ceil(length / 2)
    return [
      name.substring(0, half).split(''),
      name.substring(half).split('')
    ]
  } else if (length <= 6) {
    // 3x2
    return [
      [name[0], name[1]],
      [name[2], name[3]],
      [name[4] || '', name[5] || '']
    ]
  } else if (length <= 9) {
    // 3x3
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6] || '', name[7] || '', name[8] || '']
    ]
  } else {
    // 4x3
    return [
      [name[0], name[1], name[2]],
      [name[3], name[4], name[5]],
      [name[6], name[7], name[8]],
      [name[9] || '', name[10] || '', name[11] || '']
    ]
  }
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

    // テキスト描画
    const textAreaSize = size - (padding * 2) - (borderWidth * 2)
    const nameColumns = splitCompanyName(companyName)
    const columnCount = nameColumns.length
    const maxRowCount = Math.max(...nameColumns.map(col => col.filter(c => c).length))

    const availableWidth = textAreaSize / columnCount
    const availableHeight = textAreaSize / maxRowCount
    const baseCharSize = Math.min(availableWidth * 0.9, availableHeight * 0.9)

    ctx.fillStyle = '#CC0000'
    ctx.font = `900 ${baseCharSize}px "Noto Sans JP"`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    nameColumns.forEach((column, colIndex) => {
      const columnX = size - padding - borderWidth - (colIndex * availableWidth) - (availableWidth / 2)
      const actualChars = column.filter(c => c)
      const charSpacing = baseCharSize * 1.1
      const totalHeight = (actualChars.length - 1) * charSpacing
      const startY = (size / 2) - (totalHeight / 2)

      actualChars.forEach((char, charIndex) => {
        const charY = startY + (charIndex * charSpacing)
        ctx.fillText(char, columnX, charY)
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