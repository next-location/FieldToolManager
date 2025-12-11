import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 営業活動履歴の取得
export async function GET(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationIdが必要です' }, { status: 400 });
  }

  const { data: activities, error } = await supabase
    .from('sales_activities')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json({ error: '活動履歴の取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ activities });
}

// 営業活動の追加
export async function POST(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const { organizationId, activityType, title, description } = body;

  if (!organizationId || !activityType || !title) {
    return NextResponse.json(
      { error: 'organizationId, activityType, titleは必須です' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('sales_activities')
    .insert({
      organization_id: organizationId,
      activity_type: activityType,
      title,
      description: description || null,
      created_by: session.id,
      created_by_name: session.name,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add activity:', error);
    return NextResponse.json({ error: '活動の追加に失敗しました' }, { status: 500 });
  }

  // 最終接触日を更新
  await supabase
    .from('organizations')
    .update({ last_contact_date: new Date().toISOString() })
    .eq('id', organizationId);

  return NextResponse.json({ activity: data });
}
