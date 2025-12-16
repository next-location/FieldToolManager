/**
 * ひらがなをカタカナに変換
 */
export function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60
    return String.fromCharCode(chr)
  })
}

/**
 * カタカナをひらがなに変換
 */
export function toHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

/**
 * 半角カナを全角カナに変換
 */
export function toFullWidthKana(str: string): string {
  const halfKana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｬｭｮｯ､｡･｢｣ﾞﾟ'
  const fullKana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォャュョッ、。・「」゛゜'

  let result = ''
  for (let i = 0; i < str.length; i++) {
    const index = halfKana.indexOf(str[i])
    if (index >= 0) {
      result += fullKana[index]
    } else {
      result += str[i]
    }
  }
  return result
}

/**
 * 文字列を正規化（半角カナを全角に、英数字を半角に）
 */
export function normalizeJapanese(str: string): string {
  // NFKCで正規化（全角英数を半角に、半角カナを全角に）
  return str.normalize('NFKC')
}