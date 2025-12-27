import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { sendWelcomeEmail } from '@/lib/email/welcome';
import { setupContractBilling } from '@/lib/billing/setup-contract-billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// パスワード自動生成関数
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let createdAuthUserId: string | null = null;

  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Super Admin の権限を確認
    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 });
    }

    // Owner権限チェック
    if (adminData.role !== 'owner') {
      return NextResponse.json(
        { error: '契約の完了はオーナーのみ実行できます' },
        { status: 403 }
      );
    }

    const { id: contractId } = await params;

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 });
    }

    // ステータスがdraftであることを確認
    if (contract.status !== 'draft') {
      return NextResponse.json({
        error: `この契約は既に${contract.status}状態です。draft状態の契約のみ完了できます。`
      }, { status: 400 });
    }

    // 管理者情報が存在することを確認
    if (!contract.admin_name || !contract.admin_email || !contract.admin_password) {
      return NextResponse.json({
        error: '初期管理者情報が不足しています。契約を再作成してください。'
      }, { status: 400 });
    }

    console.log('[API /api/admin/contracts/complete] Starting contract completion:', contractId);

    // 新しいパスワードを自動生成（セキュリティのため、保存されていたパスワードは使わない）
    const newPassword = generateSecurePassword();
    console.log('[API /api/admin/contracts/complete] Generated new secure password');

    // Supabase Authでアカウント作成
    console.log('[API /api/admin/contracts/complete] Creating Supabase Auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: contract.admin_email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        name: contract.admin_name,
        phone: contract.admin_phone || null,
      },
    });

    if (authError || !authUser.user) {
      console.error('[API /api/admin/contracts/complete] Auth user creation failed:', authError);
      return NextResponse.json({
        error: '初期管理者アカウントの作成に失敗しました',
        details: authError?.message,
      }, { status: 500 });
    }

    createdAuthUserId = authUser.user.id;
    console.log('[API /api/admin/contracts/complete] Auth user created:', createdAuthUserId);

    // usersテーブルにレコード作成
    console.log('[API /api/admin/contracts/complete] Creating user record in users table...');
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: contract.admin_email,
        name: contract.admin_name,
        phone: contract.admin_phone || null,
        organization_id: contract.organization_id,
        role: 'admin',
        is_active: true,
        must_change_password: true, // 初回ログイン時にパスワード変更を強制
      });

    if (userError) {
      console.error('[API /api/admin/contracts/complete] User table insert failed:', userError);

      // ロールバック: Authユーザーを削除
      console.log('[API /api/admin/contracts/complete] Rolling back: Deleting Auth user...');
      await supabase.auth.admin.deleteUser(createdAuthUserId);

      return NextResponse.json({
        error: '初期管理者アカウントのデータベース登録に失敗しました',
        details: userError.message,
      }, { status: 500 });
    }

    console.log('[API /api/admin/contracts/complete] User record created successfully');

    // 組織情報を取得（Stripe Customer作成用）
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name, subdomain, payment_method')
      .eq('id', contract.organization_id)
      .single();

    if (orgError || !orgData) {
      console.error('[API /api/admin/contracts/complete] Organization not found:', orgError);
      return NextResponse.json({
        error: '組織情報の取得に失敗しました',
        details: orgError?.message,
      }, { status: 500 });
    }

    // Stripe Customerを作成
    console.log('[API /api/admin/contracts/complete] Creating Stripe customer...');
    const billingResult = await setupContractBilling({
      contractId,
      organizationId: contract.organization_id,
      organizationName: orgData.name,
      email: contract.admin_email,
      paymentMethod: orgData.payment_method || 'invoice',
    });

    if (!billingResult.success) {
      console.error('[API /api/admin/contracts/complete] Stripe customer creation failed:', billingResult.error);
      // Stripe作成失敗はエラーにしない（後で手動で作成可能）
    } else {
      console.log('[API /api/admin/contracts/complete] Stripe customer created:', billingResult.customerId);
    }

    // 契約を更新: ステータスをactiveに、管理者情報をクリア、完了日時を記録
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'active',
        admin_user_id: authUser.user.id,
        contract_completed_at: new Date().toISOString(),
        admin_password: null, // セキュリティのためパスワードをクリア
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('[API /api/admin/contracts/complete] Contract update failed:', updateError);
      // ここでロールバックはしない（アカウントは作成済みなので、手動で処理）
      return NextResponse.json({
        error: '契約のステータス更新に失敗しましたが、アカウントは作成されました',
        details: updateError.message,
        userId: authUser.user.id,
      }, { status: 500 });
    }

    // 組織のプラン情報と営業ステータスを更新
    await supabase
      .from('organizations')
      .update({
        plan: contract.plan,
        max_users: contract.user_limit,
        is_active: true,
        sales_status: 'contracted', // 営業ステータスを「契約中」に更新
      })
      .eq('id', contract.organization_id);

    // 営業活動ログを追加
    await supabase.from('sales_activities').insert({
      organization_id: contract.organization_id,
      activity_type: 'other',
      title: '契約完了',
      description: `契約が完了しました（契約番号: ${contract.contract_number}、プラン: ${contract.plan}）`,
      created_by: session.id,
      created_by_name: session.name,
    });

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'complete_contract',
        details: {
          contract_id: contractId,
          organization_id: contract.organization_id,
          admin_user_id: authUser.user.id,
          admin_email: contract.admin_email,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });


    console.log('[API /api/admin/contracts/complete] Contract completed successfully');

    // ウェルカムメール送信（orgDataは既に取得済み）
    if (orgData && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) {
      try {
        // 環境に応じたログインURLを生成
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000';
        const protocol = baseDomain.includes('localhost') ? 'http' : 'https';
        const loginUrl = `${protocol}://${orgData.subdomain}.${baseDomain}`;

        await sendWelcomeEmail({
          toEmail: contract.admin_email,
          adminName: contract.admin_name,
          organizationName: orgData.name,
          subdomain: orgData.subdomain,
          loginUrl,
          password: newPassword,
        });
        console.log('[API /api/admin/contracts/complete] Welcome email sent successfully to:', contract.admin_email);
      } catch (emailError) {
        console.error('[API /api/admin/contracts/complete] Failed to send welcome email:', emailError);
        // メール送信失敗はエラーにしない（アカウントは既に作成済み）
      }
    } else {
      console.warn('[API /api/admin/contracts/complete] Skipping welcome email (no email provider configured)');
    }

    return NextResponse.json({
      success: true,
      message: '契約が完了しました。初期管理者アカウントが作成されました。',
      adminEmail: contract.admin_email,
      adminPassword: newPassword, // 画面に表示してコピーできるように返す
      userId: authUser.user.id,
    });
  } catch (error: any) {
    console.error('[API /api/admin/contracts/complete] Error:', error);

    // エラー発生時にAuthユーザーが作成されていればロールバック
    if (createdAuthUserId) {
      console.log('[API /api/admin/contracts/complete] Error occurred, rolling back Auth user:', createdAuthUserId);
      try {
        await supabase.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackError) {
        console.error('[API /api/admin/contracts/complete] Rollback failed:', rollbackError);
      }
    }

    return NextResponse.json({
      error: 'サーバーエラーが発生しました',
      details: error.message,
    }, { status: 500 });
  }
}
