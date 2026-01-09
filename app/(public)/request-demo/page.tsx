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

          {/* 1カラムレイアウト */}
          <div className="max-w-2xl mx-auto space-y-8">
            {/* フォーム */}
            <RequestDemoForm />

            {/* デモ環境でできること */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">デモ環境でお試しいただける機能</h2>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    ダッシュボード（在庫状況・統計データの閲覧）
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    QRコードスキャン（道具情報の確認）
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    道具管理（20個のサンプルデータの閲覧）
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    消耗品管理（在庫数の確認）
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    カテゴリ別表示・検索機能
                  </li>
                </ul>
                <div className="mt-6 p-4 bg-white/60 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-700 font-medium mb-2">📌 デモ環境の制限事項</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li>• データの新規登録・編集・削除はできません（閲覧のみ）</li>
                    <li>• サンプルデータ：道具20個、拠点3箇所、カテゴリ4種類</li>
                    <li>• 有効期間：7日間（延長相談可）</li>
                  </ul>
                </div>
                <p className="mt-4 text-xs text-gray-500 text-center">
                  ※製品版では全機能（データ編集、作業報告書、勤怠管理など）をご利用いただけます。
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
