/**
 * セキュリティ設定API
 * GET /api/admin/security/settings - 現在の設定を取得
 * PUT /api/admin/security/settings - 設定を更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// デフォルトのセキュリティ設定（取引先用）
const DEFAULT_SETTINGS = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  passwordExpirationDays: 90,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 60,
  enableIpRestriction: false,
  allowedIpAddresses: [],
  require2FAForOrganizationAdmin: false,  // 組織管理者（admin）
  require2FAForLeader: false,             // リーダー（manager）
  require2FAForStaff: false,              // スタッフ（user）
  auditLogRetentionDays: 365,
};

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const token = request.cookies.get('super_admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // JWTトークンの検証
    const jwt = await import('jsonwebtoken');
    let session;
    try {
      session = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET!) as any;
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // セキュリティ設定を取得
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'security_settings')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Failed to fetch security settings:', error);
      return NextResponse.json(
        { error: '設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 設定が存在しない場合はデフォルト値を返す
    const settings = data ? data.value : DEFAULT_SETTINGS;

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Security settings GET error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('[SECURITY SETTINGS PUT] Starting...');

    // 認証チェック
    const token = request.cookies.get('super_admin_token')?.value;
    console.log('[SECURITY SETTINGS PUT] Token:', token ? 'found' : 'not found');

    if (!token) {
      console.log('[SECURITY SETTINGS PUT] No token, returning 401');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // JWTトークンの検証
    const jwt = await import('jsonwebtoken');
    let session;
    try {
      session = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET!) as any;
      console.log('[SECURITY SETTINGS PUT] Token verified, session ID:', session.id);
    } catch (error) {
      console.log('[SECURITY SETTINGS PUT] Token verification failed:', error);
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const settings = await request.json();
    console.log('[SECURITY SETTINGS PUT] Settings received:', settings);

    // バリデーション
    if (settings.passwordMinLength < 6 || settings.passwordMinLength > 32) {
      return NextResponse.json(
        { error: 'パスワードの最小文字数は6〜32の間で設定してください' },
        { status: 400 }
      );
    }

    if (settings.maxLoginAttempts < 3 || settings.maxLoginAttempts > 10) {
      return NextResponse.json(
        { error: 'ログイン試行回数は3〜10の間で設定してください' },
        { status: 400 }
      );
    }

    // IPアドレスのバリデーション
    if (settings.enableIpRestriction && settings.allowedIpAddresses.length > 0) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      for (const ip of settings.allowedIpAddresses) {
        if (!ipRegex.test(ip)) {
          return NextResponse.json(
            { error: `無効なIPアドレス: ${ip}` },
            { status: 400 }
          );
        }
      }
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 設定を保存（upsert）
    console.log('[SECURITY SETTINGS PUT] Saving to database...');
    const { error: saveError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'security_settings',
        value: settings,
        updated_at: new Date().toISOString(),
        updated_by: session.id,
      });

    if (saveError) {
      console.error('[SECURITY SETTINGS PUT] Save error:', saveError);
      return NextResponse.json(
        { error: '設定の保存に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[SECURITY SETTINGS PUT] Save successful');

    // 監査ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'セキュリティ設定変更',
        details: {
          changes: settings,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: '設定を保存しました',
    });

  } catch (error) {
    console.error('Security settings PUT error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}