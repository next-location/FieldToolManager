import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 見積もり削除API
 *
 * DELETE /api/admin/invoices/[id]/delete-estimate
 *
 * estimate ステータスの見積もりのみ削除可能
 * estimate_sent や rejected は削除不可（履歴として保持）
 */
export async function DELETE(
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

    // statusがestimateであることを確認（未送信のみ削除可能）
    if (estimate.status !== 'estimate') {
      return NextResponse.json({
        error: `送信済みまたは却下された見積もりは削除できません。現在のステータス: ${estimate.status}`
      }, { status: 400 });
    }

    // 見積もり明細を削除
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    // 見積もりを削除
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Delete Estimate] Delete error:', deleteError);
      return NextResponse.json(
        { error: '見積もりの削除に失敗しました', details: deleteError.message },
        { status: 500 }
      );
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'delete_estimate',
        details: {
          estimate_id: id,
          estimate_number: estimate.invoice_number,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      message: '見積もりを削除しました',
    });
  } catch (error: any) {
    console.error('[Delete Estimate API] Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
