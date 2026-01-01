import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, updateSessionActivity } from '@/lib/auth/impersonation'

export async function middleware(request: NextRequest) {
  console.log('[Middleware] Processing path:', request.nextUrl.pathname)

  // セッション更新（クッキーの設定のみ）
  let response = await updateSession(request)

  // セキュリティヘッダーを追加
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // 本番環境でのみHTTPSを強制
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Content Security Policyの設定（管理画面とAPIは除外）
  if (!request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/api')) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const connectSrc = isDevelopment
      ? "'self' http://localhost:54321 ws://localhost:3000 https://zipcloud.ibsnet.co.jp"
      : "'self' https://*.supabase.co wss://*.supabase.co https://zipcloud.ibsnet.co.jp"

    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https: http://localhost:54321; " +
      "font-src 'self' data:; " +
      `connect-src ${connectSrc}; ` +
      "frame-ancestors 'none';"
    )
  }

  // メンテナンスモードチェック（管理画面・API・静的ファイル以外）
  if (!request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/api') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.startsWith('/favicon') &&
      !request.nextUrl.pathname.startsWith('/maintenance') &&
      !request.nextUrl.pathname.includes('.')) {

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: settings } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'system_config')
      .single()

    if (settings?.value?.maintenanceMode === true) {
      console.log('[Middleware] Maintenance mode is ON, redirecting to /maintenance')
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  }

  // マルチテナント検証（開発・本番共通）
  const hostname = request.headers.get('host') || ''

  // サブドメインを抽出
  const subdomain = extractSubdomain(hostname)

  // ルートパスの処理
  if (request.nextUrl.pathname === '/') {
    // サブドメインがある場合は、認証済みユーザーを/dashboardにリダイレクト
    if (subdomain) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        console.log('[Middleware] Authenticated user accessing root, redirecting to /dashboard')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      // サブドメインなしの場合はランディングページを表示
      console.log('[Middleware] No subdomain, showing landing page')
      return response
    }
  }

  // スーパー管理者画面への日本国内IP制限チェック
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const ipRestrictionEnabled = await isIPRestrictionEnabled()

    if (ipRestrictionEnabled) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                       request.headers.get('x-real-ip') ||
                       'unknown'

      console.log('[Middleware] Admin access from IP:', clientIP)

      const { isJapaneseIP } = await import('@/lib/security/geoip')
      const isJapan = await isJapaneseIP(clientIP)

      if (!isJapan) {
        console.warn('[Middleware] Blocked non-Japanese IP from admin access:', clientIP)
        return NextResponse.redirect(new URL('/error/region-blocked', request.url))
      }
    }
  }

  // ログイン・公開ページ・API・静的ファイル・スーパーアドミン・エラーページ・メンテナンスページはスキップ
  if (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/favicon') ||
      request.nextUrl.pathname.startsWith('/error') ||
      request.nextUrl.pathname.startsWith('/maintenance') ||
      request.nextUrl.pathname.includes('.')) {
    console.log('[Middleware] Skipping auth check for:', request.nextUrl.pathname)
    return response
  }

  console.log('[Middleware] hostname:', hostname)
  console.log('[Middleware] subdomain:', subdomain)

  // なりすましセッションの検証と更新
  const impersonationToken = request.cookies.get('impersonation_session')?.value
  let isImpersonating = false
  let impersonationPayload = null

  if (impersonationToken) {
    impersonationPayload = await verifySessionToken(impersonationToken)
    if (impersonationPayload) {
      console.log('[Middleware] Valid impersonation session detected')
      isImpersonating = true
      // セッションアクティビティを更新（1分間に1回まで）
      await updateSessionActivity(impersonationToken)
    } else {
      console.log('[Middleware] Invalid impersonation session, deleting cookie')
      // 無効なセッションの場合、Cookieを削除
      response = NextResponse.next(request)
      response.cookies.delete('impersonation_session')
    }
  }

  // サブドメインが存在する場合、組織の検証
  if (subdomain) {
    // サービスロールキーを使用してRLSをバイパス（組織の存在確認のみ）
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 組織が存在するか確認
    const { data: organization, error: orgError } = await supabaseService
      .from('organizations')
      .select('id, is_active')
      .eq('subdomain', subdomain)
      .single()

    console.log('[Middleware] organization:', organization)
    console.log('[Middleware] orgError:', orgError)

    // 組織が見つからないか、非アクティブの場合
    if (!organization || !organization.is_active) {
      console.log('[Middleware] Redirecting to /error/invalid-organization')
      return NextResponse.redirect(new URL('/error/invalid-organization', request.url))
    }

    // なりすましセッション中は通常の認証チェックをスキップ
    if (isImpersonating && impersonationPayload) {
      // なりすましセッションの組織IDとサブドメインの組織IDが一致するか確認
      if (impersonationPayload.organizationId === organization.id) {
        console.log('[Middleware] Impersonation session valid for this organization')
        return response
      } else {
        console.log('[Middleware] Impersonation organization mismatch')
        return NextResponse.redirect(new URL('/error/organization-mismatch', request.url))
      }
    }

    // 通常の認証チェック（なりすましセッションでない場合のみ）
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      // ユーザーの組織とサブドメインの組織が一致しない場合
      if (userData && userData.organization_id !== organization.id) {
        return NextResponse.redirect(new URL('/error/organization-mismatch', request.url))
      }
    }
  }

  return response
}

/**
 * サブドメインを抽出
 * 開発環境: a-kensetsu.localhost:3000 → a-kensetsu
 * 本番環境: a-kensetsu.tool-manager.com → a-kensetsu
 */
function extractSubdomain(hostname: string): string | null {
  // IPアドレスの場合はnullを返す
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
    return null
  }

  // ポート番号を削除
  const hostnameWithoutPort = hostname.split(':')[0]

  // localhost の場合
  if (hostnameWithoutPort.includes('localhost')) {
    // a-kensetsu.localhost → a-kensetsu
    const parts = hostnameWithoutPort.split('.')
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      return parts[0]
    }
    // localhost のみの場合はnull
    return null
  }

  // 本番環境のサブドメイン抽出
  // 例: a-kensetsu.tool-manager.com → a-kensetsu
  const parts = hostnameWithoutPort.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

/**
 * IP制限が有効かどうかをsystem_settingsから取得
 */
async function isIPRestrictionEnabled(): Promise<boolean> {
  try {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: settings } = await supabaseService
      .from('system_settings')
      .select('value')
      .eq('key', 'security_settings')
      .single()

    return settings?.value?.ipRestrictionEnabled === true
  } catch (error) {
    console.error('[Middleware] Failed to check IP restriction settings:', error)
    // エラー時はデフォルトで有効化（セキュリティ優先）
    return true
  }
}

export const config = {
  matcher: [
    /*
     * 以下を除く全てのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコン)
     * - 画像ファイル (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
