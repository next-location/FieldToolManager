import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { ProjectListClient } from '@/components/projects/ProjectListClient'
import ProjectPageFAB from '@/components/projects/ProjectPageFAB'
import { LoadingSpinner } from '@/components/LoadingSpinner'

async function ProjectList() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(name),
      site:sites(site_name, site_code)
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
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">工事管理</h1>
          <Link
            href="/projects/new"
            className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + 新規工事登録
          </Link>
        </div>

        <Suspense fallback={<LoadingSpinner inline />}>
          <ProjectList />
        </Suspense>

        {/* FAB (モバイルのみ) */}
        <ProjectPageFAB />
      </div>
    </div>
  )
}
