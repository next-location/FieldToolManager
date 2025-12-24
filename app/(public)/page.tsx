import Link from 'next/link'
import Image from 'next/image'
import { Shield, Clock, Users, BarChart3, CheckCircle, QrCode, Package, Truck, FileText, ClipboardList, TrendingUp, UserCheck } from 'lucide-react'

export default function LandingPage() {
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

      {/* メインビジュアル */}
      <section className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
        <Image
          src="/main_visual.png"
          alt="ザイロク メインビジュアル"
          fill
          className="object-cover"
          priority
        />
        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/90 to-transparent sm:via-[#1a1a1a]/90 sm:to-transparent" style={{ width: '100%' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/70 via-transparent to-transparent sm:via-transparent sm:to-transparent" style={{ width: '100%' }}></div>

        {/* テキストコンテンツ */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight" style={{ lineHeight: '1.3' }}>
                現場の<span className="text-yellow-400">見えない無駄</span>を<br />会社の<span className="text-yellow-400">利益</span>に変える。
              </h2>
              <p className="text-sm sm:text-base text-gray-200 mb-6 sm:mb-12">
                道具・重機・人の管理から、見積・請求まで。<br />建設業のあらゆるリソースを一元管理する<br className="sm:hidden" />クラウドサービス「<span className="text-yellow-400">ザイロク</span>」。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href="/contact"
                  className="w-full sm:w-1/2 sm:min-w-[180px] px-6 sm:px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-sm sm:text-base font-semibold rounded-full hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl text-center flex items-center justify-center"
                >
                  お問い合わせ
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-1/2 sm:min-w-[200px] px-6 sm:px-8 py-3 bg-white/10 backdrop-blur-sm text-white text-sm sm:text-base font-semibold rounded-full border-2 border-white/30 hover:bg-white/20 transition-all text-center flex items-center justify-center"
                >
                  機能と料金プランを見る
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 主な機能 */}
      <section id="features" className="py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* セクションタイトル */}
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              ザイロクの<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">主な機能</span>
            </h3>
            <p className="text-base sm:text-lg text-gray-600">
              建設現場の課題を解決する8つの機能
            </p>
          </div>

          {/* 3カラムレイアウト */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* モノの管理 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg">
              {/* カテゴリタイトル */}
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">モノの管理</h4>
                  <p className="text-sm sm:text-base text-gray-700 font-medium">所在と量を可視化</p>
                </div>
              </div>

              {/* 機能リスト */}
              <div className="space-y-6">
                {/* QRコード管理 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">QRコード管理</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">「あれ、どこいった？」を撲滅。<br />所在を瞬時に特定。</p>
                  </div>
                </div>

                {/* 在庫・消耗品管理 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">在庫・消耗品管理</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">「現場で在庫切れ」を防ぐ。<br />自動アラートで発注漏れゼロ。</p>
                  </div>
                </div>

                {/* 重機管理 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Truck className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">重機管理</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">高額資産を逃さない。<br />位置と稼働状況を追跡。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* カネ・事務の管理 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg">
              {/* カテゴリタイトル */}
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">カネ・事務の管理</h4>
                  <p className="text-sm sm:text-base text-gray-700 font-medium">利益を見える化</p>
                </div>
              </div>

              {/* 機能リスト */}
              <div className="space-y-6">
                {/* 見積・請求 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">見積・請求</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">工事ごとの書類を、ミスなく<br />一元管理。</p>
                  </div>
                </div>

                {/* 作業報告書 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">作業報告書</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">写真付き報告で、事務所に戻るムダ<br />を削減。</p>
                  </div>
                </div>

                {/* 収支分析 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">収支分析</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">脱・ドンブリ勘定。<br />工事ごとの利益率を可視化。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ヒトの管理 */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg sm:col-span-2 lg:col-span-1">
              {/* カテゴリタイトル */}
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">ヒトの管理</h4>
                  <p className="text-sm sm:text-base text-gray-700 font-medium">働き方をスマートに</p>
                </div>
              </div>

              {/* 機能リスト */}
              <div className="space-y-6">
                {/* 勤怠管理 */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">勤怠管理</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">スマホで打刻、集計の手間を削減。</p>
                  </div>
                </div>

                {/* 情報共有（報告） */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900 mb-1">情報共有（報告）</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">リアルタイムな現場共有で、<br />管理コストを削減。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 解決する課題 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-8 sm:mb-12 lg:mb-16">
          こんなお悩み、<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">ザイロクなら解決できます！</span>
        </h3>

        {/* マンガ形式で課題と解決策を表示 */}
        <div className="space-y-12 sm:space-y-16">
          {/* 課題1: 道具探しと在庫切れ */}
          <div className="flex flex-col items-center">
            <div className="mb-4 sm:mb-6 max-w-3xl px-2 sm:px-0">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 text-center">資産管理パックで、ムダな買い出しと停止時間をゼロに。</h4>
              <p className="text-base sm:text-lg text-gray-600 text-left">QRコードで現場の倉庫を一発検索。スマホで在庫を一括管理し、探す時間がゼロになりました。段取りいいな！</p>
            </div>
            <div className="w-full max-w-5xl">
              <Image
                src="/manga01.png"
                alt="道具探しと在庫切れの課題をザイロクで解決"
                width={1400}
                height={600}
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </div>

          {/* 課題2: 残業と事務作業の負担 */}
          <div className="flex flex-col items-center">
            <div className="mb-4 sm:mb-6 max-w-3xl px-2 sm:px-0">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 text-center">DX業務効率化パックで、家族との時間が取れない問題を解決。</h4>
              <p className="text-base sm:text-lg text-gray-600 text-left">日報は現場でスマホから作成できるから、事務所に戻らなくても完了。現場で全部終わるから直帰できるようになり、家族との時間も確保できます。</p>
            </div>
            <div className="w-full max-w-5xl">
              <Image
                src="/manga02.png"
                alt="残業と事務作業の負担をザイロクで解決"
                width={1400}
                height={600}
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </div>

          {/* 課題3: 利益が見えない経営課題 */}
          <div className="flex flex-col items-center">
            <div className="mb-4 sm:mb-6 max-w-3xl px-2 sm:px-0">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 text-center">フル機能統合パックで、確実に利益を残す経営へ。</h4>
              <p className="text-base sm:text-lg text-gray-600 text-left">ザイロクなら日々の数値がリアルタイムで確認できます。赤字リスクを早期発見して対策することで、今期は過去最高益を達成しました。</p>
            </div>
            <div className="w-full max-w-5xl">
              <Image
                src="/manga03.png"
                alt="利益が見えない経営課題をザイロクで解決"
                width={1400}
                height={600}
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 導入メリット */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-white">
        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
          ザイロク<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">導入のメリット</span>
        </h3>
        <p className="text-base sm:text-lg text-gray-600 text-center mb-8 sm:mb-12">
          建設現場の業務効率化とコスト削減を実現
        </p>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {[
            {
              title: '業務効率70%改善',
              description: '道具を探す時間が激減。管理工数を大幅削減できます。',
            },
            {
              title: 'コスト削減',
              description: '重複購入や紛失を防止。適切な在庫管理で無駄を削減。',
            },
            {
              title: 'トレーサビリティ確保',
              description: '全ての移動履歴を記録。トラブル時も原因を即座に特定。',
            },
            {
              title: 'モバイル対応',
              description: 'スマホで現場からすぐに操作。いつでもどこでも管理可能。',
            },
          ].map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3 p-6 border border-gray-200 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-gray-900 mb-1">{benefit.title}</h4>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 料金システム */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">料金システム</span>
        </h3>
        <p className="text-base sm:text-lg text-gray-600 text-center mb-8 sm:mb-12">
          ベース料金（人数）＋ 機能パック（必要な機能を選択）
        </p>

        {/* ベース料金（人数別プラン） */}
        <div className="mb-12 sm:mb-16">
          <h4 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6 sm:mb-8">ベース料金（人数別プラン）</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 max-w-6xl mx-auto">
            {[
              { name: 'スタート', users: '~10名', price: '¥18,000', perUser: '¥1,800/人' },
              { name: 'スタンダード', users: '11~30名', price: '¥45,000', perUser: '¥1,500/人', popular: true },
              { name: 'ビジネス', users: '31~50名', price: '¥70,000', perUser: '¥1,400/人' },
              { name: 'プロ', users: '51~100名', price: '¥120,000', perUser: '¥1,200/人' },
            ].map((plan, index) => (
              <div
                key={index}
                className={`p-4 sm:p-6 rounded-2xl border-2 ${
                  plan.popular
                    ? 'border-blue-500 shadow-xl relative'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold">
                    人気
                  </div>
                )}
                <h5 className="text-base sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{plan.name}</h5>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">{plan.users}</p>
                <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                  {plan.price}
                  <span className="text-xs sm:text-sm text-gray-600 font-normal">/月</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">{plan.perUser}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 機能パック */}
        <div>
          <h4 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6 sm:mb-8">機能パック（ベース料金に追加）</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
            {[
              {
                name: '現場資産パック',
                price: '¥18,000',
                features: [
                  '道具管理',
                  '消耗品管理',
                  '重機管理',
                  '各種アラート機能',
                  'QRコード一括生成',
                  '棚卸し機能',
                ],
              },
              {
                name: '現場DX業務効率化パック',
                price: '¥22,000',
                features: [
                  '出退勤管理',
                  '作業報告書作成',
                  '見積・請求・領収書',
                  '発注書管理',
                  '売上管理',
                  '承認ワークフロー',
                ],
              },
              {
                name: 'フル機能統合パック',
                price: '¥32,000',
                features: [
                  '全機能利用可能',
                  '複数パック割引適用',
                ],
                popular: true,
              },
            ].map((pack, index) => (
              <div
                key={index}
                className={`p-6 sm:p-8 rounded-2xl border-2 ${
                  pack.popular
                    ? 'border-blue-500 shadow-xl relative'
                    : 'border-gray-200'
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-bold">
                    おすすめ
                  </div>
                )}
                <h5 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{pack.name}</h5>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
                  {pack.price}
                  <span className="text-xs sm:text-sm text-gray-600 font-normal">/月</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {pack.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5 mr-2" />
                      <span className="text-sm sm:text-base text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 料金例 */}
        <div className="mt-12 sm:mt-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto">
          <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">料金例</h4>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
              <h5 className="font-bold text-base sm:text-lg text-gray-900 mb-2 sm:mb-3">スタンダード企業の場合</h5>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">従業員30名、資産管理が主な目的</p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">スタンダードプラン（30名）</span>
                  <span className="font-semibold">¥45,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">現場資産パック</span>
                  <span className="font-semibold">¥18,000</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-blue-600">
                  <span>月額合計</span>
                  <span>¥63,000</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md">
              <h5 className="font-bold text-base sm:text-lg text-gray-900 mb-2 sm:mb-3">フル活用企業の場合</h5>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">従業員30名、全機能を利用</p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">スタンダードプラン（30名）</span>
                  <span className="font-semibold">¥45,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">フル機能統合パック</span>
                  <span className="font-semibold">¥32,000</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-blue-600">
                  <span>月額合計</span>
                  <span>¥77,000</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-4 sm:mt-6">※年契約で10%割引適用可能</p>
        </div>
      </section>

      {/* よくある質問 */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">よくある質問</span>
        </h3>
        <p className="text-base sm:text-lg text-gray-600 text-center mb-8 sm:mb-12">
          導入前の疑問にお答えします
        </p>

        <div className="space-y-4 sm:space-y-6">
          {/* Q1 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>ITに詳しくないスタッフでも使えますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              はい、使えます。QRコードをスマホでスキャンするだけの簡単操作で、特別なITスキルは不要です。現場スタッフ向けの研修も提供しており、導入後もしっかりサポートいたします。
            </div>
          </div>

          {/* Q2 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>導入にどれくらいの期間がかかりますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              最短2週間で運用開始可能です。アカウント設定、権限設定、基本マスタ設定を行い、必要に応じてデータ登録やQRコード発行をサポートします。規模や準備状況により期間は変動します。
            </div>
          </div>

          {/* Q3 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>途中で機能パックを変更できますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              はい、可能です。最初は「現場資産パック」だけで始めて、後から「現場DX業務効率化パック」を追加するなど、業務の拡大に合わせて柔軟に変更できます。
            </div>
          </div>

          {/* Q4 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>既存の道具や重機にQRコードを貼る作業は自分たちでやる必要がありますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              ご自身で対応いただくことも可能ですが、オプションでQRコード生成・印刷の現地作業サポートもご利用いただけます。棚卸し作業も同様にサポート可能です。
            </div>
          </div>

          {/* Q5 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>スマホは会社で用意する必要がありますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              スタッフの私用スマートフォンでも利用可能です。ブラウザからアクセスするタイプなので、専用アプリのインストールも不要です。もちろん会社支給のスマホやタブレットでもご利用いただけます。
            </div>
          </div>

          {/* Q6 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>最低利用期間はありますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              月契約の場合は最低利用期間はございません。年契約の場合は1年間のご利用をお願いしておりますが、10%の割引が適用されます。
            </div>
          </div>

          {/* Q7 */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 text-xs sm:text-sm">Q</span>
              <span>初期費用はかかりますか？</span>
            </h4>
            <div className="ml-9 sm:ml-11 text-sm sm:text-base text-gray-700 leading-relaxed">
              基本設定費が必要です。アカウント設定、権限設定、基本マスタ設定などの初期セットアップをサポートいたします。詳細はお問い合わせください。
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">ザイロクで業務効率を改善しましょう</h3>
          <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-blue-100">
            導入のご相談やお見積りは、お気軽にお問い合わせください
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-white to-blue-50 text-blue-600 text-base sm:text-lg font-bold rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all shadow-lg hover:shadow-xl"
          >
            お問い合わせ
          </Link>
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
