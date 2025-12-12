/**
 * レート制限ユーティリティ
 * IPアドレスベースでAPI呼び出しを制限
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>();

  constructor(
    private limit: number = 60,        // 制限回数
    private window: number = 60000,    // 時間窓（ミリ秒）
    private blockDuration: number = 300000  // ブロック期間（5分）
  ) {}

  /**
   * レート制限チェック
   * @param identifier IP アドレスまたは識別子
   * @returns 許可されている場合 true
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const record = this.records.get(identifier);

    // レコードがない場合は新規作成
    if (!record) {
      this.records.set(identifier, {
        count: 1,
        resetAt: now + this.window,
      });
      return true;
    }

    // ブロック中の場合
    if (record.blockedUntil && record.blockedUntil > now) {
      return false;
    }

    // 時間窓が過ぎている場合はリセット
    if (record.resetAt < now) {
      record.count = 1;
      record.resetAt = now + this.window;
      record.blockedUntil = undefined;
      return true;
    }

    // カウントをインクリメント
    record.count++;

    // 制限を超えた場合
    if (record.count > this.limit) {
      // 閾値の2倍を超えたらブロック
      if (record.count > this.limit * 2) {
        record.blockedUntil = now + this.blockDuration;
      }
      return false;
    }

    return true;
  }

  /**
   * 残りのリクエスト可能数を取得
   */
  getRemainingRequests(identifier: string): number {
    const record = this.records.get(identifier);
    if (!record) return this.limit;

    const now = Date.now();
    if (record.resetAt < now) return this.limit;

    return Math.max(0, this.limit - record.count);
  }

  /**
   * リセット時刻を取得
   */
  getResetTime(identifier: string): number | null {
    const record = this.records.get(identifier);
    if (!record) return null;
    return record.resetAt;
  }

  /**
   * 古いレコードをクリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    for (const [key, record] of this.records.entries()) {
      if (record.resetAt < oneHourAgo && (!record.blockedUntil || record.blockedUntil < now)) {
        this.records.delete(key);
      }
    }
  }
}

// レート制限インスタンス（シングルトン）
export const rateLimiters = {
  // API全般: 1分間に60リクエスト
  api: new RateLimiter(60, 60000),

  // ログイン試行: 15分間に5回
  login: new RateLimiter(5, 900000, 1800000), // 30分ブロック

  // 管理者API: 1分間に100リクエスト
  admin: new RateLimiter(100, 60000),

  // データエクスポート: 1時間に5回
  export: new RateLimiter(5, 3600000),
};

// 定期的なクリーンアップ（1時間ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    Object.values(rateLimiters).forEach(limiter => limiter.cleanup());
  }, 3600000);
}

/**
 * IPアドレスを取得するヘルパー関数
 */
export function getClientIp(request: Request | Headers): string {
  const headers = request instanceof Request ? request.headers : request;

  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * レート制限レスポンスを返すヘルパー関数
 */
export function rateLimitResponse(resetTime?: number | null): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (resetTime) {
    headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
    headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  }

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'リクエスト制限に達しました。しばらく待ってから再試行してください。',
    }),
    {
      status: 429,
      headers,
    }
  );
}