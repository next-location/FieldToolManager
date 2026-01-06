export default function CommercialLawPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">販売事業者名</h2>
            <p>株式会社ネクストロケーション</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">代表者</h2>
            <p>代表取締役 明石洋一</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">所在地</h2>
            <p>〒107-0062<br />東京都港区南青山2丁目2番15号 WinAoyamaビル917</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">お問い合わせ</h2>
            <p>お問い合わせフォーム: <a href="https://zairoku.com/contact" className="text-blue-600 hover:underline">https://zairoku.com/contact</a></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">販売価格</h2>
            <p>各プラン・サービスページに記載の価格（税込）</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">商品代金以外の必要料金</h2>
            <p>インターネット接続料金、通信料金等はお客様のご負担となります。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">お支払い方法</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>クレジットカード決済（Visa、Mastercard、American Express、JCB）</li>
              <li>銀行振込（請求書払い）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">お支払い時期</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>クレジットカード決済：各カード会社の規約に基づく</li>
              <li>銀行振込：請求書記載の支払期限まで</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">サービスの提供時期</h2>
            <p>契約成立後、即時利用可能となります。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">返品・キャンセルについて</h2>
            <p>本サービスはデジタルコンテンツであるため、契約成立後の返品・返金は原則として承っておりません。<br />
            ただし、サービスに重大な不具合がある場合は、個別に対応いたします。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">解約について</h2>
            <p>契約期間満了の1ヶ月前までにお申し出いただくことで、次回更新時に解約が可能です。<br />
            月の途中での解約の場合、日割り計算による返金は行いません。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">動作環境</h2>
            <p>推奨ブラウザ：Google Chrome、Safari、Microsoft Edge、Firefox（最新版）<br />
            推奨デバイス：PC、タブレット、スマートフォン</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            最終更新日: 2026年1月6日
          </p>
        </div>
      </div>
    </div>
  );
}
