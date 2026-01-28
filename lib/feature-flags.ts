/**
 * フィーチャーフラグ管理
 * 新旧メニュー構造の切り替えに使用
 */

/**
 * 新しい設定メニュー構造を使用するかどうか
 * @returns true: 新メニュー使用, false: 旧メニュー使用
 */
export const useNewSettingsMenu = (): boolean => {
  // サーバーサイドでは環境変数をチェック（デフォルトtrue = 新メニュー）
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_USE_NEW_SETTINGS_MENU !== 'false'
  }

  // クライアントサイドではlocalStorageまたは環境変数をチェック
  const localStorageValue = localStorage.getItem('useNewSettingsMenu')

  if (localStorageValue !== null) {
    return localStorageValue === 'true'
  }

  // localStorageに値がない場合は環境変数を使用（デフォルトtrue = 新メニュー）
  return process.env.NEXT_PUBLIC_USE_NEW_SETTINGS_MENU !== 'false'
}

/**
 * 新メニューに切り替える（ブラウザコンソールで使用）
 */
export const enableNewSettingsMenu = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('useNewSettingsMenu', 'true')
    console.log('✅ 新しい設定メニューを有効化しました。ページを更新してください。')
    console.log('💡 location.reload() を実行して反映してください。')
  }
}

/**
 * 旧メニューに戻す（ブラウザコンソールで使用）
 */
export const disableNewSettingsMenu = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('useNewSettingsMenu', 'false')
    console.log('✅ 旧設定メニューに戻しました。ページを更新してください。')
    console.log('💡 location.reload() を実行して反映してください。')
  }
}

// グローバルにアクセス可能にする（デバッグ用）
if (typeof window !== 'undefined') {
  ;(window as any).enableNewSettingsMenu = enableNewSettingsMenu
  ;(window as any).disableNewSettingsMenu = disableNewSettingsMenu
}
