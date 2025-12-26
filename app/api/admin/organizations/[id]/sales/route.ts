import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { salesStatusLabels } from '@/lib/constants/sales-status';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const {
    salesStatus,
    lastContactDate,
    nextAppointmentDate,
    expectedContractAmount,
    priority,
    leadSource,
    salesNotes,
  } = body;

  // 組織の営業情報を更新
  const { data, error } = await supabase
    .from('organizations')
    .update({
      sales_status: salesStatus,
      last_contact_date: lastContactDate || null,
      next_appointment_date: nextAppointmentDate || null,
      expected_contract_amount: expectedContractAmount ? parseInt(expectedContractAmount) : null,
      priority,
      lead_source: leadSource || null,
      sales_notes: salesNotes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update sales info:', error);
    return NextResponse.json({ error: '営業情報の更新に失敗しました' }, { status: 500 });
  }

  // 営業ステータスが「契約中」に変更された場合、契約が存在するかチェック
  let contractWarning = null;
  if (salesStatus === 'contracted') {
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('organization_id', id)
      .eq('status', 'active')
      .limit(1);

    if (!contracts || contracts.length === 0) {
      contractWarning = 'この組織の契約情報が登録されていません。契約管理から契約を作成してください。';
    }
  }

  // 営業活動ログを追加（ステータス変更の場合）
  const { data: activityData, error: activityError } = await supabase
    .from('sales_activities')
    .insert({
      organization_id: id,
      activity_type: 'status_change',
      title: '営業情報更新',
      description: `営業ステータスを「${salesStatusLabels[salesStatus] || salesStatus}」に更新しました`,
      created_by: session.id,
      created_by_name: session.name,
    })
    .select()
    .single();

  if (activityError) {
    console.error('Failed to create sales activity log:', activityError);
    // 活動ログの失敗は営業情報更新自体は成功しているので、エラーは返さない
  }

  return NextResponse.json({
    organization: data,
    warning: contractWarning,
    activity: activityData || null,
  });
}
