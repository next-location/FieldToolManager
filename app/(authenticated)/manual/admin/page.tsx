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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/manual"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← マニュアル一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
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
              <a href="#work-reports" className="text-blue-600 hover:text-blue-800">📋 作業報告書管理</a>
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
              <li>「道具管理」→「消耗品一覧」→「+ 新規登録」</li>
              <li>消耗品名、単位（双、個、本など）を入力</li>
              <li><strong>最小在庫数</strong>を設定（この数量を下回るとアラートが出ます）</li>
              <li>「登録する」ボタンをクリック</li>
            </ol>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="font-semibold text-yellow-800 mb-2">最小在庫数の設定例</p>
              <ul className="space-y-1 text-yellow-700 text-sm">
                <li>• 軍手: 50双（1週間で使う量を目安に）</li>
                <li>• 養生テープ: 20個</li>
                <li>• マスク: 30個</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">⚠️ 在庫調整 vs 発注管理の使い分け</h3>
            <p className="text-gray-700 mb-4">
              消耗品の在庫を増減させる方法は2つあります。<strong>用途に応じて正しく使い分けることが重要です。</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔹 在庫調整機能</h4>
                <p className="text-sm text-blue-800 mb-3"><strong>用途:</strong> 例外的な在庫変動の記録</p>
                <p className="text-xs text-blue-700 mb-2">使用シーン:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ 棚卸による実在庫との差異修正</li>
                  <li>✓ 紛失・破損による在庫減少</li>
                  <li>✓ 他社からの無償提供</li>
                  <li>✓ 試供品の入庫</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">🔹 消耗品発注管理</h4>
                <p className="text-sm text-green-800 mb-3"><strong>用途:</strong> 正式な発注プロセスの管理</p>
                <p className="text-xs text-green-700 mb-2">使用シーン:</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>✓ 業者から正式に購入する場合</li>
                  <li>✓ 発注番号を記録したい</li>
                  <li>✓ コストを正確に管理したい</li>
                  <li>✓ 納品予定日を追跡したい</li>
                </ul>
              </div>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <p className="font-semibold text-red-800 mb-2">❌ よくある間違い</p>
              <ul className="space-y-2 text-red-700 text-sm">
                <li>
                  <strong>× 間違い:</strong> 業者から購入したのに「在庫調整」で追加
                  <br />
                  <span className="text-xs">→ 発注履歴が残らず、コスト管理ができません</span>
                </li>
                <li>
                  <strong>× 間違い:</strong> 棚卸の差異を「発注管理」で架空の発注を作成
                  <br />
                  <span className="text-xs">→ 虚偽のデータが残り、監査時に問題になります</span>
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">消耗品発注管理の使い方</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 mb-4">
              <li>
                <strong>発注登録:</strong> 「道具管理」→「消耗品発注管理」→「+ 新規発注」
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>消耗品、数量、発注日、納品予定日を入力</li>
                  <li>業者名、発注番号、単価を記録</li>
                  <li>ステータス「発注中」で登録</li>
                </ul>
              </li>
              <li>
                <strong>発注確定:</strong> 業者に発注を送信したら「発注確定」ボタン
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>ステータスが「発注済み」に変更</li>
                </ul>
              </li>
              <li>
                <strong>納品処理:</strong> 商品が届いたら「納品処理」ボタン
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>実納品日と実納品数を入力</li>
                  <li>「納品完了」で倉庫在庫に自動反映</li>
                  <li>ステータスが「納品済み」に変更</li>
                </ul>
              </li>
            </ol>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <p className="font-semibold text-green-800 mb-2">💡 発注管理のメリット</p>
              <ul className="space-y-1 text-green-700 text-sm">
                <li>✓ 発注履歴が完全に記録される</li>
                <li>✓ コストが正確に把握できる</li>
                <li>✓ 納品遅延を追跡できる</li>
                <li>✓ 業者ごとの発注実績を確認できる</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">在庫調整の使い方</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 mb-4">
              <li>
                <strong>調整画面を開く:</strong> 「道具管理」→「消耗品一覧」→ 対象消耗品 → 「在庫調整」
              </li>
              <li>
                <strong>調整種別を選択:</strong>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>在庫を追加: 棚卸修正、無償提供など</li>
                  <li>在庫を減らす: 棚卸修正、紛失、破損など</li>
                </ul>
              </li>
              <li>
                <strong>数量と理由を入力:</strong>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>調整する数量を入力</li>
                  <li>理由を選択（棚卸、紛失、破損、無償提供、その他）</li>
                  <li>メモ欄に詳細を記載（推奨）</li>
                </ul>
              </li>
              <li>
                <strong>調整実行:</strong> 「調整実行」ボタンで即座に在庫反映
              </li>
            </ol>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-semibold text-yellow-800 mb-2">📋 運用のベストプラクティス</p>
              <ul className="space-y-2 text-yellow-700 text-sm">
                <li>
                  <strong>月次棚卸:</strong> 月末に実地棚卸を実施し、差異は在庫調整で修正
                </li>
                <li>
                  <strong>紛失・破損:</strong> 発生時は速やかに在庫調整で記録
                </li>
                <li>
                  <strong>正式発注:</strong> 業者から購入する場合は必ず発注管理を使用
                </li>
                <li>
                  <strong>監査対応:</strong> 在庫調整は履歴が残るため、理由を明確に記載
                </li>
              </ul>
            </div>
          </section>

          {/* 作業報告書管理 */}
          <section id="work-reports" className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-500 pb-2 mb-4">
              📋 作業報告書管理
            </h2>

            <p className="text-gray-700 mb-4">
              作業報告書の承認、管理、分析を行います。管理者は全ての報告書を確認・承認できます。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">承認待ち報告書の確認</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>ダッシュボードの「承認待ち報告書」カードをクリック</li>
              <li>または「作業報告」→「承認待ち一覧」へアクセス</li>
              <li>報告書を開いて内容を確認</li>
              <li>問題なければ「承認」ボタンをクリック</li>
            </ol>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="font-semibold text-yellow-800 mb-2">承認時のチェックポイント</p>
              <ul className="space-y-1 text-yellow-700 text-sm">
                <li>✓ 作業内容が明確に記載されているか</li>
                <li>✓ 必要な写真が添付されているか</li>
                <li>✓ 作業時間が適切か</li>
                <li>✓ 使用機材・材料が正しく記録されているか</li>
                <li>✓ 安全対策が実施されているか</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">報告書の検索・フィルタリング</h3>
            <p className="text-gray-700 mb-4">
              「作業報告」→「報告書一覧」で過去の報告書を検索できます：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>日付範囲:</strong> 期間を指定して検索</li>
              <li><strong>現場:</strong> 特定の現場の報告書のみ表示</li>
              <li><strong>作成者:</strong> 特定のスタッフの報告書を確認</li>
              <li><strong>ステータス:</strong> 下書き/承認待ち/承認済み/差戻し</li>
              <li><strong>キーワード:</strong> 作業内容や備考を検索</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">PDF出力機能</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>報告書詳細画面を開く</li>
              <li>右上の「PDFダウンロード」ボタンをクリック</li>
              <li>以下の情報が含まれたPDFが生成されます：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>会社ロゴ・社印</li>
                  <li>報告書の全項目</li>
                  <li>添付写真（最大6枚）</li>
                  <li>承認者情報と承認日時</li>
                  <li>個人印影（承認済みの場合）</li>
                </ul>
              </li>
            </ol>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <p className="font-semibold text-blue-800 mb-2">PDFの用途</p>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• 顧客への提出用書類として</li>
                <li>• 社内アーカイブ用として</li>
                <li>• 監査・検査対応用として</li>
                <li>• 請求書の添付書類として</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">月次集計・分析</h3>
            <p className="text-gray-700 mb-4">
              月単位で報告書を集計・分析できます：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>作業時間集計:</strong> スタッフ別・現場別の作業時間</li>
              <li><strong>材料使用状況:</strong> 使用材料の集計</li>
              <li><strong>作業種別分析:</strong> 作業内容の傾向分析</li>
              <li><strong>写真アーカイブ:</strong> 月次の作業写真一覧</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">カスタムフィールドの設定（上級者向け）</h3>
            <p className="text-gray-700 mb-4">
              組織設定から、業種に応じたカスタムフィールドを追加できます：
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>「設定・管理」→「組織設定」→「作業報告書設定」</li>
              <li>「カスタムフィールド追加」をクリック</li>
              <li>フィールドタイプを選択：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>テキスト（自由記入）</li>
                  <li>数値（数量・金額など）</li>
                  <li>選択式（ドロップダウン）</li>
                  <li>チェックボックス（複数選択）</li>
                  <li>日付・時刻</li>
                </ul>
              </li>
              <li>必須/任意を設定</li>
              <li>「保存」をクリック</li>
            </ol>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <p className="font-semibold text-green-800 mb-2">💡 カスタムフィールド活用例</p>
              <ul className="space-y-2 text-green-700 text-sm">
                <li>
                  <strong>建築業:</strong> 工程区分、検査項目、品質チェック項目
                </li>
                <li>
                  <strong>塗装業:</strong> 塗料種類、塗装面積、乾燥時間
                </li>
                <li>
                  <strong>電気工事業:</strong> 配線長、使用機器型番、絶縁抵抗値
                </li>
                <li>
                  <strong>設備工事業:</strong> 機器型番、設置場所詳細、試運転結果
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">承認フローのカスタマイズ</h3>
            <p className="text-gray-700 mb-4">
              組織の規模に応じて承認フローを設定できます：
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>自動承認:</strong> リーダー以上が作成した報告書は自動承認</li>
              <li><strong>1段階承認:</strong> リーダーまたは管理者が承認（デフォルト）</li>
              <li><strong>2段階承認:</strong> リーダー承認後、管理者が最終承認</li>
              <li><strong>金額基準承認:</strong> 一定金額以上は管理者承認必須</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">データエクスポート</h3>
            <p className="text-gray-700 mb-4">
              報告書データをCSV形式でエクスポートできます：
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>「作業報告」→「報告書一覧」を開く</li>
              <li>必要に応じてフィルタリング</li>
              <li>「CSVエクスポート」ボタンをクリック</li>
              <li>エクスポート範囲を選択：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>表示中のデータのみ</li>
                  <li>全期間のデータ</li>
                  <li>カスタム期間を指定</li>
                </ul>
              </li>
            </ol>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-semibold text-yellow-800 mb-2">⚠️ 注意事項</p>
              <ul className="space-y-1 text-yellow-700 text-sm">
                <li>• 承認済みの報告書は内容を編集できません</li>
                <li>• 差戻しした報告書は作成者に通知されます</li>
                <li>• 削除した報告書は復元できません（ゴミ箱機能なし）</li>
                <li>• 添付ファイルは1ファイル10MBまで</li>
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
