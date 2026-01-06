import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 見積もり却下API
 *
 * POST /api/admin/invoices/[id]/reject
 *
 * 送信済みの見積もりを却下します。
 * - status を 'rejected' に変更
 * - 再見積もりが必要な状態にする
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 見積もりデータを取得
    const { data: estimate, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, document_type')
      .eq('id', id)
      .single();

    if (error || !estimate) {
      return NextResponse.json({ error: '見積もりが見つかりません' }, { status: 404 });
    }

    // document_typeがestimateであることを確認
    if (estimate.document_type !== 'estimate') {
      return NextResponse.json({ error: 'この文書は見積もりではありません' }, { status: 400 });
    }

    // statusがestimate_sentであることを確認
    if (estimate.status !== 'estimate_sent') {
      return NextResponse.json({
        error: `見積もりの却下はestimate_sentステータスでのみ可能です。現在のステータス: ${estimate.status}`
      }, { status: 400 });
    }

    // ステータスを 'rejected' に更新
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'rejected',
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Reject Estimate] Update error:', updateError);
      return NextResponse.json(
        { error: '見積もりの却下に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'reject_estimate',
        details: {
          estimate_id: id,
          estimate_number: estimate.invoice_number,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      message: '見積もりを却下しました',
    });
  } catch (error: any) {
    console.error('[Reject Estimate API] Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
