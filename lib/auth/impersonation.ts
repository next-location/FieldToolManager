import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

const IMPERSONATION_SECRET = new TextEncoder().encode(
  process.env.IMPERSONATION_JWT_SECRET || ''
);

const TOKEN_EXPIRY = 5 * 60 * 1000; // 5分
const SESSION_EXPIRY = 30 * 60 * 1000; // 30分

export interface ImpersonationPayload {
  superAdminId: string;
  superAdminName: string;
  organizationId: string;
  organizationName: string;
  subdomain: string;
}

/**
 * ワンタイムトークンを生成
 */
export async function generateImpersonationToken(
  superAdminId: string,
  organizationId: string,
  organizationName: string,
  subdomain: string
): Promise<string> {
  const supabase = createAdminClient();

  // JWTペイロード
  const payload: ImpersonationPayload = {
    superAdminId,
    organizationId,
    organizationName,
    subdomain,
    superAdminName: '', // トークン生成時は不要
  };

  // JWT生成
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .setIssuedAt()
    .sign(IMPERSONATION_SECRET);

  // トークンをDBに保存
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY);
  await supabase.from('impersonation_tokens').insert({
    super_admin_id: superAdminId,
    organization_id: organizationId,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

/**
 * トークンを検証してセッショントークンを生成
 */
export async function verifyAndConsumeToken(
  token: string
): Promise<{ sessionToken: string; payload: ImpersonationPayload } | null> {
  const supabase = createAdminClient();

  try {
    // JWT検証
    const { payload } = await jwtVerify(token, IMPERSONATION_SECRET);
    const impersonationPayload = payload as unknown as ImpersonationPayload;

    // DBからトークンを取得
    const { data: tokenRecord } = await supabase
      .from('impersonation_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (!tokenRecord) return null;

    // 有効期限チェック
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return null;
    }

    // トークンを使用済みにマーク
    await supabase
      .from('impersonation_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // セッショントークン生成
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY);

    await supabase.from('impersonation_sessions').insert({
      super_admin_id: impersonationPayload.superAdminId,
      organization_id: impersonationPayload.organizationId,
      session_token: sessionToken,
      expires_at: sessionExpiresAt.toISOString(),
    });

    return { sessionToken, payload: impersonationPayload };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * セッショントークンを検証（最適化版：1回のクエリでスーパーアドミン名も取得）
 */
export async function verifySessionToken(
  sessionToken: string
): Promise<ImpersonationPayload | null> {
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from('impersonation_sessions')
    .select(`
      super_admin_id,
      organization_id,
      expires_at,
      super_admins(name),
      organizations(name, subdomain)
    `)
    .eq('session_token', sessionToken)
    .single();

  if (!session) return null;

  // 有効期限チェック
  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('impersonation_sessions').delete().eq('session_token', sessionToken);
    return null;
  }

  return {
    superAdminId: session.super_admin_id,
    superAdminName: (session.super_admins as any)?.name || 'スーパーアドミン',
    organizationId: session.organization_id,
    organizationName: (session.organizations as any)?.name || '',
    subdomain: (session.organizations as any)?.subdomain || '',
  };
}

/**
 * セッションを終了
 */
export async function endSession(sessionToken: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('impersonation_sessions').delete().eq('session_token', sessionToken);
}

/**
 * セッションのアクティビティを更新（1分に1回まで）
 */
const activityCache = new Map<string, number>();

export async function updateSessionActivity(sessionToken: string): Promise<void> {
  const now = Date.now();
  const lastUpdate = activityCache.get(sessionToken) || 0;

  // 1分以内の更新はスキップ
  if (now - lastUpdate < 60000) return;

  const supabase = createAdminClient();
  const newExpiresAt = new Date(now + SESSION_EXPIRY);

  await supabase
    .from('impersonation_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('session_token', sessionToken);

  activityCache.set(sessionToken, now);
}
