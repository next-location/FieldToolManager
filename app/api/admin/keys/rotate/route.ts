import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { rotateServiceKey, encryptServiceKey, logKeyAccess } from '@/lib/security/key-management';
import { rateLimiters, getClientIp } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック
    const clientIp = getClientIp(request);
    if (!rateLimiters.admin.check(clientIp)) {
      const resetTime = rateLimiters.admin.getResetTime(clientIp);
      return NextResponse.json(
        { error: 'リクエストが多すぎます' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((resetTime || 60000) / 1000).toString(),
          }
        }
      );
    }

    // CSRF検証
    if (!(await verifyCsrfToken(request))) {
      return NextResponse.json(
        { error: '無効なリクエストです' },
        { status: 403 }
      );
    }

    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // オーナー権限チェック（キーローテーションは最高権限のみ）
    if (session.permission_level !== 'owner') {
      return NextResponse.json(
        { error: 'この操作にはオーナー権限が必要です' },
        { status: 403 }
      );
    }

    const { newServiceKey } = await request.json();

    if (!newServiceKey) {
      return NextResponse.json(
        { error: '新しいサービスキーを入力してください' },
        { status: 400 }
      );
    }

    // 新しいキーの検証（形式チェック）
    if (!newServiceKey.startsWith('eyJ') || newServiceKey.length < 100) {
      return NextResponse.json(
        { error: '無効なサービスキー形式です' },
        { status: 400 }
      );
    }

    // キーの暗号化
    const encryptedKey = encryptServiceKey(newServiceKey);

    // アクセスログ記録
    await logKeyAccess('rotate', session.id, {
      ip_address: clientIp,
      user_agent: request.headers.get('user-agent'),
      admin_name: session.name,
      admin_email: session.email,
    });

    // 注意: 実際のキーローテーションはSupabaseダッシュボードで行う必要があります
    // この API は新しいキーを受け取って暗号化し、安全に保存するためのものです

    return NextResponse.json({
      success: true,
      message: 'サービスキーが正常に暗号化されました',
      encryptedKey,
      instructions: [
        '1. Supabaseダッシュボードで新しいサービスロールキーを生成',
        '2. 環境変数 SUPABASE_SERVICE_ROLE_KEY を更新',
        '3. アプリケーションを再起動',
        '4. 古いキーを Supabase ダッシュボードで無効化',
      ],
    });
  } catch (error) {
    console.error('Key rotation error:', error);
    return NextResponse.json(
      { error: 'キーローテーション中にエラーが発生しました' },
      { status: 500 }
    );
  }
}