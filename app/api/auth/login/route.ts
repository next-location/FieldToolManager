import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getClientIp,
  checkAccountLockout,
  checkIpRestriction,
  recordLoginAttempt,
  checkAndLockAccount,
  checkPasswordExpiration,
} from '@/lib/security-middleware'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(request: Request) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[LOGIN API] CSRF validation failed')
    return csrfErrorResponse()
  }
  const { email, password } = await request.json()

  console.log('[LOGIN API] Starting login for:', email)
  console.log('[LOGIN API] Password received:', password ? `${password.substring(0, 3)}...` : 'null')

  // IPアドレスとUser-Agentを取得
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const cookieStore = await cookies()

  // Cookieを保存する配列
  const cookiesToSet: Array<{ name: string; value: string; options: any }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value
          console.log('[LOGIN API COOKIE] get:', name, value ? 'found' : 'not found')
          return value
        },
        set(name: string, value: string, options: any) {
          console.log('[LOGIN API COOKIE] set:', name, 'value length:', value.length)
          // Cookieを配列に保存
          cookiesToSet.push({ name, value, options })
        },
        remove(name: string, options: any) {
          console.log('[LOGIN API COOKIE] remove:', name)
          // 削除用のCookieを配列に保存
          cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } })
        },
      },
    }
  )

  // アカウントロックアウトチェック
  const lockoutStatus = await checkAccountLockout(email)
  if (lockoutStatus.locked) {
    await recordLoginAttempt(email, ipAddress, userAgent, false, 'account_locked')
    const response = NextResponse.json(
      {
        error: `アカウントがロックされています。${lockoutStatus.lockedUntil?.toLocaleString('ja-JP')}まで待ってください。`,
      },
      { status: 423 }
    )
    // Cookieを適用
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  // ServiceRoleKeyでユーザー情報を取得（RLS回避）
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userInfo } = await supabaseAdmin
    .from('users')
    .select('id, organization_id')
    .eq('email', email)
    .single()


  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log('[LOGIN API] Sign in result:', {
    hasSession: !!data.session,
    hasUser: !!data.user,
    error: error?.message
  })

  if (error) {
    console.error('[LOGIN API] Error:', error.message)

    // ログイン失敗を記録
    await recordLoginAttempt(email, ipAddress, userAgent, false, 'invalid_credentials')

    // ロックアウトチェック
    if (userInfo?.organization_id) {
      const lockCheck = await checkAndLockAccount(email, userInfo.organization_id)
      if (lockCheck.shouldLock) {
        const response = NextResponse.json(
          {
            error: `ログイン試行回数が上限に達しました。アカウントがロックされました。`,
          },
          { status: 423 }
        )
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        return response
      }

      // 残り試行回数を通知
      const remainingAttempts = 5 - lockCheck.attemptsCount
      if (remainingAttempts > 0 && remainingAttempts <= 3) {
        const response = NextResponse.json(
          {
            error: `メールアドレスまたはパスワードが正しくありません。残り${remainingAttempts}回の試行が可能です。`,
          },
          { status: 400 }
        )
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        return response
      }
    }

    const response = NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません。' }, { status: 400 })
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  if (!data.session) {
    console.error('[LOGIN API] No session created')
    await recordLoginAttempt(email, ipAddress, userAgent, false, 'no_session')
    const response = NextResponse.json({ error: 'セッションの作成に失敗しました' }, { status: 400 })
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  // 2FA確認（AdminクライアントでRLS回避）
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('two_factor_enabled, two_factor_method, two_factor_email, password_expires_at, force_password_change, role, organization_id')
    .eq('id', data.user.id)
    .single()

  if (userError) {
    console.error('[LOGIN API] Failed to fetch user data:', userError)
    const response = NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  // システム設定で権限別2FA必須をチェック
  const { data: systemSettings } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'security_settings')
    .single()

  let require2FA = userData.two_factor_enabled || false

  if (systemSettings?.value) {
    const settings = systemSettings.value as any
    // 権限に応じて2FA必須かチェック
    if (userData.role === 'admin' && settings.require2FAForOrganizationAdmin) {
      require2FA = true
    } else if (userData.role === 'manager' && settings.require2FAForManager) {
      require2FA = true
    } else if (userData.role === 'leader' && settings.require2FAForLeader) {
      require2FA = true
    } else if (userData.role === 'user' && settings.require2FAForStaff) {
      require2FA = true
    }
  }

  console.log('[LOGIN API] 2FA check - user enabled:', userData.two_factor_enabled, 'required by policy:', require2FA, 'role:', userData.role)

  // パスワード有効期限チェック
  const passwordCheck = await checkPasswordExpiration(data.user.id)
  if (passwordCheck.expired) {
    await recordLoginAttempt(email, ipAddress, userAgent, true, 'password_expired')
    const response = NextResponse.json({
      success: true,
      requiresPasswordChange: true,
      userId: data.user.id,
      message: 'パスワードの有効期限が切れています。新しいパスワードを設定してください。',
    })
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  // パスワード期限警告（7日以内に期限切れ）
  let passwordWarning = undefined
  if (passwordCheck.daysUntilExpiration && passwordCheck.daysUntilExpiration <= 7) {
    passwordWarning = `パスワードの有効期限まであと${passwordCheck.daysUntilExpiration}日です。`
  }

  console.log('[LOGIN API] Login successful, 2FA required:', require2FA)

  // ログイン成功を記録
  await recordLoginAttempt(email, ipAddress, userAgent, true)

  // 2FAが設定済みで、認証が必要な場合
  if (userData.two_factor_enabled) {
    // メール方式の場合、認証コードを送信
    if (userData.two_factor_method === 'email' && userData.two_factor_email) {
      // 6桁の認証コードを生成
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // two_factor_tokensテーブルに保存
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分後
      await supabaseAdmin
        .from('two_factor_tokens')
        .insert({
          user_id: data.user.id,
          token: verificationCode,
          type: 'email',
          expires_at: expiresAt.toISOString(),
        });

      // メール送信
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY!);

      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: userData.two_factor_email,
        subject: '【ザイロク】ログイン認証コード',
        html: `
          <h2>ログイン認証</h2>
          <p>以下の認証コードを入力してログインを完了してください：</p>
          <h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${verificationCode}</h1>
          <p>このコードは10分間有効です。</p>
          <p>このメールに心当たりがない場合は、アカウントの安全のためパスワードを変更してください。</p>
        `,
      });
    }

    // 2FA認証が必要
    const response = NextResponse.json({
      success: true,
      requires2FA: true,
      twoFactorMethod: userData.two_factor_method || 'totp',
      userId: data.user.id,
      passwordWarning,
    })
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  // 最終ログイン時刻を更新
  await supabaseAdmin
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id)

  // 2FAが必須だが未設定の場合、ログインは成功させるが警告フラグを返す
  if (require2FA && !userData.two_factor_enabled) {
    const response = NextResponse.json({
      success: true,
      should2FASetup: true, // セットアップウィザードまたはリマインダー表示フラグ
      userId: data.user.id,
      passwordWarning,
    })
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  // 2FA不要または任意の場合、通常の成功レスポンスを返す
  const response = NextResponse.json({
    success: true,
    passwordWarning,
  })
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
