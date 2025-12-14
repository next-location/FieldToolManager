/**
 * セキュリティミドルウェア
 * ログイン試行回数制限、IP制限、アカウントロックアウト
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SecuritySettings {
  maxLoginAttempts: number
  lockoutDuration: number // 分
  ipWhitelist: string[]
  ipBlacklist: string[]
  enableIpRestriction: boolean
}

/**
 * IPアドレスを取得
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * IP制限チェック
 */
export async function checkIpRestriction(
  organizationId: string,
  ipAddress: string
): Promise<{ allowed: boolean; reason?: string }> {
  console.log('[IP RESTRICTION] Checking IP:', ipAddress, 'for organization:', organizationId)

  // システム全体のセキュリティ設定を取得
  const { data: systemSettings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'security_settings')
    .single()

  console.log('[IP RESTRICTION] System settings:', systemSettings)

  if (!systemSettings) {
    console.log('[IP RESTRICTION] No system settings found, allowing access')
    return { allowed: true }
  }

  const settings = systemSettings.value as any

  console.log('[IP RESTRICTION] Enable IP restriction:', settings.enableIpRestriction)
  console.log('[IP RESTRICTION] Allowed IPs:', settings.allowedIpAddresses)

  if (!settings || !settings.enableIpRestriction) {
    console.log('[IP RESTRICTION] IP restriction disabled, allowing access')
    return { allowed: true }
  }

  // 許可IPリストチェック
  if (settings.allowedIpAddresses && Array.isArray(settings.allowedIpAddresses) && settings.allowedIpAddresses.length > 0) {
    let matched = false
    for (const allowedIp of settings.allowedIpAddresses) {
      if (ipMatchesPattern(ipAddress, allowedIp)) {
        console.log('[IP RESTRICTION] IP matched allowed list:', allowedIp)
        matched = true
        break
      }
    }
    if (!matched) {
      console.log('[IP RESTRICTION] IP not in allowed list, blocking access')
      return { allowed: false, reason: 'IPアドレスが許可リストに含まれていません' }
    }
  }

  console.log('[IP RESTRICTION] Access allowed')
  return { allowed: true }
}

/**
 * IPアドレスがパターンにマッチするかチェック
 * CIDR記法とワイルドカードをサポート
 */
function ipMatchesPattern(ip: string, pattern: string): boolean {
  // 完全一致
  if (ip === pattern) {
    return true
  }

  // ワイルドカード（例: 192.168.1.*）
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$')
    return regex.test(ip)
  }

  // CIDR記法（簡易実装）
  if (pattern.includes('/')) {
    // 詳細な実装は後で追加
    return false
  }

  return false
}

/**
 * アカウントロックアウトチェック
 */
export async function checkAccountLockout(email: string): Promise<{
  locked: boolean
  lockedUntil?: Date
  reason?: string
}> {
  console.log('[LOCKOUT CHECK] Checking lockout for:', email)

  const { data: lockout, error } = await supabase
    .from('account_lockouts')
    .select('*')
    .eq('email', email)
    .is('unlocked_at', null)
    .gte('locked_until', new Date().toISOString())
    .order('locked_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log('[LOCKOUT CHECK] Result:', { lockout, error })

  if (lockout) {
    return {
      locked: true,
      lockedUntil: new Date(lockout.locked_until),
      reason: 'ログイン試行回数が上限に達しました',
    }
  }

  return { locked: false }
}

/**
 * ログイン試行を記録
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  await supabase.from('login_attempts').insert({
    email,
    ip_address: ipAddress,
    user_agent: userAgent,
    success,
    failure_reason: failureReason,
  })
}

/**
 * ログイン試行回数をチェックし、必要に応じてロックアウト
 */
export async function checkAndLockAccount(
  email: string,
  organizationId: string
): Promise<{ shouldLock: boolean; attemptsCount: number }> {
  // セキュリティ設定を取得
  const { data: settings } = await supabase
    .from('security_settings')
    .select('max_login_attempts, lockout_duration_minutes')
    .eq('organization_id', organizationId)
    .single()

  const maxAttempts = settings?.max_login_attempts || 5
  const lockoutDuration = settings?.lockout_duration_minutes || 30

  // 最近の失敗試行回数を取得（過去30分）
  const { data: attempts } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('email', email)
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order('attempted_at', { ascending: false })

  const attemptsCount = attempts?.length || 0

  if (attemptsCount >= maxAttempts) {
    // アカウントをロック
    const lockedUntil = new Date()
    lockedUntil.setMinutes(lockedUntil.getMinutes() + lockoutDuration)

    // ユーザーIDを取得
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    await supabase.from('account_lockouts').insert({
      user_id: user?.id,
      email,
      locked_until: lockedUntil.toISOString(),
      reason: 'too_many_attempts',
    })

    return { shouldLock: true, attemptsCount }
  }

  return { shouldLock: false, attemptsCount }
}

/**
 * パスワード有効期限チェック
 */
export async function checkPasswordExpiration(userId: string): Promise<{
  expired: boolean
  expiresAt?: Date
  daysUntilExpiration?: number
}> {
  const { data: user } = await supabase
    .from('users')
    .select('password_expires_at, force_password_change')
    .eq('id', userId)
    .single()

  if (!user) {
    return { expired: false }
  }

  // 強制パスワード変更フラグ
  if (user.force_password_change) {
    return { expired: true }
  }

  // パスワード有効期限チェック
  if (user.password_expires_at) {
    const expiresAt = new Date(user.password_expires_at)
    const now = new Date()
    const daysUntilExpiration = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (now >= expiresAt) {
      return { expired: true, expiresAt }
    }

    return { expired: false, expiresAt, daysUntilExpiration }
  }

  return { expired: false }
}

/**
 * パスワード再利用チェック
 */
export async function checkPasswordReuse(
  userId: string,
  newPasswordHash: string,
  preventReuseCount: number
): Promise<boolean> {
  const { data: history } = await supabase
    .from('password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(preventReuseCount)

  if (!history) {
    return false
  }

  const bcrypt = await import('bcryptjs')
  for (const record of history) {
    const matches = await bcrypt.compare(newPasswordHash, record.password_hash)
    if (matches) {
      return true // 再利用されている
    }
  }

  return false
}

/**
 * パスワード履歴に追加
 */
export async function addPasswordHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  await supabase.from('password_history').insert({
    user_id: userId,
    password_hash: passwordHash,
  })
}
