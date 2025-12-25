import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { setSuperAdminAuditContext } from '@/lib/supabase/audit-context';
import { generateUniqueSubdomain } from '@/lib/utils/subdomain';
import { Pool } from 'pg';

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

// PostgreSQL直接接続（スキーマキャッシュ問題を完全回避）
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function POST(request: NextRequest) {
  try {
    // デバッグ: 接続先確認
    console.log('[DEBUG] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[DEBUG] SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[DEBUG] DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('[DEBUG] Using direct PostgreSQL connection:', !!pool);

    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // サブドメインを自動生成（セキュリティのため組織名は使わず、ランダムな文字列を生成）
    const subdomain = await generateUniqueSubdomain(supabase);

    // スーパーアドミンの監査コンテキストを設定
    await setSuperAdminAuditContext(supabase, session.id, session.name);

    // 組織を作成 - PostgreSQL直接接続でスキーマキャッシュ問題を完全回避
    console.log('[DEBUG] Inserting organization:', { name: body.name, subdomain });

    let organization;

    if (pool) {
      // 本番環境: PostgreSQL直接接続
      const client = await pool.connect();
      try {
        // スキーマを明示的に指定
        await client.query('SET search_path TO public');

        const result = await client.query(
          `INSERT INTO public.organizations (
            name, subdomain, is_active, plan, payment_method,
            representative_name, postal_code, address, phone, fax, email,
            billing_contact_name, billing_contact_email, billing_contact_phone, billing_address
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id, name, subdomain, is_active, plan, payment_method,
                    representative_name, postal_code, address, phone, fax, email,
                    billing_contact_name, billing_contact_email, billing_contact_phone, billing_address, created_at`,
          [
            body.name,
            subdomain,
            body.is_active ?? true,
            'basic',
            'invoice',
            body.representative_name || null,
            body.postal_code || null,
            body.address || null,
            body.phone || null,
            body.fax || null,
            body.email || null,
            body.billing_contact_name || null,
            body.billing_contact_email || null,
            body.billing_contact_phone || null,
            body.billing_address || null,
          ]
        );
        organization = result.rows[0];
        console.log('[DEBUG] Insert success (direct):', organization);
      } catch (dbError: any) {
        console.error('Database insert error:', dbError);
        return NextResponse.json({
          error: '組織の作成に失敗しました',
          details: dbError.message
        }, { status: 500 });
      } finally {
        client.release();
      }
    } else {
      // ローカル環境: Supabase SDK
      const { data, error } = await supabase
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

      organization = data;
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
