import { Settings } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* アイコン */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-6">
              <Settings className="w-12 h-12 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            メンテナンス中
          </h1>

          {/* メッセージ */}
          <p className="text-gray-600 mb-6">
            現在、システムメンテナンスを実施しております。
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              ご不便をおかけして申し訳ございません。
              <br />
              しばらくお待ちください。
            </p>
          </div>

          {/* フッター */}
          <p className="text-xs text-gray-500">
            お急ぎの場合は、システム管理者にお問い合わせください。
          </p>
        </div>

        {/* コピーライト */}
        <p className="text-center text-sm text-gray-600 mt-6">
          © 2025 ザイロク
        </p>
      </div>
    </div>
  )
}
