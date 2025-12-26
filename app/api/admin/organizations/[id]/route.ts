import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { setSuperAdminAuditContext } from '@/lib/supabase/audit-context';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // サブドメインの重複チェック（自分以外）
    if (body.subdomain) {
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('subdomain', body.subdomain)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: 'このサブドメインは既に使用されています' }, { status: 400 });
      }
    }

    // スーパーアドミンの監査コンテキストを設定
    await setSuperAdminAuditContext(supabase, session.id, session.name);

    // 組織を更新
    const { data: organization, error } = await supabase
      .from('organizations')
      .update({
        name: body.name,
        subdomain: body.subdomain,
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
        is_active: body.is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Organization update error:', error);
      return NextResponse.json({ error: '組織の更新に失敗しました', details: error.message }, { status: 500 });
    }

    // 操作ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'update_organization',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({ success: true, organization });
  } catch (error) {
    console.error('Error in PUT /api/admin/organizations/[id]:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // owner権限のみ削除可能
    if (session.role !== 'owner') {
      return NextResponse.json({ error: '組織の削除はオーナー権限が必要です' }, { status: 403 });
    }

    const { id } = await params;

    // 組織削除前に操作ログを記録（削除後は組織が存在しないため）
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'delete_organization',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    // 組織を削除（CASCADE設定により関連データも自動削除）
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Organization delete error:', error);
      return NextResponse.json({ error: '組織の削除に失敗しました', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/organizations/[id]:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
