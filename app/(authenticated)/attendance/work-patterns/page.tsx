import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'

export default async function WorkPatternsPage() {
  await requireAuth()

  // このページは廃止され、勤怠管理設定ページに統合されました
  redirect('/attendance/settings')
}
