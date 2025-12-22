import { NextResponse } from 'next/server';
import { getCsrfToken } from '@/lib/security/csrf';

/**
 * CSRFトークンを発行するAPI
 * クライアントサイドから呼び出されてトークンを取得
 */
export async function GET() {
  try {
    const token = await getCsrfToken();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'CSRFトークンの生成に失敗しました' },
      { status: 500 }
    );
  }
}
