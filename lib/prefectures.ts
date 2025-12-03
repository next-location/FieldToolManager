// 日本の都道府県リスト
export const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
] as const

export type Prefecture = typeof PREFECTURES[number]

/**
 * 住所から都道府県を抽出する
 */
export function extractPrefecture(address: string): Prefecture | null {
  if (!address) return null

  for (const pref of PREFECTURES) {
    if (address.startsWith(pref)) {
      return pref
    }
  }

  return null
}

/**
 * 住所から市区町村を抽出する（都道府県＋市区町村の形式で返す）
 */
export function extractCity(address: string): string | null {
  if (!address) return null

  const prefecture = extractPrefecture(address)
  if (!prefecture) return null

  const cityPart = address.substring(prefecture.length).trim()

  // 市区町村の後の番地などは除外
  const match = cityPart.match(/^([^\d]+(?:市|区|町|村))/)
  if (match) {
    // 都道府県+市区町村の形式で返す（フィルタリング用）
    return `${prefecture}${match[1]}`
  }

  const cityName = cityPart.split(/[\s\d]/)[0]
  if (cityName) {
    return `${prefecture}${cityName}`
  }

  return null
}

/**
 * 住所が検索条件に一致するかチェック
 */
export function matchesAddress(
  address: string,
  prefecture?: string,
  city?: string,
  keyword?: string
): boolean {
  if (!address) return false

  // 都道府県フィルター
  if (prefecture && !address.includes(prefecture)) {
    return false
  }

  // 市区町村フィルター
  if (city && !address.includes(city)) {
    return false
  }

  // キーワード検索
  if (keyword) {
    const normalizedAddress = address.toLowerCase()
    const normalizedKeyword = keyword.toLowerCase()
    return normalizedAddress.includes(normalizedKeyword)
  }

  return true
}
