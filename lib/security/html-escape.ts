/**
 * HTMLエスケープユーティリティ
 * メール送信時のHTMLインジェクション対策
 */

/**
 * HTML特殊文字をエスケープ
 * XSS/HTMLインジェクション対策
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  }

  return String(text).replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * 改行をHTMLの<br>タグに変換（エスケープ済みテキスト用）
 */
export function nl2br(text: string | null | undefined): string {
  if (!text) return ''
  return escapeHtml(text).replace(/\n/g, '<br>')
}

/**
 * メールアドレスの基本的な形式検証
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 電話番号の基本的な形式検証（日本の電話番号）
 */
export function isValidPhone(phone: string): boolean {
  // 数字、ハイフン、プラス、括弧、スペースのみ許可
  const phoneRegex = /^[\d\-+() ]+$/
  return phoneRegex.test(phone)
}

/**
 * 不審なパターン検出（スクリプトタグ、イベントハンドラーなど）
 */
export function hasSuspiciousPattern(text: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
    /onload=/i,
    /onmouseover=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ]

  return suspiciousPatterns.some(pattern => pattern.test(text))
}
