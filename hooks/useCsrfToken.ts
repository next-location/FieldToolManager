import { useState, useEffect } from 'react'

/**
 * Cookieから値を取得するヘルパー関数
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

/**
 * CSRFトークンを取得するカスタムフック
 * Double Submit Cookie パターン：CookieからトークンをクライアントサイドReadすることで取得
 * これによりフロントエンドコードのキャッシュ問題を回避
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchToken() {
      console.log('[useCsrfToken] Reading CSRF token from cookie')

      if (mounted) {
        setLoading(true)
      }

      try {
        // まずCookieを確認
        const cookieToken = getCookie('csrf_token_client')

        if (cookieToken) {
          console.log('[useCsrfToken] Token found in cookie:', cookieToken.substring(0, 10) + '...')
          if (mounted) {
            setToken(cookieToken)
            setError(null)
          }
        } else {
          // Cookieにトークンがない場合、APIを呼んで生成
          console.log('[useCsrfToken] No token in cookie, fetching from API')
          const response = await fetch('/api/csrf-token')

          if (!response.ok) {
            throw new Error('Failed to fetch CSRF token')
          }

          const data = await response.json()
          console.log('[useCsrfToken] Received token from API:', data.token?.substring(0, 10) + '...')

          if (mounted) {
            setToken(data.token)
            setError(null)
          }
        }

        console.log('[useCsrfToken] Token set successfully')
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          console.error('[useCsrfToken] Failed to get CSRF token:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
          console.log('[useCsrfToken] Loading complete')
        }
      }
    }

    fetchToken()

    return () => {
      mounted = false
    }
  }, [])

  return { token, loading, error }
}
