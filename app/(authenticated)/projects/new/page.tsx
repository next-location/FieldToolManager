import { requireAuth } from '@/lib/auth/page-auth'
import { ProjectForm } from '@/components/projects/ProjectForm'

export default function NewProjectPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">工事新規登録</h1>
          <p className="mt-1 text-sm text-gray-600">
            工事情報を登録します。必須項目を入力してください。
          </p>
        </div>

        <ProjectForm mode="create" />
      </div>
    </div>
  )
}
