'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log('[LOGIN ACTION] Starting login for:', email)

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log('[LOGIN ACTION] Sign in result:', {
    hasSession: !!data.session,
    hasUser: !!data.user,
    error: error?.message
  })

  if (error) {
    console.error('[LOGIN ACTION] Error:', error.message)
    return { error: error.message }
  }

  if (!data.session) {
    console.error('[LOGIN ACTION] No session created')
    return { error: 'セッションの作成に失敗しました' }
  }

  console.log('[LOGIN ACTION] Session created, access_token:', data.session.access_token.substring(0, 20) + '...')

  // キャッシュをクリアしてリダイレクト
  revalidatePath('/', 'layout')

  console.log('[LOGIN ACTION] Redirecting to /')
  redirect('/')
}
