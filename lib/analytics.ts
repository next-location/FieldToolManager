/**
 * Google Analytics 4 イベントトラッキング用ユーティリティ
 */

// GA4が有効かチェック（環境変数のみ確認、gtagの存在は後で確認）
const isGAEnabled = (): boolean => {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
}

/**
 * gtag関数を安全に実行（準備ができるまで待つ）
 */
function safeGtag(command: string, ...args: any[]) {
  if (typeof window === 'undefined') return

  // gtagがまだ準備できていない場合、dataLayerに直接push
  if (typeof window.gtag === 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(arguments)
  } else {
    window.gtag(command, ...args)
  }
}

/**
 * カスタムイベントを送信
 */
export const trackEvent = (
  eventName: string,
  params?: Record<string, any>
) => {
  if (!isGAEnabled()) return

  console.log('[GA4] Sending event:', eventName, params)
  safeGtag('event', eventName, params || {})
}

/**
 * ページビューを送信（通常は自動だが、重要ページは明示的に送信）
 */
export const trackPageView = (
  pagePath: string,
  pageTitle: string
) => {
  if (!isGAEnabled()) return

  safeGtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  })
}

/**
 * お問い合わせフォーム表示
 */
export const trackContactPageView = () => {
  trackEvent('view_contact_page', {
    page_location: window.location.href,
    event_category: 'engagement',
    event_label: 'contact_page_view',
  })
}

/**
 * 料金プランページ表示
 */
export const trackPricingPageView = () => {
  trackEvent('view_pricing_page', {
    page_location: window.location.href,
    event_category: 'engagement',
    event_label: 'pricing_page_view',
  })
}

/**
 * お問い合わせフォーム送信
 */
export const trackContactFormSubmit = (formData?: {
  companyName?: string
  email?: string
  inquiryType?: string
}) => {
  trackEvent('contact_form_submit', {
    event_category: 'conversion',
    event_label: 'contact_form_submitted',
    inquiry_type: formData?.inquiryType || 'unknown',
    // 個人情報は送信しない（companyName, emailは含めない）
  })
}

/**
 * FAX流入チェック（UTMパラメータ付きアクセス）
 */
export const trackUTMSource = () => {
  if (!isGAEnabled()) return

  const urlParams = new URLSearchParams(window.location.search)
  const utmSource = urlParams.get('utm_source')
  const utmMedium = urlParams.get('utm_medium')
  const utmCampaign = urlParams.get('utm_campaign')

  if (utmSource || utmMedium || utmCampaign) {
    console.log('[GA4] UTM parameters detected:', { utmSource, utmMedium, utmCampaign })
    trackEvent('utm_landing', {
      event_category: 'acquisition',
      utm_source: utmSource || 'unknown',
      utm_medium: utmMedium || 'unknown',
      utm_campaign: utmCampaign || 'unknown',
      page_location: window.location.href,
    })
  }
}

/**
 * トップページ閲覧（重要KPI）
 */
export const trackHomepageView = () => {
  console.log('[GA4] trackHomepageView called')
  trackEvent('view_homepage', {
    event_category: 'engagement',
    event_label: 'homepage_view',
  })

  // UTMパラメータもチェック
  trackUTMSource()
}

// グローバル型定義
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
