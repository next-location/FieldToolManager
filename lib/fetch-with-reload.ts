/**
 * CSRF エラー時に自動リロードするfetchラッパー
 * Vercelキャッシュ問題によるデプロイメント不整合（Deployment Skew）対策
 */

const LAST_RELOAD_KEY = 'last_forced_reload'
const RELOAD_COOLDOWN = 5000 // 5秒以内の連続リロードを防ぐ

/**
 * 強制リロードを実行（無限ループ防止機能付き）
 */
function forceReloadIfNeeded(): boolean {
  const lastReload = localStorage.getItem(LAST_RELOAD_KEY)
  const now = Date.now()

  // 5秒以内に既にリロードしていたら、無限ループを防ぐためにスキップ
  if (lastReload && now - parseInt(lastReload) < RELOAD_COOLDOWN) {
    console.error('[Fetch] リロードクールダウン中。無限リロードを防止しました。')
    return false
  }

  console.log('[Fetch] バージョン不整合検知。最新版を取得するためリロードします。')
  localStorage.setItem(LAST_RELOAD_KEY, now.toString())
  window.location.reload()
  return true
}

/**
 * 元のfetch APIのラッパー
 * 403 Forbiddenエラー（CSRF検証失敗）時に自動リロード
 */
export async function fetchWithReload(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init)

    // 403 Forbidden（CSRF検証失敗の可能性）
    if (response.status === 403) {
      // レスポンスボディを確認してCSRFエラーか判定
      const clonedResponse = response.clone()
      try {
        const data = await clonedResponse.json()
        if (data.error && data.error.includes('セキュリティトークン')) {
          console.warn('[Fetch] CSRF検証エラー検知。古いJSが実行されている可能性があります。')
          forceReloadIfNeeded()
        }
      } catch {
        // JSONパースエラーは無視
      }
    }

    return response
  } catch (error) {
    // ネットワークエラーやJSチャンクが見つからない場合
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('[Fetch] ネットワークエラーまたは古いチャンク参照を検知')
      // この場合もリロードを試みる（JSチャンクが404の可能性）
      forceReloadIfNeeded()
    }
    throw error
  }
}

/**
 * リロードクールダウンをクリア（主にテスト用）
 */
export function clearReloadCooldown(): void {
  localStorage.removeItem(LAST_RELOAD_KEY)
}
