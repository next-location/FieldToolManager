import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', userData.organization_id)
    .single()

  return (
    <AppLayout
      user={{ email: user.email, id: user.id, name: userData.name }}
      userRole={userData.role}
      organizationId={userData.organization_id}
      organizationName={organization?.name}
    >
      {children}
    </AppLayout>
  )
}
