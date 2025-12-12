import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendInvoiceReminderEmail } from '@/lib/email/invoice';
import { logger } from '@/lib/logger';

/**
 * 請求書発行前リマインダーメール送信Cron
 *
 * 毎日実行され、請求日の3日前の組織に対してリマインダーメールを送信
 *
 * GET /api/cron/send-invoice-reminders
 *
 * Vercel Cronから呼び出される
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronからの呼び出しのみ許可）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron request', { authHeader });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // 今日の日付と3日後の日付を取得
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const targetDate = threeDaysLater.toISOString().split('T')[0];

    logger.info('Starting invoice reminder process', { targetDate });

    // 3日後が請求日の組織を取得（リマインダー未送信のみ）
    const { data: schedules, error: schedulesError } = await supabase
      .from('invoice_schedules')
      .select(`
        *,
        organizations (
          id,
          name,
          email,
          plan
        )
      `)
      .eq('is_active', true)
      .eq('reminder_sent', false)
      .eq('next_invoice_date', targetDate);

    if (schedulesError) {
      logger.error('Failed to fetch invoice schedules', { error: schedulesError });
      return NextResponse.json(
        { error: 'データベースエラー' },
        { status: 500 }
      );
    }

    if (!schedules || schedules.length === 0) {
      logger.info('No invoice reminders to send', { targetDate });
      return NextResponse.json({
        success: true,
        message: '送信するリマインダーはありません',
        count: 0,
      });
    }

    logger.info('Found schedules to remind', { count: schedules.length });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // 各組織にリマインダーメールを送信
    for (const schedule of schedules) {
      const organization = schedule.organizations as any;

      if (!organization || !organization.email) {
        logger.warn('Organization email not found', { scheduleId: schedule.id });
        failureCount++;
        errors.push(`Organization email not found for schedule ${schedule.id}`);
        continue;
      }

      try {
        // リマインダーメールを送信
        await sendInvoiceReminderEmail({
          to: organization.email,
          organizationName: organization.name,
          plan: organization.plan,
          nextInvoiceDate: schedule.next_invoice_date,
          estimatedAmount: schedule.next_amount,
          billingDay: schedule.billing_day,
        });

        // reminder_sentフラグを更新
        const { error: updateError } = await supabase
          .from('invoice_schedules')
          .update({ reminder_sent: true })
          .eq('id', schedule.id);

        if (updateError) {
          logger.error('Failed to update reminder_sent flag', {
            scheduleId: schedule.id,
            error: updateError,
          });
          failureCount++;
          errors.push(`Failed to update schedule ${schedule.id}: ${updateError.message}`);
        } else {
          logger.info('Invoice reminder sent successfully', {
            organizationId: organization.id,
            organizationName: organization.name,
            nextInvoiceDate: schedule.next_invoice_date,
          });
          successCount++;
        }
      } catch (error: unknown) {
        logger.error('Failed to send invoice reminder', {
          organizationId: organization.id,
          error,
        });
        failureCount++;
        errors.push(
          `Failed to send reminder to ${organization.name}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    logger.info('Invoice reminder process completed', {
      total: schedules.length,
      success: successCount,
      failure: failureCount,
    });

    return NextResponse.json({
      success: true,
      total: schedules.length,
      successCount,
      failureCount,
      errors: failureCount > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    logger.error('Invoice reminder cron failed', { error });
    return NextResponse.json(
      { error: 'リマインダー送信処理に失敗しました' },
      { status: 500 }
    );
  }
}
