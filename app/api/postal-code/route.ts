import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const zipcode = searchParams.get('zipcode')

  if (!zipcode) {
    return NextResponse.json(
      { error: '郵便番号が指定されていません' },
      { status: 400 }
    )
  }

  // 数字以外を削除
  const cleanZipcode = zipcode.replace(/[^0-9]/g, '')

  if (cleanZipcode.length !== 7) {
    return NextResponse.json(
      { error: '郵便番号は7桁で入力してください' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZipcode}`
    )
    const data = await response.json()

    if (data.status === 200 && data.results) {
      const result = data.results[0]
      return NextResponse.json({
        success: true,
        address: `${result.address1}${result.address2}${result.address3}`,
      })
    } else {
      return NextResponse.json(
        { error: '郵便番号が見つかりませんでした' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('郵便番号検索エラー:', error)
    return NextResponse.json(
      { error: '郵便番号検索に失敗しました' },
      { status: 500 }
    )
  }
}
