import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * スーパー管理者用セッションタイムアウト設定API
 * GET /api/admin/settings/timeout - 現在の設定を取得
 * PUT /api/admin/settings/timeout - 設定を更新
 */

const DEFAULT_CONFIG = {
  sessionTimeoutMinutes: 30,
  warningMinutes: 5,
};

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // system_settingsから設定を取得
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'super_admin_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch timeout settings:', error);
      return NextResponse.json(
        { error: '設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    const config = data?.value || DEFAULT_CONFIG;

    return NextResponse.json({
      sessionTimeoutMinutes: config.sessionTimeoutMinutes || DEFAULT_CONFIG.sessionTimeoutMinutes,
      warningMinutes: config.warningMinutes || DEFAULT_CONFIG.warningMinutes,
    });
  } catch (error) {
    console.error('Timeout settings GET error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionTimeoutMinutes, warningMinutes } = body;

    // バリデーション
    if (sessionTimeoutMinutes < 5 || sessionTimeoutMinutes > 480) {
      return NextResponse.json(
        { error: 'セッションタイムアウトは5分〜480分の間で設定してください' },
        { status: 400 }
      );
    }

    if (warningMinutes < 1 || warningMinutes >= sessionTimeoutMinutes) {
      return NextResponse.json(
        { error: '警告時間は1分以上、タイムアウト時間未満で設定してください' },
        { status: 400 }
      );
    }

    // 設定を保存
    const config = {
      sessionTimeoutMinutes,
      warningMinutes,
    };

    const { error: saveError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'super_admin_config',
        value: config,
        updated_at: new Date().toISOString(),
        updated_by: session.id,
      });

    if (saveError) {
      console.error('Failed to save timeout settings:', saveError);
      return NextResponse.json(
        { error: '設定の保存に失敗しました' },
        { status: 500 }
      );
    }

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'セッションタイムアウト設定変更',
      details: { config },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: '設定を保存しました',
    });
  } catch (error) {
    console.error('Timeout settings PUT error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
