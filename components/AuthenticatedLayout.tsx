import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from './AppLayout'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 組織情報取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', userData.organization_id)
    .single()

  return (
    <AppLayout
      user={{ email: user.email || '', id: user.id || '' }}
      userRole={userData.role}
      organizationId={userData.organization_id}
      organizationName={organization?.name}
    >
      {children}
    </AppLayout>
  )
}
