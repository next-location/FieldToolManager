import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { setSuperAdminAuditContext } from '@/lib/supabase/audit-context';
import { generateUniqueSubdomain } from '@/lib/utils/subdomain';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // デバッグ: 接続先確認
    console.log('[DEBUG] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[DEBUG] SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // サブドメインを自動生成（セキュリティのため組織名は使わず、ランダムな文字列を生成）
    const subdomain = await generateUniqueSubdomain(supabase);

    // スーパーアドミンの監査コンテキストを設定
    await setSuperAdminAuditContext(supabase, session.id, session.name);

    // 組織を作成
    console.log('[DEBUG] Inserting organization:', { name: body.name, subdomain });
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        subdomain,
        is_active: body.is_active ?? true,
        plan: 'basic', // デフォルトプラン
        payment_method: 'invoice', // デフォルト支払い方法
        representative_name: body.representative_name || null,
        postal_code: body.postal_code || null,
        address: body.address || null,
        phone: body.phone || null,
        fax: body.fax || null,
        email: body.email || null,
      })
      .select()
      .single();

    console.log('[DEBUG] Insert result:', { organization, error });

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
