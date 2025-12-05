import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  console.log('[LOGIN API] Starting login for:', email)

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log('[LOGIN API] Sign in result:', {
    hasSession: !!data.session,
    hasUser: !!data.user,
    error: error?.message
  })

  if (error) {
    console.error('[LOGIN API] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data.session) {
    console.error('[LOGIN API] No session created')
    return NextResponse.json({ error: 'セッションの作成に失敗しました' }, { status: 400 })
  }

  console.log('[LOGIN API] Login successful, cookies should be set')

  return NextResponse.json({ success: true })
}
