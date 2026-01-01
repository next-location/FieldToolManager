import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { ProjectListClient } from '@/components/projects/ProjectListClient'

async function ProjectList() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return <ProjectListClient projects={projects || []} />
}

export default async function ProjectsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 管理者のみアクセス可能
  if (!['admin', 'super_admin', 'manager'].includes(userRole || '')) {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工事管理</h1>
            <p className="mt-2 text-sm text-gray-600">
              工事の基本情報と進捗を管理します
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + 新規工事登録
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <ProjectList />
        </Suspense>
      </div>
    </div>
  )
}
