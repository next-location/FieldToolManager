/**
 * 地域制限エラーページ
 * 日本国外からのスーパー管理者画面アクセス時に表示
 */

export default function RegionBlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            アクセスが制限されています
          </h1>

          <p className="text-gray-600 mb-6">
            セキュリティ上の理由により、日本国外からの管理画面へのアクセスは制限されています。
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  アクセスが必要な場合
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>日本国内のネットワークからアクセスしてください</li>
                    <li>VPN接続を無効にしてください</li>
                    <li>問題が解決しない場合は、システム管理者にお問い合わせください</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>このアクセスは記録されています。</p>
            <p className="mt-2">
              お問い合わせ:{' '}
              <a
                href="mailto:system@zairoku.com"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                system@zairoku.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
