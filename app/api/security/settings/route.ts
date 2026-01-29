import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organization_id')

  if (!organizationId) {
    return NextResponse.json({ error: 'organization_id is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // system_settingsテーブルからセキュリティ設定を取得
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'security_settings')
    .maybeSingle()

  // データが存在しないか、エラーの場合はデフォルト設定を返す
  if (error || !data) {
    if (error) {
      console.error('[SECURITY SETTINGS API] Error:', error)
    } else {
      console.log('[SECURITY SETTINGS API] No settings found, using defaults')
    }
    return NextResponse.json({
      sessionTimeoutMinutes: 30,
      loginAttemptLimit: 5,
      lockoutDurationMinutes: 30,
    })
  }

  const settings = data.value as any

  const response = {
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes || 30,
    loginAttemptLimit: settings.maxLoginAttempts || 5,
    lockoutDurationMinutes: settings.lockoutDurationMinutes || 30,
  }

  console.log('[SECURITY SETTINGS API] Returning settings:', response)

  return NextResponse.json(response)
}
