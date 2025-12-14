/**
 * 2FA猶予期間管理API
 * GET /api/admin/2fa/grace-period - 猶予期間の状態を取得
 * POST /api/admin/2fa/grace-period - 猶予期間を開始
 * PUT /api/admin/2fa/grace-period - 猶予期間を更新
 * DELETE /api/admin/2fa/grace-period - 猶予期間を削除（免除）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * 猶予期間の状態を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const token = request.cookies.get('super_admin_token')?.value;
    const userToken = request.cookies.get('user_token')?.value;

    if (!token && !userToken) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // JWTトークンの検証
    const jwt = await import('jsonwebtoken');
    let session: any;
    let isAdmin = false;

    if (token) {
      try {
        session = jwt.verify(token, process.env.JWT_SECRET!) as any;
        isAdmin = true;
      } catch (error) {
        // Super adminトークンが無効
      }
    }

    if (!session && userToken) {
      try {
        session = jwt.verify(userToken, process.env.JWT_SECRET!) as any;
      } catch (error) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
      }
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ユーザー情報を取得
    let userId = request.nextUrl.searchParams.get('user_id');
    let organizationId = request.nextUrl.searchParams.get('organization_id');

    if (!isAdmin) {
      // 通常ユーザーの場合、自分の情報のみ取得
      userId = session.id;
    }

    // 猶予期間情報を取得
    let query = supabase
      .from('two_factor_grace_periods')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (!userId && !organizationId) {
      // システム管理者の場合、全猶予期間を取得
      if (!isAdmin) {
        return NextResponse.json(
          { error: '権限がありません' },
          { status: 403 }
        );
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch grace periods:', error);
      return NextResponse.json(
        { error: '猶予期間の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 現在の日時と比較して、猶予期間の状態を更新
    const now = new Date();
    const updatedData = data?.map(period => {
      const endDate = new Date(period.grace_end_date);
      const isExpired = endDate < now && period.status === 'pending';

      return {
        ...period,
        status: isExpired ? 'expired' : period.status,
        remaining_days: Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      };
    });

    return NextResponse.json(updatedData || []);

  } catch (error) {
    console.error('Grace period GET error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 猶予期間を開始
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const token = request.cookies.get('super_admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const jwt = await import('jsonwebtoken');
    let session: any;

    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { user_ids, organization_id, grace_days = 30 } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    if (!organization_id) {
      return NextResponse.json(
        { error: '組織IDが必要です' },
        { status: 400 }
      );
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 猶予期間の終了日を計算
    const graceEndDate = new Date();
    graceEndDate.setDate(graceEndDate.getDate() + grace_days);

    // 各ユーザーに対して猶予期間を設定
    const gracePeriods = user_ids.map(userId => ({
      user_id: userId,
      organization_id,
      grace_end_date: graceEndDate.toISOString(),
      status: 'pending',
    }));

    // 既存の猶予期間をチェック
    const { data: existingPeriods, error: checkError } = await supabase
      .from('two_factor_grace_periods')
      .select('user_id')
      .in('user_id', user_ids)
      .eq('status', 'pending');

    if (checkError) {
      console.error('Failed to check existing grace periods:', checkError);
      return NextResponse.json(
        { error: '既存の猶予期間の確認に失敗しました' },
        { status: 500 }
      );
    }

    // 既に猶予期間が設定されているユーザーを除外
    const existingUserIds = existingPeriods?.map(p => p.user_id) || [];
    const newGracePeriods = gracePeriods.filter(p => !existingUserIds.includes(p.user_id));

    if (newGracePeriods.length === 0) {
      return NextResponse.json(
        { message: 'すべてのユーザーには既に猶予期間が設定されています' },
        { status: 200 }
      );
    }

    // 猶予期間を挿入
    const { error: insertError } = await supabase
      .from('two_factor_grace_periods')
      .insert(newGracePeriods);

    if (insertError) {
      console.error('Failed to create grace periods:', insertError);
      return NextResponse.json(
        { error: '猶予期間の作成に失敗しました' },
        { status: 500 }
      );
    }

    // 監査ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: '2FA猶予期間開始',
        details: {
          user_ids: newGracePeriods.map(p => p.user_id),
          organization_id,
          grace_days,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: `${newGracePeriods.length}名のユーザーに猶予期間を設定しました`,
      created_count: newGracePeriods.length,
      skipped_count: existingUserIds.length,
    });

  } catch (error) {
    console.error('Grace period POST error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 猶予期間を更新（延長）
 */
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const token = request.cookies.get('super_admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const jwt = await import('jsonwebtoken');
    let session: any;

    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, additional_days } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    if (!additional_days || additional_days <= 0) {
      return NextResponse.json(
        { error: '延長日数を指定してください' },
        { status: 400 }
      );
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 現在の猶予期間を取得
    const { data: currentPeriod, error: fetchError } = await supabase
      .from('two_factor_grace_periods')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !currentPeriod) {
      return NextResponse.json(
        { error: '有効な猶予期間が見つかりません' },
        { status: 404 }
      );
    }

    // 新しい終了日を計算
    const newEndDate = new Date(currentPeriod.grace_end_date);
    newEndDate.setDate(newEndDate.getDate() + additional_days);

    // 猶予期間を更新
    const { error: updateError } = await supabase
      .from('two_factor_grace_periods')
      .update({
        grace_end_date: newEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentPeriod.id);

    if (updateError) {
      console.error('Failed to update grace period:', updateError);
      return NextResponse.json(
        { error: '猶予期間の更新に失敗しました' },
        { status: 500 }
      );
    }

    // 監査ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: '2FA猶予期間延長',
        details: {
          user_id,
          additional_days,
          new_end_date: newEndDate.toISOString(),
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: `猶予期間を${additional_days}日延長しました`,
      new_end_date: newEndDate.toISOString(),
    });

  } catch (error) {
    console.error('Grace period PUT error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 猶予期間を削除（免除）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const token = request.cookies.get('super_admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const jwt = await import('jsonwebtoken');
    let session: any;

    try {
      session = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 猶予期間を免除に更新
    const { error: updateError } = await supabase
      .from('two_factor_grace_periods')
      .update({
        status: 'exempted',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Failed to exempt grace period:', updateError);
      return NextResponse.json(
        { error: '猶予期間の免除に失敗しました' },
        { status: 500 }
      );
    }

    // 監査ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: '2FA猶予期間免除',
        details: {
          user_id: userId,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: '2FA猶予期間を免除しました',
    });

  } catch (error) {
    console.error('Grace period DELETE error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}