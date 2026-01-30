import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * CSRFトークンの管理
 */
const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24時間

interface CsrfToken {
  token: string;
  expiresAt: number;
}

/**
 * CSRFトークンを生成
 */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY;

  const cookieStore = await cookies();

  // トークンをCookieに保存（HttpOnly、SameSite=Strict）
  cookieStore.set(CSRF_TOKEN_NAME, JSON.stringify({ token, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/',
  });

  return token;
}

/**
 * CSRFトークンを検証
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  // GETリクエストは検証不要
  if (request.method === 'GET') {
    return true;
  }

  console.log('[CSRF VERIFY] === Starting CSRF verification ===');
  console.log('[CSRF VERIFY] Request method:', request.method);
  console.log('[CSRF VERIFY] Request URL:', request.url);

  // 全ヘッダーを確認
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('[CSRF VERIFY] All request headers:', JSON.stringify(headers, null, 2));

  // ヘッダーからトークンを取得
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  console.log('[CSRF VERIFY] CSRF_HEADER_NAME:', CSRF_HEADER_NAME);
  console.log('[CSRF VERIFY] Header token:', headerToken);

  if (!headerToken) {
    console.error('[CSRF VERIFY] ❌ CSRF token not found in headers');
    return false;
  }

  // CookieからトークンJSON取得
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  console.log('[CSRF VERIFY] Cookie name:', CSRF_TOKEN_NAME);
  console.log('[CSRF VERIFY] Cookie value:', cookieValue);

  if (!cookieValue) {
    console.error('[CSRF VERIFY] ❌ CSRF token not found in cookies');
    return false;
  }

  try {
    const { token, expiresAt }: CsrfToken = JSON.parse(cookieValue);

    // 有効期限チェック
    if (Date.now() > expiresAt) {
      console.error('CSRF token expired');
      return false;
    }

    // トークン一致チェック
    const isValid = crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(token)
    );

    if (!isValid) {
      console.error('CSRF token mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('CSRF token verification error:', error);
    return false;
  }
}

/**
 * 既存のCSRFトークンを取得（存在しない場合は生成）
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (cookieValue) {
    try {
      const { token, expiresAt }: CsrfToken = JSON.parse(cookieValue);

      // 有効期限内であれば既存のトークンを返す
      if (Date.now() < expiresAt) {
        return token;
      }
    } catch (error) {
      // パースエラーの場合は新規生成
    }
  }

  // トークンが存在しないか期限切れの場合は新規生成
  return generateCsrfToken();
}

/**
 * CSRFトークンをクリア
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_TOKEN_NAME);
}

/**
 * CSRFエラーレスポンスを返す
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'セキュリティトークンが無効です。ページを再読み込みしてください。',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}