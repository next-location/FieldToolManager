/**
 * Supabaseベースのレート制限ユーティリティ
 * サーバーレス環境（Vercel）でも動作するように、Supabaseをストレージとして使用
 */

import { createClient } from '@supabase/supabase-js'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  isBlocked?: boolean
}

/**
 * Supabaseベースのレート制限チェック
 * テーブル: rate_limits (id, identifier, count, reset_at, blocked_until, created_at, updated_at)
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 3,
  windowMs: number = 300000, // 5分
  blockDurationMs: number = 600000 // 10分
): Promise<RateLimitResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Rate Limiter] Supabase not configured, allowing request')
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const now = Date.now()

    // 既存のレコードを取得
    const { data: existingRecord, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = レコードが見つからない（これはOK）
      console.error('[Rate Limiter] Fetch error:', fetchError)
      // エラー時は制限をかけない（安全側に倒す）
      return { allowed: true, remaining: limit, resetAt: now + windowMs }
    }

    // レコードが存在しない場合は新規作成
    if (!existingRecord) {
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          count: 1,
          reset_at: new Date(now + windowMs).toISOString(),
          blocked_until: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('[Rate Limiter] Insert error:', insertError)
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
      }

      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
    }

    // ブロック中の場合
    const blockedUntil = existingRecord.blocked_until
      ? new Date(existingRecord.blocked_until).getTime()
      : null

    if (blockedUntil && blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        isBlocked: true,
      }
    }

    // 時間窓が過ぎている場合はリセット
    const resetAt = new Date(existingRecord.reset_at).getTime()
    if (resetAt < now) {
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({
          count: 1,
          reset_at: new Date(now + windowMs).toISOString(),
          blocked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('identifier', identifier)

      if (updateError) {
        console.error('[Rate Limiter] Update error:', updateError)
      }

      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
    }

    // カウントをインクリメント
    const newCount = existingRecord.count + 1

    // 制限を超えた場合
    if (newCount > limit) {
      // 閾値の2倍を超えたらブロック
      const shouldBlock = newCount > limit * 2
      const newBlockedUntil = shouldBlock ? new Date(now + blockDurationMs).toISOString() : null

      await supabase
        .from('rate_limits')
        .update({
          count: newCount,
          blocked_until: newBlockedUntil,
          updated_at: new Date().toISOString(),
        })
        .eq('identifier', identifier)

      return {
        allowed: false,
        remaining: 0,
        resetAt: shouldBlock ? now + blockDurationMs : resetAt,
        isBlocked: shouldBlock,
      }
    }

    // まだ制限内
    await supabase
      .from('rate_limits')
      .update({
        count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('identifier', identifier)

    return {
      allowed: true,
      remaining: Math.max(0, limit - newCount),
      resetAt,
    }
  } catch (error) {
    console.error('[Rate Limiter] Unexpected error:', error)
    // エラー時は制限をかけない（サービス継続を優先）
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
  }
}

/**
 * IPアドレスを取得するヘルパー関数
 */
export function getClientIp(request: Request | Headers): string {
  const headers = request instanceof Request ? request.headers : request

  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * レート制限エラーレスポンスを返すヘルパー関数
 */
export function rateLimitResponse(resetTime: number): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
  })

  return new Response(
    JSON.stringify({
      error: 'リクエスト制限に達しました。しばらく待ってから再試行してください。',
    }),
    {
      status: 429,
      headers,
    }
  )
}

/**
 * 古いレコードをクリーンアップ（定期実行用）
 */
export async function cleanupOldRecords(): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // 1日以上前のレコードを削除
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('updated_at', oneDayAgo)

    if (error) {
      console.error('[Rate Limiter] Cleanup error:', error)
    }
  } catch (error) {
    console.error('[Rate Limiter] Cleanup unexpected error:', error)
  }
}
