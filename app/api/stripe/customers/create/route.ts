import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Stripe Customer作成API
 *
 * POST /api/stripe/customers/create
 *
 * リクエストボディ:
 * {
 *   organizationId: string;
 *   email: string;
 *   name: string;
 * }
 *
 * レスポンス:
 * {
 *   success: true;
 *   customerId: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, email, name } = await request.json();

    // バリデーション
    if (!organizationId || !email || !name) {
      return NextResponse.json(
        { error: 'organizationId, email, nameは必須です' },
        { status: 400 }
      );
    }

    // Supabase Clientの作成
    const supabase = await createClient();

    // 既にStripe Customer IDが存在するかチェック
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      logger.error('Organization not found', { organizationId, error: orgError });
      return NextResponse.json(
        { error: '組織が見つかりません' },
        { status: 404 }
      );
    }

    if (organization.stripe_customer_id) {
      logger.info('Stripe Customer already exists', {
        organizationId,
        customerId: organization.stripe_customer_id,
      });
      return NextResponse.json({
        success: true,
        customerId: organization.stripe_customer_id,
        message: 'Stripe Customerは既に存在します',
      });
    }

    // Stripe Customer作成
    logger.info('Creating Stripe Customer', { organizationId, email, name });

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organization_id: organizationId,
      },
    });

    logger.info('Stripe Customer created successfully', {
      organizationId,
      customerId: customer.id,
    });

    // DBを更新
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', organizationId);

    if (updateError) {
      logger.error('Failed to update organization with customer ID', {
        organizationId,
        customerId: customer.id,
        error: updateError,
      });

      // Stripe Customerを削除（ロールバック）
      await stripe.customers.del(customer.id);

      return NextResponse.json(
        { error: 'データベースの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId: customer.id,
    });

  } catch (error: unknown) {
    logger.error('Failed to create Stripe Customer', { error });

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };
      return NextResponse.json(
        { error: `Stripeエラー: ${stripeError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Stripe Customerの作成に失敗しました' },
      { status: 500 }
    );
  }
}
