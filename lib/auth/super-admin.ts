import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// JWT署名用の秘密鍵（環境変数必須）
const SECRET_KEY = (() => {
  const secret = process.env.SUPER_ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'SUPER_ADMIN_JWT_SECRET環境変数が設定されていません。' +
      '.env.localファイルに強力なランダム文字列を設定してください。'
    );
  }
  return new TextEncoder().encode(secret);
})();

export interface SuperAdminPayload {
  id: string;
  email: string;
  name: string;
  permission_level: string;
}

// パスワード検証
export async function verifySuperAdminPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// JWT生成
export async function createSuperAdminToken(payload: SuperAdminPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);
}

// JWT検証
export async function verifySuperAdminToken(token: string): Promise<SuperAdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SuperAdminPayload;
  } catch (error) {
    return null;
  }
}

// Cookie設定
export async function setSuperAdminCookie(payload: SuperAdminPayload) {
  const token = await createSuperAdminToken(payload);
  const cookieStore = await cookies();

  cookieStore.set('super_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8時間
    path: '/',
  });
}

// Cookie削除
export async function clearSuperAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('super_admin_token');
}

// 認証チェック
export async function getSuperAdminSession(): Promise<SuperAdminPayload | null> {
  console.log('[getSuperAdminSession] Start - called from:', new Error().stack?.split('\n')[2]);
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  console.log('[getSuperAdminSession] Cookie exists:', !!token);
  console.log('[getSuperAdminSession] All cookies:', cookieStore.getAll().map(c => c.name));

  if (!token) {
    console.log('[getSuperAdminSession] No token found');
    return null;
  }

  const verified = await verifySuperAdminToken(token);
  console.log('[getSuperAdminSession] Token verified:', !!verified);
  console.log('[getSuperAdminSession] Verified data:', JSON.stringify(verified, null, 2));
  return verified;
}
