import Link from 'next/link'
import Image from 'next/image'

export default function RequestDemoSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/">
                <Image
                  src="/ザイロクロゴ02.png"
                  alt="ザイロク"
                  width={150}
                  height={40}
                  priority
                  className="cursor-pointer w-auto h-[28px] sm:h-[32px]"
                />
              </Link>
            </div>
            <Link
              href="/contact"
              className="px-4 py-2 sm:px-10 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </header>

      {/* ヘッダーの高さ分のスペーサー */}
      <div className="h-[60px] sm:h-[72px]"></div>

      {/* メインコンテンツ */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* 成功アイコン */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            資料請求を受け付けました
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            ご登録いただいたメールアドレスに、資料とデモ環境のアクセス情報をお送りしました。
          </p>

          <div className="bg-blue-50 rounded-2xl p-6 sm:p-8 text-left mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">次のステップ</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span>メールボックスを確認してください（迷惑メールフォルダもご確認ください）</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span>メールに記載されているデモ環境のログイン情報を確認してください</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span>デモ環境にログインして、実際の操作を体験してください（7日間有効）</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span>ご不明点があれば、お気軽にお問い合わせください</span>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <p className="text-sm text-yellow-800">
              <strong>メールが届かない場合:</strong><br />
              迷惑メールフォルダをご確認ください。それでも届かない場合は、
              <Link href="/contact" className="text-blue-600 hover:underline">お問い合わせ</Link>
              からご連絡ください。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-all"
            >
              トップページへ戻る
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gradient-to-br from-blue-900 to-blue-800 text-blue-100 py-6 sm:py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs sm:text-sm text-center text-blue-200 space-y-3">
            <div className="text-blue-100 font-medium">
              運営会社: 株式会社ネクストロケーション
            </div>
            <div className="flex justify-center gap-4">
              <Link href="/commercial-law" className="hover:text-white transition-colors">
                特定商取引法に基づく表記
              </Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                プライバシーポリシー
              </Link>
            </div>
            <div>
              © 2025 Zairoku. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
