import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { logger } from '@/lib/logger';

/**
 * テスト用: cronジョブを手動トリガー
 *
 * POST /api/admin/test/trigger-cron
 * Body: { cron_type: 'invoice' | 'plan-change' | 'email-usage' | 'low-stock' }
 *
 * 注意: 本番環境でも使用可能（スーパー管理者のみ）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cron_type } = body;

    if (!cron_type) {
      return NextResponse.json(
        { error: 'cron_typeが必要です（invoice, plan-change, email-usage, low-stock）' },
        { status: 400 }
      );
    }

    logger.info('[Test Trigger Cron] Start', { cron_type, admin: session.email });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zairoku.com';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRETが設定されていません' },
        { status: 500 }
      );
    }

    // cronタイプに応じてエンドポイントを選択
    const cronEndpoints: Record<string, string> = {
      'invoice': '/api/cron/create-monthly-invoices',
      'plan-change': '/api/cron/process-plan-changes',
      'email-usage': '/api/cron/check-email-usage',
      'low-stock': '/api/cron/check-low-stock',
      'warranty': '/api/cron/check-warranty-expiration',
      'equipment': '/api/cron/check-equipment-expiration',
    };

    const endpoint = cronEndpoints[cron_type];
    if (!endpoint) {
      return NextResponse.json(
        { error: `無効なcron_type: ${cron_type}` },
        { status: 400 }
      );
    }

    // cronジョブを実行
    const cronUrl = `${baseUrl}${endpoint}`;
    logger.info('[Test Trigger Cron] Calling cron', { url: cronUrl });

    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const responseData = await response.json();

    logger.info('[Test Trigger Cron] Cron executed', {
      cron_type,
      status: response.status,
      response: responseData,
    });

    return NextResponse.json({
      success: response.ok,
      message: `cronジョブを実行しました: ${cron_type}`,
      cron_response: responseData,
      status_code: response.status,
    });

  } catch (error: unknown) {
    logger.error('[Test Trigger Cron] Error', { error });
    return NextResponse.json(
      {
        error: 'cronジョブの実行に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
