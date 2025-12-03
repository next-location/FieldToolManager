import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QRScanTabs } from './QRScanTabs'

export default async function ScanPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            QRコードスキャン
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            道具や現場のQRコードをスキャンして、移動登録や情報確認ができます
          </p>
        </div>

        <QRScanTabs />
      </div>
    </div>
  )
}
