import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/AppLayout'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const supabase = await createClient()

  console.log('[AUTH LAYOUT] Checking authentication...')

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  console.log('[AUTH LAYOUT] Auth result:', {
    hasUser: !!user,
    userId: user?.id,
    error: authError?.message
  })

  if (!user) {
    console.log('[AUTH LAYOUT] No user, redirecting to /login')
    redirect('/login')
  }

  console.log('[AUTH LAYOUT] Fetching user data from database...')

  const { data: userData, error: dbError } = await supabase
    .from('users')
    .select('role, organization_id, name')
    .eq('id', user.id)
    .single()

  console.log('[AUTH LAYOUT] User data result:', {
    hasUserData: !!userData,
    error: dbError?.message
  })

  if (!userData) {
    console.log('[AUTH LAYOUT] No user data, redirecting to /login')
    redirect('/login')
  }

  console.log('[AUTH LAYOUT] User authenticated successfully:', {
    userId: user.id,
    role: userData.role
  })

  const { data: organization } = await supabase
    .from('organizations')
    .select('name, heavy_equipment_enabled')
    .eq('id', userData?.organization_id)
    .single()

  return (
    <AppLayout
      user={{ email: user.email || null, id: user.id, name: userData.name }}
      userRole={userData.role}
      organizationId={userData?.organization_id}
      organizationName={organization?.name || null}
      heavyEquipmentEnabled={organization?.heavy_equipment_enabled || false}
    >
      {children}
    </AppLayout>
  )
}
