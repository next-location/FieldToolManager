/**
 * バックアップコード検証 API（ログイン時）
 * POST /api/admin/2fa/verify-backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyBackupCode } from '@/lib/security/2fa';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { email, backupCode } = await request.json();

    // バリデーション
    if (!email || !backupCode) {
      return NextResponse.json(
        { error: 'メールアドレスとバックアップコードが必要です' },
        { status: 400 }
      );
    }

    // バックアップコードの形式チェック（XXXX-XXXX形式）
    if (!/^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(backupCode)) {
      return NextResponse.json(
        { error: '無効なバックアップコード形式です' },
        { status: 400 }
      );
    }

    // スーパーアドミン情報を取得
    const { data: adminData, error: authError } = await supabase
      .from('super_admins')
      .select('id, email, two_factor_enabled, backup_codes, backup_codes_used')
      .eq('email', email)
      .single();

    if (authError || !adminData) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 2FAが有効化されているかチェック
    if (!adminData.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FAが有効化されていません' },
        { status: 400 }
      );
    }

    // バックアップコードが存在するかチェック
    if (!adminData.backup_codes || adminData.backup_codes.length === 0) {
      return NextResponse.json(
        { error: 'バックアップコードが設定されていません' },
        { status: 400 }
      );
    }

    // バックアップコードを検証
    const { valid, codeIndex } = await verifyBackupCode(
      backupCode,
      adminData.backup_codes
    );

    if (!valid) {
      // 操作ログを記録（失敗）
      await supabase.from('super_admin_logs').insert({
        super_admin_id: adminData.id,
        action: 'バックアップコード検証失敗',
        details: { email: adminData.email },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        { error: 'バックアップコードが正しくありません' },
        { status: 400 }
      );
    }

    // 使用済みバックアップコードに追加
    const usedCodes = adminData.backup_codes_used || [];
    const usedCodeHash = adminData.backup_codes[codeIndex];
    usedCodes.push(usedCodeHash);

    // バックアップコードから削除
    const updatedBackupCodes = adminData.backup_codes.filter(
      (_: any, index: number) => index !== codeIndex
    );

    // データベースを更新
    const { error: updateError } = await supabase
      .from('super_admins')
      .update({
        backup_codes: updatedBackupCodes,
        backup_codes_used: usedCodes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminData.id);

    if (updateError) {
      console.error('バックアップコード更新エラー:', updateError);
      return NextResponse.json(
        { error: 'バックアップコードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // 操作ログを記録（成功）
    await supabase.from('super_admin_logs').insert({
      super_admin_id: adminData.id,
      action: 'バックアップコード使用',
      details: {
        email: adminData.email,
        remaining_codes: updatedBackupCodes.length,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'バックアップコードが正常に検証されました',
      remainingCodes: updatedBackupCodes.length,
    });
  } catch (error) {
    console.error('バックアップコード検証エラー:', error);
    return NextResponse.json(
      { error: 'バックアップコードの検証に失敗しました' },
      { status: 500 }
    );
  }
}
