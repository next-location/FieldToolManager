import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { setSuperAdminAuditContext } from '@/lib/supabase/audit-context';
import { generateUniqueSubdomain } from '@/lib/utils/subdomain';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // サブドメインを自動生成（セキュリティのため組織名は使わず、ランダムな文字列を生成）
    const subdomain = await generateUniqueSubdomain(supabase);

    // スーパーアドミンの監査コンテキストを設定
    await setSuperAdminAuditContext(supabase, session.id, session.name);

    // 組織を作成 - Supabase Clientを使用
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        subdomain,
        is_active: body.is_active ?? true,
        plan: 'basic',
        payment_method: 'invoice',
        representative_name: body.representative_name || null,
        postal_code: body.postal_code || null,
        address: body.address || null,
        phone: body.phone || null,
        fax: body.fax || null,
        email: body.email || null,
        billing_contact_name: body.billing_contact_name || null,
        billing_contact_email: body.billing_contact_email || null,
        billing_contact_phone: body.billing_contact_phone || null,
        billing_address: body.billing_address || null,
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
