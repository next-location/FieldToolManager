import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession()

    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // system_settingsテーブルからシステム設定を取得
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'system_config')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json(data?.value || {})
  } catch (error: any) {
    console.error('System settings fetch error:', error)
    return NextResponse.json(
      { error: 'システム設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSuperAdminSession()

    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const settings = await request.json()

    // system_settingsテーブルに保存
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'system_config',
        value: settings,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      throw error
    }

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      admin_id: session.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      resource_type: 'system_settings',
      resource_id: 'system_config',
      details: {
        changes: settings,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('System settings update error:', error)
    return NextResponse.json(
      { error: 'システム設定の保存に失敗しました' },
      { status: 500 }
    )
  }
}
