import { NextRequest } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from './rate-limiter';

/**
 * 管理者APIのレート制限チェック
 * 各APIエンドポイントの最初で呼び出す
 */
export function checkAdminRateLimit(request: NextRequest): Response | null {
  const clientIp = getClientIp(request);

  // 管理者API用のレート制限（1分間に100リクエスト）
  if (!rateLimiters.admin.check(clientIp)) {
    const resetTime = rateLimiters.admin.getResetTime(clientIp);
    return rateLimitResponse(resetTime);
  }

  // レート制限ヘッダーを設定
  const remaining = rateLimiters.admin.getRemainingRequests(clientIp);
  const resetTime = rateLimiters.admin.getResetTime(clientIp);

  if (remaining !== null && resetTime !== null) {
    // これらのヘッダーはresponseオブジェクトに設定する必要がある
    // ここではnullを返して、各エンドポイントでヘッダーを設定
    return null;
  }

  return null;
}

/**
 * レート制限ヘッダーを追加するヘルパー
 */
export function addRateLimitHeaders(response: Response, request: NextRequest): Response {
  const clientIp = getClientIp(request);
  const remaining = rateLimiters.admin.getRemainingRequests(clientIp);
  const resetTime = rateLimiters.admin.getResetTime(clientIp);

  if (remaining !== null) {
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
  }

  if (resetTime !== null) {
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
  }

  return response;
}