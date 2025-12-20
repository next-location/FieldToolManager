import Image from 'next/image'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
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
              className="px-4 py-2 sm:px-10 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs sm:text-sm font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </header>

      {/* ヘッダーの高さ分のスペーサー */}
      <div className="h-[60px] sm:h-[72px]"></div>

      {/* プライバシーポリシー */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">プライバシーポリシー</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 prose prose-sm sm:prose-base lg:prose-lg max-w-none">
          <p className="text-gray-600 mb-8">
            ザイロク運営者（以下「当社」といいます）は、お客様の個人情報の保護を重要な責務と考え、以下の通りプライバシーポリシーを定めます。
          </p>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">1. 個人情報の定義</h2>
            <p className="text-gray-700 leading-relaxed">
              本プライバシーポリシーにおいて、個人情報とは、個人情報保護法第2条第1項により定義された個人情報、すなわち、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により特定の個人を識別することができるもの（他の情報と容易に照合することができ、それにより特定の個人を識別することができることとなるものを含みます）、もしくは個人識別符号が含まれる情報を意味します。
            </p>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">2. 個人情報の収集方法</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当社は、以下の方法により個人情報を収集します。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
              <li>お問い合わせフォームからのご入力</li>
              <li>サービスお申し込み時のご入力</li>
              <li>お電話、メール、その他の手段によるお問い合わせ</li>
              <li>各種イベント、セミナー等での名刺交換</li>
            </ul>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">3. 個人情報の利用目的</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当社は、収集した個人情報を以下の目的で利用します。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2">
              <li>お問い合わせへの対応</li>
              <li>サービスのご提供、運営、保守、改善</li>
              <li>お見積りの作成、ご提案</li>
              <li>契約の締結、履行</li>
              <li>請求書の発行、代金の回収</li>
              <li>サービスに関する情報、お知らせの送付</li>
              <li>マーケティング活動、市場調査</li>
              <li>不正利用の防止、セキュリティ対策</li>
            </ul>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">4. 個人情報の第三者提供</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、以下の場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 mt-4">
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難である場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難である場合</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがある場合</li>
            </ul>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">5. 個人情報の安全管理</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、個人情報の紛失、破壊、改ざん及び漏洩などのリスクに対して、合理的な安全対策を講じます。また、個人情報を取り扱う従業員に対して、適切な監督を行います。
            </p>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">6. 個人情報の開示、訂正、削除</h2>
            <p className="text-gray-700 leading-relaxed">
              お客様は、当社が保有する個人情報について、開示、訂正、削除を請求することができます。ご請求の際は、下記お問い合わせ窓口までご連絡ください。
            </p>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">7. Cookie（クッキー）の使用</h2>
            <p className="text-gray-700 leading-relaxed">
              当社のウェブサイトでは、サービスの改善やお客様の利便性向上のため、Cookie（クッキー）を使用することがあります。Cookieの使用を希望されない場合は、ブラウザの設定により無効化することができます。ただし、Cookieを無効化した場合、一部のサービスが正しく動作しない可能性があります。
            </p>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">8. プライバシーポリシーの変更</h2>
            <p className="text-gray-700 leading-relaxed">
              当社は、法令の変更や事業内容の変更等に伴い、本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、当社ウェブサイトに掲載した時点から効力を生じるものとします。
            </p>
          </section>

          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">9. お問い合わせ窓口</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              個人情報の取扱いに関するお問い合わせは、以下の窓口までご連絡ください。
            </p>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-gray-900 font-semibold mb-2">ザイロク運営者</p>
              <p className="text-gray-700">個人情報保護管理責任者</p>
              <p className="text-gray-700">メール: <a href="mailto:info@zairoku.com" className="text-blue-600 hover:underline">info@zairoku.com</a></p>
            </div>
          </section>

          <div className="text-right text-gray-600 mt-8 sm:mt-12 text-sm sm:text-base">
            <p>制定日：2025年12月20日</p>
            <p>株式会社ネクストロケーション</p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gradient-to-br from-blue-900 to-blue-800 text-blue-100 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-xs sm:text-sm text-center text-blue-200">
            © 2025 Zairoku. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
