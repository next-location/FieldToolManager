import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { action, featureName, details } = body

    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // デモユーザーかチェック
    const isDemo = user.user_metadata?.is_demo
    if (!isDemo) {
      return NextResponse.json({ error: 'Not a demo user' }, { status: 400 })
    }

    const demoRequestId = user.user_metadata?.original_request_id
    if (!demoRequestId) {
      return NextResponse.json({ error: 'Demo request ID not found' }, { status: 400 })
    }

    // アクティビティログに記録
    const { error } = await supabase.from('demo_activity_logs').insert({
      demo_request_id: demoRequestId,
      action,
      feature_name: featureName || null,
      details: details || {},
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Failed to insert activity log:', error)
      return NextResponse.json({ error: 'Failed to track activity' }, { status: 500 })
    }

    // ログインの場合はカウントを更新
    if (action === 'login') {
      await supabase.rpc('increment_demo_login', {
        request_id: demoRequestId
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    )
  }
}
