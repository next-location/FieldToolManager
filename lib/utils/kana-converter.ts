/**
 * ひらがなとカタカナを相互変換するユーティリティ関数
 */

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
 * 検索クエリを正規化（ひらがな・カタカナ両方にマッチするように）
 * 検索クエリをひらがなに統一してから検索
 */
export function normalizeSearchQuery(query: string): string {
  return katakanaToHiragana(query.toLowerCase());
}

/**
 * テキストが検索クエリにマッチするか判定
 * ひらがな・カタカナを区別せずにマッチング
 */
export function matchesSearchQuery(text: string, query: string): boolean {
  if (!text || !query) return false;

  const normalizedText = normalizeSearchQuery(text);
  const normalizedQuery = normalizeSearchQuery(query);

  return normalizedText.includes(normalizedQuery);
}

/**
 * 複数のフィールドのいずれかが検索クエリにマッチするか判定
 */
export function matchesAnyField(fields: (string | null | undefined)[], query: string): boolean {
  if (!query) return true;

  return fields.some(field => {
    if (!field) return false;
    return matchesSearchQuery(field, query);
  });
}