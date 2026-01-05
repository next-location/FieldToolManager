import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  // サーバー側で組織名を取得
  const headersList = await headers()
  const hostname = headersList.get('host') || ''

  let organizationName = 'ザイロク'

  // サブドメインを抽出
  const hostnameWithoutPort = hostname.split(':')[0]
  let subdomain: string | null = null

  if (hostnameWithoutPort.includes('localhost')) {
    const parts = hostnameWithoutPort.split('.')
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      subdomain = parts[0]
    }
  } else {
    const parts = hostnameWithoutPort.split('.')
    if (parts.length >= 3) {
      subdomain = parts[0]
    }
  }

  // サブドメインがある場合は組織名を取得
  if (subdomain) {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('subdomain', subdomain)
      .single()

    if (organization) {
      organizationName = organization.name
    }
  }

  return <LoginForm organizationName={organizationName} />
}
