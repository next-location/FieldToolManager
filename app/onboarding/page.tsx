import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // ログインチェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報とorganization情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // admin権限チェック
  if (userData.role !== 'admin') {
    redirect('/')
  }

  // organizationが既にセットアップ済みかチェック
  const { data: organization } = await supabase
    .from('organizations')
    .select('setup_completed_at')
    .eq('id', userData.organization_id)
    .single()

  if (organization?.setup_completed_at) {
    // 既にセットアップ済みの場合はホームへ
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <OnboardingWizard organizationId={userData.organization_id} />
    </div>
  )
}
