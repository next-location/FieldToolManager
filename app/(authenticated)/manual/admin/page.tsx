import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminManualPage() {
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
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/manual"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← マニュアル一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🖥️ 管理者・リーダー向け 操作マニュアル
          </h1>
          <p className="text-gray-600">
            対象ユーザー: 管理者・現場リーダーの方 | 使用デバイス: PC（推奨）、タブレット
          </p>
        </div>

        {/* マニュアルコンテンツ */}
        <div className="prose prose-blue max-w-none bg-white rounded-lg shadow p-6 md:p-8">
          {/* 目次 */}
          <section className="mb-10 bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📑 目次</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <a href="#basic" className="text-blue-600 hover:text-blue-800">📌 PCでの基本操作</a>
              <a href="#onboarding" className="text-blue-600 hover:text-blue-800">🚀 初回セットアップ</a>
              <a href="#tools" className="text-blue-600 hover:text-blue-800">🔧 道具マスタの管理</a>
              <a href="#sites" className="text-blue-600 hover:text-blue-800">🏗️ 現場管理</a>
              <a href="#warehouse" className="text-blue-600 hover:text-blue-800">📍 倉庫位置管理</a>
              <a href="#consumables" className="text-blue-600 hover:text-blue-800">🧰 消耗品管理</a>
              <a href="#history" className="text-blue-600 hover:text-blue-800">📊 移動履歴の確認</a>
              <a href="#settings" className="text-blue-600 hover:text-blue-800">⚙️ 組織設定</a>
              <a href="#audit" className="text-blue-600 hover:text-blue-800">📝 監査ログ</a>
              <a href="#tips" className="text-blue-600 hover:text-blue-800">💡 効率的な運用のコツ</a>
            </div>
          </section>

          {/* PCでの基本操作 */}
          <section id="basic" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              🖥️ PCでの基本操作
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">アプリへのアクセス</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>PCのブラウザ（Chrome、Edge、Safari等）を開く</li>
              <li>会社のシステムURL（例：<code className="bg-gray-100 px-2 py-1 rounded text-sm">https://yourcompany.example.com</code>）にアクセス</li>
              <li>管理者アカウントでログイン</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">PC画面のレイアウト</h3>
            <p className="text-gray-700 mb-4">
              PC版では画面左側にサイドバーが常時表示され、メインコンテンツが右側に表示されます。
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-800 mb-2">サイドバーメニュー構成</p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>🏠 ダッシュボード</li>
                <li>道具管理 ▼
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>🔧 個別管理道具</li>
                    <li>🧰 消耗品管理</li>
                    <li>📋 道具セット</li>
                    <li>📱 QRスキャン</li>
                    <li>📦 一括移動</li>
                    <li>📋 移動履歴</li>
                  </ul>
                </li>
                <li>🏗️ 現場管理</li>
                <li>設定・管理 ▼（管理者のみ）
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>⚙️ 組織設定</li>
                    <li>📍 倉庫位置管理</li>
                    <li>📝 監査ログ</li>
                  </ul>
                </li>
              </ul>
            </div>
          </section>

          {/* 初回セットアップ */}
          <section id="onboarding" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              🚀 初回セットアップ（オンボーディング）
            </h2>

            <p className="text-gray-700 mb-4">
              管理者として初めてログインすると、4ステップのセットアップウィザードが表示されます。
            </p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ1: 組織情報</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>組織名（会社名）を入力</li>
                  <li>業種を選択（建設業、塗装業、設備工事業など）</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ2: 運用設定</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>個別管理（シリアル番号で管理）を使うか</li>
                  <li>消耗品管理（数量で管理）を使うか</li>
                  <li>倉庫位置管理を使うか</li>
                  <li>通知機能を有効にするか</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ3: カテゴリセットアップ</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>業種に合わせた推奨カテゴリから選択</li>
                  <li>カスタムカテゴリを追加可能</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">ステップ4: ユーザー招待</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>スタッフのメールアドレスを入力</li>
                  <li>役割（ユーザー、リーダー、管理者）を選択</li>
                  <li>後から追加することも可能</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 道具マスタの管理 */}
          <section id="tools" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              🔧 道具マスタの管理
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">新しい道具を登録する</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>サイドバーの「道具管理 ▼」→「🔧 個別管理道具」をクリック</li>
              <li>右上の「+ 新規登録」ボタンをクリック</li>
            </ol>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="font-semibold text-yellow-800 mb-2">重要なポイント</p>
              <ul className="space-y-2 text-yellow-700 text-sm">
                <li><strong>管理タイプ:</strong>
                  <ul className="ml-4 mt-1">
                    <li>• <strong>個別管理:</strong> 1つ1つにシリアル番号が付く（ドリル、サンダーなど）</li>
                    <li>• <strong>消耗品:</strong> 数量で管理する（軍手、テープなど）</li>
                  </ul>
                </li>
                <li><strong>個別アイテム数:</strong> 「3台」と入力すると、自動で #001、#002、#003 が作成され、それぞれに固有のQRコードが生成されます</li>
                <li><strong>保証期限:</strong> 設定すると、期限切れ前に自動で通知されます</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">登録項目</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">項目</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">説明</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 font-medium">道具名 *</td>
                    <td className="px-4 py-2">例: 電動ドリル</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">型番</td>
                    <td className="px-4 py-2">例: DRL-2000X</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">メーカー</td>
                    <td className="px-4 py-2">例: マキタ</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">カテゴリ *</td>
                    <td className="px-4 py-2">電動工具、手工具など</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">個別アイテム数 *</td>
                    <td className="px-4 py-2">この道具を何台登録するか</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">購入日</td>
                    <td className="px-4 py-2">購入した日付</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">購入価格</td>
                    <td className="px-4 py-2">金額（統計用）</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">保証期限</td>
                    <td className="px-4 py-2">メーカー保証の期限日</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">画像</td>
                    <td className="px-4 py-2">道具の写真をアップロード</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 現場管理 */}
          <section id="sites" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              🏗️ 現場管理
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">新しい現場を登録する</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>サイドバーの「🏗️ 現場管理」をクリック</li>
              <li>右上の「+ 新規登録」ボタンをクリック</li>
              <li>現場名、住所、現場担当者を入力</li>
              <li>「登録する」ボタンをクリック</li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">現場を完了する</h3>
            <p className="text-gray-700 mb-2">
              現場が終了したら「現場を完了する」ボタンをクリック：
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
              <li>完了日が記録されます</li>
              <li>ステータスが「完了」に変わります</li>
              <li>稼働中フィルターには表示されなくなります</li>
              <li>データは保持されるので、後から履歴を確認できます</li>
            </ul>
          </section>

          {/* 倉庫位置管理 */}
          <section id="warehouse" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              📍 倉庫位置管理
            </h2>

            <p className="text-gray-700 mb-4">
              道具を倉庫内のどこに保管しているか管理する機能です。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">倉庫階層の設定</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>サイドバーの「設定・管理 ▼」→「📍 倉庫位置管理」をクリック</li>
              <li>右上の「⚙️ 階層設定」ボタンをクリック</li>
              <li>階層1（例: エリア）、階層2（例: ラック）、階層3（例: 段）を設定</li>
            </ol>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <p className="font-semibold text-blue-800 mb-2">設定例</p>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• 階層1: エリア（A、B、C...）</li>
                <li>• 階層2: ラック（01、02、03...）</li>
                <li>• 階層3: 段（1、2、3...）</li>
                <li>• 位置コード: <code className="bg-blue-100 px-2 py-1 rounded">A-01-3</code> (Aエリアの1番ラックの3段目)</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">倉庫位置を登録する</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>「+ 新規登録」ボタンをクリック</li>
              <li>位置コード、表示名、説明を入力</li>
              <li>必要に応じてQRコードを生成（推奨）</li>
              <li>「登録する」ボタンをクリック</li>
            </ol>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
              <p className="font-semibold text-green-800 mb-2">💡 QRコード生成のメリット</p>
              <p className="text-green-700 text-sm">
                倉庫内の位置にもQRコードを貼ることで、スタッフが道具を返却するとき位置のQRをスキャンするだけで正確な場所を記録できます。
              </p>
            </div>
          </section>

          {/* 消耗品管理 */}
          <section id="consumables" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              🧰 消耗品管理
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">消耗品マスタを登録する</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>「道具管理」→「個別管理道具」→「+ 新規登録」</li>
              <li>管理タイプで「消耗品」を選択</li>
              <li>消耗品名、単位（双、個、本など）を入力</li>
              <li><strong>最小在庫数</strong>を設定（この数量を下回るとアラートが出ます）</li>
              <li>「登録する」ボタンをクリック</li>
            </ol>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-semibold text-yellow-800 mb-2">最小在庫数の設定例</p>
              <ul className="space-y-1 text-yellow-700 text-sm">
                <li>• 軍手: 50双（1週間で使う量を目安に）</li>
                <li>• 養生テープ: 20個</li>
                <li>• マスク: 30個</li>
              </ul>
            </div>
          </section>

          {/* 移動履歴の確認 */}
          <section id="history" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              📊 移動履歴の確認
            </h2>

            <p className="text-gray-700 mb-4">
              道具や消耗品の移動履歴を確認できます。
            </p>

            <ul className="space-y-2 text-gray-700">
              <li><strong>個別管理道具の移動履歴:</strong> 「道具管理」→「📋 移動履歴」</li>
              <li><strong>消耗品の移動履歴:</strong> 「道具管理」→「📊 消耗品移動履歴」</li>
            </ul>

            <p className="text-gray-700 mt-4 text-sm">
              いつ・誰が・どこへ移動したかが記録されており、最新100件まで表示されます。
            </p>
          </section>

          {/* 組織設定 */}
          <section id="settings" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              ⚙️ 組織設定
            </h2>

            <p className="text-gray-700 mb-4">
              サイドバーの「設定・管理」→「⚙️ 組織設定」から、システム全体の設定を変更できます。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">設定できる項目</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>組織名、業種の変更</li>
              <li>倉庫階層の名称変更</li>
              <li>通知設定の有効/無効</li>
              <li>メール通知の送信先</li>
            </ul>
          </section>

          {/* 監査ログ */}
          <section id="audit" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              📝 監査ログ（管理者専用）
            </h2>

            <p className="text-gray-700 mb-4">
              すべての操作履歴を確認できます。サイドバーの「設定・管理」→「📝 監査ログ」をクリック。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">用途</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>セキュリティ監査</li>
              <li>不正操作の検知</li>
              <li>トラブル時の原因調査</li>
            </ul>
          </section>

          {/* 効率的な運用のコツ */}
          <section id="tips" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              💡 効率的な運用のコツ
            </h2>

            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">1. 初期セットアップは丁寧に</h3>
                <p className="text-green-700 text-sm">
                  カテゴリを整理しておくと後が楽です。倉庫階層は実際の倉庫レイアウトに合わせましょう。
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">2. QRコードを活用</h3>
                <p className="text-green-700 text-sm">
                  道具だけでなく、倉庫位置にもQRコードを貼りましょう。A4用紙に複数のQRを印刷してラミネート加工すると耐久性がアップします。
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">3. 定期的な棚卸</h3>
                <p className="text-green-700 text-sm">
                  月1回、実際の在庫とシステムの数を照合しましょう。消耗品の「在庫調整」機能で修正できます。
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">4. スタッフ教育</h3>
                <p className="text-green-700 text-sm">
                  移動登録を必ず行うよう徹底しましょう。朝礼で「一括移動」機能の使い方を実演するのが効果的です。
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">5. 通知設定の活用</h3>
                <p className="text-green-700 text-sm">
                  最小在庫数を適切に設定し、メール通知先を複数人に設定（CCで対応）しておくと安心です。
                </p>
              </div>
            </div>
          </section>

          {/* よくある管理課題 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              🔧 よくある管理課題と解決策
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">課題</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">解決策</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3">スタッフが移動登録を忘れる</td>
                    <td className="px-4 py-3">朝礼で「一括移動」の重要性を説明。QRコードを大きく印刷</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">在庫数が合わない</td>
                    <td className="px-4 py-3">定期棚卸を実施。監査ログで不正を確認</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">道具がどこにあるか分からない</td>
                    <td className="px-4 py-3">倉庫位置管理を徹底。位置QRコードを活用</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">保証期限が切れて気づかない</td>
                    <td className="px-4 py-3">通知機能を有効化。メール送信先を確認</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* サポート */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              📞 サポート
            </h2>
            <p className="text-gray-700">
              システムに関するお問い合わせは、テクニカルサポートまでご連絡ください。
            </p>
          </section>
        </div>

        {/* フッター */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Version 1.0 | 最終更新日: 2025年12月</p>
        </div>
      </div>
    </div>
  )
}
