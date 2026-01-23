import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEstimateHistory } from '@/lib/estimate-history'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { logEstimateCreated } from '@/lib/audit-log'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('organization_id, role, id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const clientId = searchParams.get('client_id') || ''
    const projectId = searchParams.get('project_id') || ''
    const creatorId = searchParams.get('creator_id') || ''
    const sortField = searchParams.get('sort_field') || 'estimate_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    let query = supabase
      .from('estimates')
      .select(
        `
        *,
        client:clients(id, name, client_code),
        project:projects(id, project_name, project_code),
        created_by_user:users!estimates_created_by_fkey(id, name),
        manager_approved_by_user:users!estimates_manager_approved_by_fkey(name)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // リーダーの場合は自分が作成した見積もりのみフィルタ
    if (userData.role === 'leader') {
      query = query.eq('created_by', user.id)
    }

    if (search) {
      query = query.or(
        `estimate_number.ilike.%${search}%,title.ilike.%${search}%`
      )
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (creatorId) {
      query = query.eq('created_by', creatorId)
    }

    // ソート順を適用
    const validSortFields = ['estimate_date', 'valid_until', 'total_amount']
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'estimate_date'
    const ascending = sortOrder === 'asc'

    const { data, error, count } = await query
      .order(finalSortField, { ascending })
      .order('created_at', { ascending: false }) // 同日の場合は新しい順
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching estimates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/estimates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[ESTIMATES API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()

    console.log('[見積書作成API] リクエストボディ:', JSON.stringify(body, null, 2))
    console.log('[見積書作成API] 明細データ:', JSON.stringify(body.items, null, 2))

    // 見積書本体を作成
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert({
        organization_id: userData.organization_id,
        estimate_number: body.estimate_number,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        estimate_date: body.estimate_date,
        valid_until: body.valid_until || null,
        title: body.title,
        subtotal: body.subtotal,
        tax_amount: body.tax_amount,
        total_amount: body.total_amount,
        status: body.status || 'draft',
        notes: body.notes || null,
        internal_notes: body.internal_notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (estimateError) {
      console.error('Error creating estimate:', estimateError)
      return NextResponse.json(
        { error: '見積書の作成に失敗しました' },
        { status: 500 }
      )
    }

    // 見積明細を作成
    if (body.items && body.items.length > 0) {
      const validItemTypes = ['construction', 'material', 'expense', 'labor', 'subcontract', 'other']

      const items = body.items.map((item: any) => {
        // item_typeが定義済みの値でない場合は'other'にして、元の値をcustom_typeに
        const isValidType = validItemTypes.includes(item.item_type)
        const itemType = isValidType ? item.item_type : 'other'
        const customType = isValidType ? (item.custom_type || null) : item.item_type

        return {
          estimate_id: estimate.id,
          display_order: item.display_order,
          item_type: itemType,
          custom_type: customType,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit: item.unit,
          custom_unit: item.custom_unit || null,
          unit_price: item.unit_price,
          amount: item.amount,
          tax_rate: item.tax_rate,
        }
      })

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(items)

      if (itemsError) {
        console.error('Error creating estimate items:', itemsError)
        // 見積書本体を削除してロールバック
        await supabase.from('estimates').delete().eq('id', estimate.id)
        return NextResponse.json(
          { error: '見積明細の作成に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 履歴を記録
    const actionType = body.status === 'submitted' ? 'submitted' : body.status === 'draft' ? 'draft_saved' : 'created'
    await createEstimateHistory({
      estimateId: estimate.id,
      organizationId: userData.organization_id,
      actionType,
      performedBy: user.id,
      performedByName: userData.name || 'Unknown',
    })

    // 監査ログを記録
    await logEstimateCreated(estimate.id, {
      estimate_number: body.estimate_number,
      client_id: body.client_id,
      project_id: body.project_id,
      status: body.status || 'draft',
      total_amount: body.total_amount,
    }, user.id, userData.organization_id)

    // 提出時に管理者・マネージャーに通知
    if (body.status === 'submitted') {
      console.log('[見積書提出] 通知作成中:', {
        estimate_number: body.estimate_number,
        submitter: userData.name
      })

      // 管理者・マネージャーを取得
      const { data: managersAndAdmins, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('organization_id', userData.organization_id)
        .in('role', ['manager', 'admin', 'super_admin'])
        .eq('is_active', true)

      if (usersError) {
        console.error('[見積書提出] 管理者取得エラー:', usersError)
      } else if (managersAndAdmins && managersAndAdmins.length > 0) {
        console.log('[見積書提出] 通知対象者:', managersAndAdmins.length, '人')

        // 各管理者・マネージャーに通知を作成
        const notifications = managersAndAdmins
          .filter(u => u.id !== user.id) // 自分自身には通知しない
          .map(u => ({
            organization_id: userData.organization_id,
            target_user_id: u.id,
            related_estimate_id: estimate.id,
            type: 'estimate_submitted',
            title: '新しい見積書が提出されました',
            message: `${userData.name}が見積書「${body.estimate_number}」を提出しました。承認をお願いします。`,
            severity: 'info' as const,
            sent_via: ['in_app'],
            sent_at: new Date().toISOString(),
            metadata: { estimate_id: estimate.id, estimate_number: body.estimate_number, link: `/estimates/${estimate.id}` }
          }))

        if (notifications.length > 0) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications)

          if (notificationError) {
            console.error('[見積書提出] 通知作成エラー:', notificationError)
          } else {
            console.log('[見積書提出] 通知作成成功:', notifications.length, '件')
          }
        }
      } else {
        console.log('[見積書提出] 通知対象者なし')
      }
    }

    return NextResponse.json({ data: estimate }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/estimates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
