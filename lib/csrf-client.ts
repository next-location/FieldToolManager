/**
 * クライアント側でCSRFトークンを取得するヘルパー関数
 */

let cachedToken: string | null = null
let tokenExpiry: number = 0

/**
 * CSRFトークンを取得（キャッシュ付き）
 */
export async function getCsrfToken(): Promise<string> {
  // キャッシュが有効な場合は再利用
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  try {
    const response = await fetch('/api/csrf')
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token')
    }

    const { token } = await response.json()

    // トークンをキャッシュ（23時間有効）
    cachedToken = token
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000

    return token
  } catch (error) {
    console.error('Error fetching CSRF token:', error)
    throw error
  }
}

/**
 * CSRFトークンをクリア（ログアウト時などに使用）
 */
export function clearCsrfToken(): void {
  cachedToken = null
  tokenExpiry = 0
}

/**
 * fetch APIのヘルパー関数（CSRF自動付与）
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // GETリクエストの場合はCSRFトークン不要
  if (!options.method || options.method === 'GET') {
    return fetch(url, options)
  }

  // CSRFトークンを取得してヘッダーに追加
  const token = await getCsrfToken()

  const headers = new Headers(options.headers)
  headers.set('X-CSRF-Token', token)

  return fetch(url, {
    ...options,
    headers,
  })
}
