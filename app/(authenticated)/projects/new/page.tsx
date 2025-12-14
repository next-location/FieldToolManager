import { ProjectForm } from '@/components/projects/ProjectForm'

export default function NewProjectPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">工事新規登録</h1>
      </div>

      <ProjectForm mode="create" />
    </div>
  )
}
