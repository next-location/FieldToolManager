/**
 * 契約作成時のStripe設定ヘルパー
 *
 * A方式（Invoice Item方式）用
 * Subscriptionは作成せず、Customerのみ作成
 */

import { stripe } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SetupContractBillingParams {
  contractId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  paymentMethod: 'invoice' | 'card';
}

export interface SetupContractBillingResult {
  success: boolean;
  customerId?: string;
  error?: string;
}

/**
 * 契約作成時にStripe Customerを作成
 *
 * A方式ではSubscriptionは作成しない
 * 請求はcron jobで毎月自動生成される
 */
export async function setupContractBilling(
  params: SetupContractBillingParams
): Promise<SetupContractBillingResult> {
  const { contractId, organizationId, organizationName, email, paymentMethod } = params;

  try {
    logger.info('Setting up contract billing', {
      contractId,
      organizationId,
      paymentMethod,
    });

    // 既存のStripe Customerがあるか確認
    const { data: existingContract } = await supabase
      .from('contracts')
      .select('stripe_customer_id')
      .eq('id', contractId)
      .single();

    if (existingContract?.stripe_customer_id) {
      logger.info('Stripe customer already exists', {
        contractId,
        customerId: existingContract.stripe_customer_id,
      });
      return {
        success: true,
        customerId: existingContract.stripe_customer_id,
      };
    }

    // Stripe Customer作成
    const customer = await stripe.customers.create({
      email,
      name: organizationName,
      metadata: {
        contract_id: contractId,
        organization_id: organizationId,
        payment_method: paymentMethod,
      },
      invoice_settings: {
        default_payment_method: undefined, // カード情報は別途設定
      },
    });

    logger.info('Stripe customer created', {
      contractId,
      customerId: customer.id,
    });

    // contractsテーブルを更新
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        stripe_customer_id: customer.id,
      })
      .eq('id', contractId);

    if (updateError) {
      logger.error('Failed to update contract with stripe_customer_id', {
        contractId,
        customerId: customer.id,
        error: updateError,
      });

      // ロールバック: Stripe Customerを削除
      try {
        await stripe.customers.del(customer.id);
        logger.info('Rolled back Stripe customer', { customerId: customer.id });
      } catch (rollbackError) {
        logger.error('Failed to rollback Stripe customer', {
          customerId: customer.id,
          error: rollbackError,
        });
      }

      return {
        success: false,
        error: 'データベース更新に失敗しました',
      };
    }

    logger.info('Contract billing setup completed', {
      contractId,
      customerId: customer.id,
    });

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error: unknown) {
    logger.error('Failed to setup contract billing', {
      contractId,
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * カード決済用の支払い方法を設定
 *
 * カード決済を選択した顧客に対して、カード情報を登録してもらう
 * Setup Intentを使用
 */
export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        type: 'initial_card_setup',
      },
    });

    return {
      success: true,
      clientSecret: setupIntent.client_secret,
    };
  } catch (error: unknown) {
    logger.error('Failed to create setup intent', { customerId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
