import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value
          console.log('[SERVER SUPABASE COOKIE] get:', name, value ? `found (${value.substring(0, 20)}...)` : 'not found')
          return value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            console.log('[SERVER SUPABASE COOKIE] set:', name, 'value length:', value.length)
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.log('[SERVER SUPABASE COOKIE] set error:', error)
            // Server Component内でのset操作はエラーになる場合がある
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            console.log('[SERVER SUPABASE COOKIE] remove:', name)
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.log('[SERVER SUPABASE COOKIE] remove error:', error)
            // Server Component内でのremove操作はエラーになる場合がある
          }
        },
      },
    }
  )
}
