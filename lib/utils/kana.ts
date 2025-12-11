/**
 * ひらがなをカタカナに変換
 */
export function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * カタカナをひらがなに変換
 */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * ひらがな・カタカナを正規化して比較用の文字列を生成
 * ひらがなに統一して小文字にする
 */
export function normalizeForSearch(str: string): string {
  return katakanaToHiragana(str).toLowerCase();
}

/**
 * ひらがな・カタカナを区別せずに検索
 */
export function includesKana(text: string, searchWord: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const normalizedSearch = normalizeForSearch(searchWord);
  return normalizedText.includes(normalizedSearch);
}
