import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { QRScanner } from './QRScanner'

export default async function ScanPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </Link>
              <Link
                href="/tools"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                道具管理
              </Link>
              <Link
                href="/scan"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                QRスキャン
              </Link>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              QRコードスキャン
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              道具に貼られたQRコードをスキャンして詳細を確認できます
            </p>
          </div>

          <div className="bg-white shadow sm:rounded-lg p-6">
            <QRScanner />
          </div>
        </div>
      </main>
    </div>
  )
}
