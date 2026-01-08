import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import RequestDemoForm from '@/components/RequestDemoForm'

export const metadata: Metadata = {
  title: '資料請求・無料デモ体験 | ザイロク - 建設業向け工具管理システム',
  description: '建設業・工事現場の工具・資材管理をDX化。QRコードで簡単チェックイン/アウト。7日間の無料デモ体験で実際の操作感をお試しいただけます。',
  keywords: '建設業 工具管理, QRコード 在庫管理, 現場 資材管理 アプリ, 工具 貸出管理',
  openGraph: {
    title: '資料請求・無料デモ体験 | ザイロク',
    description: '建設業・工事現場の工具・資材管理をDX化。7日間無料デモ体験実施中。',
    images: ['/og-demo.png'],
  }
}

export default function RequestDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー（トップページと同じ） */}
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
              className="px-4 py-2 sm:px-10 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </header>

      {/* ヘッダーの高さ分のスペーサー */}
      <div className="h-[60px] sm:h-[72px]"></div>

      {/* ヒーローセクション */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              資料請求・<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">デモ環境</span>のご案内
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              実際の操作感をチームでお試しいただけます。<br />
              7日間の無料デモ体験で、ザイロクの機能を体感してください。
            </p>
          </div>

          {/* 2カラムレイアウト */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* 左側：フォーム */}
            <div>
              <RequestDemoForm />
            </div>

            {/* 右側：デモ環境の特徴 */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">デモ環境の特徴</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">チーム全員で同時体験可能</h3>
                      <p className="text-sm text-gray-600">複数のメンバーで同時にログインして、実際の運用をシミュレーションできます。</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">実際の現場作業フローを再現</h3>
                      <p className="text-sm text-gray-600">QRコード読み取りから報告書作成まで、リアルな業務フローを体験できます。</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">リアルなサンプルデータ付き</h3>
                      <p className="text-sm text-gray-600">200件の利用履歴と10件の作業報告書など、実際のデータで操作を学べます。</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">7日間お試し（延長相談可）</h3>
                      <p className="text-sm text-gray-600">じっくり検討いただけるよう、7日間のデモ期間を設けています。</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">専任サポート付き</h3>
                      <p className="text-sm text-gray-600">デモ期間中も質問や相談に対応いたします。</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* デモ環境でできること */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">デモ環境でお試しいただける機能</h2>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    QRコードでの工具管理
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    リアルタイム在庫確認
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    作業報告書作成
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    チーム管理機能
                  </li>
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  ※デモ環境は一部機能に制限があります。<br />
                  ※製品版では全機能をご利用いただけます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* フッター（トップページと同じ） */}
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
