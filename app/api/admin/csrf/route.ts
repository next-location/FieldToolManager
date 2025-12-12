import { NextResponse } from 'next/server';
import { getCsrfToken } from '@/lib/security/csrf';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

/**
 * CSRFトークンを取得するエンドポイント
 * 管理画面のフォームで使用
 */
export async function GET() {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // CSRFトークンを取得/生成
    const token = await getCsrfToken();

    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'トークンの生成に失敗しました' },
      { status: 500 }
    );
  }
}