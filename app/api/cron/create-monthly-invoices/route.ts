import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import { calculateMonthlyFee, generateInvoiceDescription, Contract } from '@/lib/billing/calculate-fee';
import { logger } from '@/lib/logger';
import { generateStripeInvoicePDF } from '@/lib/pdf/stripe-invoice-generator';
import { sendStripeInvoiceEmail } from '@/lib/email/stripe-billing';
import { getAdjustedBillingDate, getEndOfMonth } from '@/lib/utils/business-days';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 毎月の請求書自動生成Cron
 *
 * 毎日実行され、請求日が今日の契約に対して請求書を自動生成
 *
 * GET /api/cron/create-monthly-invoices
 *
 * Vercel Cronから呼び出される
 *
 * 処理フロー:
 * 1. 今日が請求日（billing_day）の有効な契約を取得
 * 2. 各契約の料金を計算（人数、パッケージ、初期費用、割引）
 * 3. Stripe Invoice Itemを作成
 * 4. Stripe Invoiceを作成
 * 5. 支払い方法に応じて処理:
 *    - カード決済: 自動決済実行
 *    - 請求書払い: PDFを生成してメール送信
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronからの呼び出しのみ許可）
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron request', { authHeader });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayDay = today.getDate();

    logger.info('Starting monthly invoice creation process', {
      date: today.toISOString(),
      todayDay,
    });

    // すべての有効な月払い契約を取得
    const { data: allMonthlyContracts, error: monthlyError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          payment_method
        )
      `)
      .eq('status', 'active')
      .eq('billing_cycle', 'monthly');

    // 請求日の20日前が今日の契約をフィルタ（初回請求を除く）
    const monthlyContracts = (allMonthlyContracts || []).filter(contract => {
      // 今月の請求日を取得（営業日調整済み）
      const currentMonthBillingDate = getAdjustedBillingDate(contract.billing_day, today);

      // 次月の請求日を取得（来月の同じ日）
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthBillingDate = getAdjustedBillingDate(contract.billing_day, nextMonth);

      // 請求書送信日 = 請求日の20日前
      const invoiceSendDate = new Date(nextMonthBillingDate);
      invoiceSendDate.setDate(invoiceSendDate.getDate() - 20);

      // 今日が請求書送信日かチェック
      const isInvoiceSendDay = invoiceSendDate.getDate() === todayDay &&
                               invoiceSendDate.getMonth() === today.getMonth() &&
                               invoiceSendDate.getFullYear() === today.getFullYear();

      // 初回請求かどうかをチェック（契約開始日から1ヶ月以内は初回とみなす）
      const contractStartDate = new Date(contract.start_date);
      const oneMonthAfterStart = new Date(contractStartDate);
      oneMonthAfterStart.setMonth(oneMonthAfterStart.getMonth() + 1);
      const isInitialInvoice = today < oneMonthAfterStart;

      // 初回請求は除外（初回は契約完了時に即時発行）
      return isInvoiceSendDay && !isInitialInvoice;
    });

    // 年払い契約で今日が年次請求日のものを取得
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: annualContracts, error: annualError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          payment_method
        )
      `)
      .eq('status', 'active')
      .eq('billing_cycle', 'annual');

    // エラーハンドリング
    const contractsError = monthlyError || annualError;
    if (contractsError) {
      logger.error('Failed to fetch contracts', { error: contractsError });
      return NextResponse.json(
        { error: 'データベースエラー' },
        { status: 500 }
      );
    }

    // 年払い契約のうち、請求日の20日前が今日のものをフィルタ（初回請求を除く）
    const annualContractsToday = (annualContracts || []).filter(contract => {
      const startDate = new Date(contract.start_date);
      const billingDay = startDate.getDate();

      // 次回の年次請求日を取得
      const nextAnniversary = new Date(today);
      nextAnniversary.setFullYear(today.getFullYear() + 1);
      nextAnniversary.setMonth(startDate.getMonth());
      nextAnniversary.setDate(billingDay);
      const adjustedAnniversary = getAdjustedBillingDate(billingDay, nextAnniversary);

      // 請求書送信日 = 請求日の20日前
      const invoiceSendDate = new Date(adjustedAnniversary);
      invoiceSendDate.setDate(invoiceSendDate.getDate() - 20);

      // 今日が請求書送信日かチェック
      const isInvoiceSendDay = invoiceSendDate.getDate() === todayDay &&
                               invoiceSendDate.getMonth() === today.getMonth() &&
                               invoiceSendDate.getFullYear() === today.getFullYear();

      // 初回請求かどうかをチェック（契約開始日から1年以内は初回とみなす）
      const oneYearAfterStart = new Date(startDate);
      oneYearAfterStart.setFullYear(oneYearAfterStart.getFullYear() + 1);
      const isInitialInvoice = today < oneYearAfterStart;

      // 初回請求は除外（初回は契約完了時に即時発行）
      return isInvoiceSendDay && !isInitialInvoice;
    });

    // 月払いと年払いを統合
    const contracts = [...(monthlyContracts || []), ...annualContractsToday];

    if (!contracts || contracts.length === 0) {
      logger.info('No contracts to bill today', { todayDay });
      return NextResponse.json({
        success: true,
        message: '本日請求する契約はありません',
        count: 0,
      });
    }

    logger.info('Found contracts to bill', { count: contracts.length });

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // 各契約に対して請求書を作成
    for (const contract of contracts) {
      // デバッグ：契約データの構造を確認
      logger.info('DEBUG: Contract data structure', {
        contractId: contract.id,
        hasOrganizations: !!contract.organizations,
        organizationsType: typeof contract.organizations,
        organizationsIsArray: Array.isArray(contract.organizations),
        organizationsValue: JSON.stringify(contract.organizations),
      });

      // organizationsは配列として返される可能性があるため、最初の要素を取得
      const organization = Array.isArray(contract.organizations)
        ? contract.organizations[0]
        : contract.organizations;

      // ✨ プラン変更予約のチェック（ダウングレード時のユーザー数警告）
      if (contract.pending_plan_change) {
        const pendingChange = contract.pending_plan_change as any;

        logger.info('Pending plan change detected', {
          contractId: contract.id,
          isDowngrade: pendingChange.is_downgrade,
          userExceeded: pendingChange.user_exceeded
        });

        // ダウングレードでユーザー数超過の場合、警告メール送信
        if (pendingChange.is_downgrade && pendingChange.user_exceeded) {
          // 現在のユーザー数を再確認
          const { count: currentUserCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .is('deleted_at', null);

          const actualUserCount = currentUserCount || 0;

          if (actualUserCount > pendingChange.new_user_limit) {
            // まだユーザー数超過 → 警告メール送信
            const { sendInitialPlanChangeWarning } = await import('@/lib/email/plan-change-notifications');

            const graceDeadline = new Date(pendingChange.effective_date);
            graceDeadline.setDate(graceDeadline.getDate() + 3);

            await sendInitialPlanChangeWarning({
              to: contract.billing_contact_email || contract.admin_email || '',
              organizationName: organization.name,
              effectiveDate: pendingChange.effective_date,
              currentPlan: pendingChange.old_plan,
              newPlan: pendingChange.new_plan,
              currentUserLimit: pendingChange.old_user_limit,
              newUserLimit: pendingChange.new_user_limit,
              currentUserCount: actualUserCount,
              excessCount: actualUserCount - pendingChange.new_user_limit,
              graceDeadline: graceDeadline.toISOString().split('T')[0]
            });

            logger.info('Initial plan change warning sent', {
              contractId: contract.id,
              to: contract.billing_contact_email || contract.admin_email,
              excessCount: actualUserCount - pendingChange.new_user_limit
            });
          }
        }
      }

      logger.info('DEBUG: Organization after extraction', {
        hasOrganization: !!organization,
        organizationType: typeof organization,
        organizationValue: JSON.stringify(organization),
      });

      if (!organization) {
        logger.warn('Organization not found for contract', { contractId: contract.id });
        failureCount++;
        errors.push(`Contract ${contract.id}: Organization not found`);
        continue;
      }

      if (!contract.stripe_customer_id) {
        logger.warn('Stripe customer not created for contract', {
          contractId: contract.id,
          organizationId: organization.id,
        });
        failureCount++;
        errors.push(`Contract ${contract.id}: Stripe Customer not created`);
        continue;
      }

      try {
        // 料金計算
        const feeCalculation = calculateMonthlyFee(contract as Contract);

        if (feeCalculation.total <= 0) {
          logger.warn('Calculated fee is zero or negative, skipping', {
            contractId: contract.id,
            total: feeCalculation.total,
          });
          continue;
        }

        logger.info('Calculated monthly fee', {
          contractId: contract.id,
          organizationId: organization.id,
          total: feeCalculation.total,
          itemCount: feeCalculation.items.length,
        });

        // Stripe Invoiceを作成（Draft状態）
        const billingMonth = `${today.getFullYear()}年${today.getMonth() + 1}月`;
        const invoice = await stripe.invoices.create({
          customer: contract.stripe_customer_id,
          description: generateInvoiceDescription(contract as Contract, billingMonth),
          collection_method: organization.payment_method === 'card' ? 'charge_automatically' : 'send_invoice',
          days_until_due: organization.payment_method === 'card' ? undefined : 30,
          auto_advance: false, // 自動確定を無効化
          metadata: {
            contract_id: contract.id,
            organization_id: organization.id,
            billing_month: billingMonth,
          },
        });

        // Stripe Invoice Itemsを作成（作成したInvoiceに追加）
        for (const item of feeCalculation.items) {
          await stripe.invoiceItems.create({
            customer: contract.stripe_customer_id,
            invoice: invoice.id, // InvoiceIDを指定
            amount: item.amount,
            currency: 'jpy',
            description: item.description,
          });
        }

        logger.info('Stripe invoice created', {
          invoiceId: invoice.id,
          contractId: contract.id,
          amount: invoice.amount_due,
        });

        // Invoiceを確定
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

        // 支払い方法に応じて処理
        if (organization.payment_method === 'card') {
          // カード決済: 自動決済実行
          try {
            await stripe.invoices.pay(finalizedInvoice.id);
            logger.info('Card payment executed successfully', {
              invoiceId: finalizedInvoice.id,
              contractId: contract.id,
            });
          } catch (paymentError: any) {
            logger.error('Card payment failed', {
              invoiceId: finalizedInvoice.id,
              contractId: contract.id,
              error: paymentError.message,
            });
            // 決済失敗でもInvoiceは作成されているので、Webhookで処理
          }
        } else {
          // 請求書払い: PDFを生成してメール送信
          logger.info('Generating invoice PDF for manual payment', {
            invoiceId: finalizedInvoice.id,
            contractId: contract.id,
          });

          // カスタムPDF生成
          logger.info('DEBUG: Fee calculation before PDF generation', {
            contractId: contract.id,
            subtotal: feeCalculation.subtotal,
            discount: feeCalculation.discount,
            total: feeCalculation.total,
            subtotalType: typeof feeCalculation.subtotal,
            totalType: typeof feeCalculation.total,
            items: feeCalculation.items,
          });

          const taxAmount = Math.round((feeCalculation.subtotal || 0) * 0.1);
          const pdfBuffer = await generateStripeInvoicePDF({
            invoiceNumber: finalizedInvoice.number || `INV-${Date.now()}`,
            invoiceDate: new Date(finalizedInvoice.created * 1000).toISOString().split('T')[0],
            dueDate: finalizedInvoice.due_date
              ? new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0]
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paymentMethod: 'invoice',
            organization: {
              name: organization.name,
              address: contract.billing_address || undefined,
              phone: contract.billing_contact_phone || undefined,
              email: contract.billing_contact_email || contract.admin_email || undefined,
            },
            items: feeCalculation.items.map(item => ({
              description: item.description,
              quantity: 1,
              unitPrice: item.amount,
              amount: item.amount,
            })),
            subtotal: feeCalculation.subtotal || 0,
            tax: taxAmount,
            total: feeCalculation.total || 0,
          });

          // メール送信（請求先メールまたは管理者メール）
          const recipientEmail = contract.billing_contact_email || contract.admin_email;
          if (recipientEmail) {
            await sendStripeInvoiceEmail({
              to: recipientEmail,
              organizationName: organization.name,
              invoiceNumber: finalizedInvoice.number || `INV-${Date.now()}`,
              amount: feeCalculation.total,
              dueDate: finalizedInvoice.due_date
                ? new Date(finalizedInvoice.due_date * 1000).toISOString().split('T')[0]
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              pdfBuffer,
              paymentMethod: 'invoice',
            });

            logger.info('Invoice email sent successfully', {
              invoiceId: finalizedInvoice.id,
              to: recipientEmail,
            });
          } else {
            logger.warn('No email address found for invoice', {
              contractId: contract.id,
              invoiceId: finalizedInvoice.id,
            });
          }
        }

        // データベースに請求レコード保存（2回目以降の請求書なのでis_initial_invoice = false）
        const { data: savedInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert({
            organization_id: organization.id,
            contract_id: contract.id,
            stripe_invoice_id: finalizedInvoice.id,
            invoice_number: finalizedInvoice.number || `INV-${Date.now()}`,
            amount: feeCalculation.subtotal || 0, // 税抜金額
            tax_amount: Math.round((feeCalculation.subtotal || 0) * 0.1), // 消費税10%
            total_amount: feeCalculation.total || 0, // 税込合計
            status: finalizedInvoice.status === 'paid' ? 'paid' : 'pending',
            due_date: finalizedInvoice.due_date
              ? new Date(finalizedInvoice.due_date * 1000).toISOString()
              : null,
            invoice_date: new Date().toISOString(),
            issued_at: new Date().toISOString(),
            is_initial_invoice: false, // 自動発行される請求書は常に2回目以降
          })
          .select()
          .single();

        if (insertError || !savedInvoice) {
          logger.error('Failed to save invoice to database', {
            invoiceId: finalizedInvoice.id,
            error: insertError,
          });
        } else {
          // invoice_itemsテーブルに明細を保存
          const itemsToInsert = feeCalculation.items.map(item => ({
            invoice_id: savedInvoice.id,
            description: item.description,
            quantity: 1,
            unit_price: item.amount,
            amount: item.amount,
          }));

          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsToInsert);

          if (itemsError) {
            logger.error('Failed to save invoice items to database', {
              invoiceId: savedInvoice.id,
              error: itemsError,
            });
          } else {
            logger.info('Invoice items saved successfully', {
              invoiceId: savedInvoice.id,
              itemCount: itemsToInsert.length,
            });
          }

          // 日割り差額をクリア（次回請求に含めないため）
          if (contract.pending_prorated_charge && contract.pending_prorated_charge > 0) {
            const { error: clearError } = await supabase
              .from('contracts')
              .update({
                pending_prorated_charge: 0,
                pending_prorated_description: null,
              })
              .eq('id', contract.id);

            if (clearError) {
              logger.error('Failed to clear prorated charge', {
                contractId: contract.id,
                error: clearError,
              });
            } else {
              logger.info('Cleared prorated charge after invoice creation', {
                contractId: contract.id,
                proratedCharge: contract.pending_prorated_charge,
              });
            }
          }
        }

        successCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const orgName = organization?.name || 'Unknown Organization';

        logger.error('Failed to create invoice for contract', {
          contractId: contract.id,
          organizationId: organization?.id,
          organizationName: orgName,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        failureCount++;
        errors.push(
          `Contract ${contract.id} (${orgName}): ${errorMessage}`
        );
      }
    }

    logger.info('Monthly invoice creation completed', {
      total: contracts.length,
      success: successCount,
      failure: failureCount,
    });

    return NextResponse.json({
      success: true,
      total: contracts.length,
      successCount,
      failureCount,
      errors: failureCount > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    logger.error('Monthly invoice creation cron failed', { error });
    return NextResponse.json(
      { error: '請求書作成処理に失敗しました' },
      { status: 500 }
    );
  }
}
