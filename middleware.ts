import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'

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

  // ログイン・公開ページ・API・静的ファイル・スーパーアドミンはスキップ
  if (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/favicon') ||
      request.nextUrl.pathname.includes('.')) {
    console.log('[Middleware] Skipping auth check for:', request.nextUrl.pathname)
    return response
  }

  // マルチテナント検証（開発・本番共通）
  const hostname = request.headers.get('host') || ''

  // サブドメインを抽出
  const subdomain = extractSubdomain(hostname)

  console.log('[Middleware] hostname:', hostname)
  console.log('[Middleware] subdomain:', subdomain)

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

    // ログイン済みユーザーの場合、組織の一致を確認
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
