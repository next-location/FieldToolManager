import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { ProjectForm } from '@/components/projects/ProjectForm'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者またはリーダー権限チェック
  if (!['admin', 'leader'].includes(userRole)) {
    redirect('/projects')
  }

  // 工事詳細取得
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (!project) {
    redirect('/projects')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">工事編集</h1>
        <p className="text-gray-600">{project.project_name}の情報を編集します</p>
      </div>

      <ProjectForm project={project} mode="edit" />
      </div>
    </div>
  )
}
