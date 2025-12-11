import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { setSuperAdminAuditContext } from '@/lib/supabase/audit-context';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // サブドメインの重複チェック
    if (body.subdomain) {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', body.subdomain)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'このサブドメインは既に使用されています' }, { status: 400 });
      }
    }

    // スーパーアドミンの監査コンテキストを設定
    await setSuperAdminAuditContext(supabase, session.id, session.name);

    // 組織を作成
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        subdomain: body.subdomain,
        phone: body.phone || null,
        fax: body.fax || null,
        postal_code: body.postal_code || null,
        address: body.address || null,
        billing_contact_name: body.billing_contact_name || null,
        billing_contact_email: body.billing_contact_email || null,
        billing_contact_phone: body.billing_contact_phone || null,
        billing_address: body.billing_address || null,
        is_active: body.is_active ?? true,
        plan: 'basic', // デフォルトプラン
        payment_method: 'invoice', // デフォルト支払い方法
      })
      .select()
      .single();

    if (error) {
      console.error('Organization creation error:', error);
      return NextResponse.json({ error: '組織の作成に失敗しました', details: error.message }, { status: 500 });
    }

    // 操作ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'create_organization',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({ success: true, organization });
  } catch (error) {
    console.error('Error in POST /api/admin/organizations:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
