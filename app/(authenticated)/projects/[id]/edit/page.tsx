import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '@/components/projects/ProjectForm'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者またはリーダー権限チェック
  if (!['admin', 'leader'].includes(userData.role)) {
    redirect('/projects')
  }

  // 工事詳細取得
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .single()

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">工事編集</h1>
        <p className="text-gray-600">{project.project_name}の情報を編集します</p>
      </div>

      <ProjectForm project={project} mode="edit" />
    </div>
  )
}
