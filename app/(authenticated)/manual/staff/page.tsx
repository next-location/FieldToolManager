import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StaffManualPage() {
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
            📱 現場スタッフ向け 操作マニュアル
          </h1>
          <p className="text-gray-600">
            対象ユーザー: 現場で働くスタッフの方 | 使用デバイス: スマートフォン（推奨）
          </p>
        </div>

        {/* マニュアルコンテンツ */}
        <div className="prose prose-blue max-w-none bg-white rounded-lg shadow p-6 md:p-8">
          {/* スマホでの基本操作 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              📱 スマホでの基本操作
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">アプリへのアクセス</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>スマートフォンのブラウザ（Safari、Chrome等）を開く</li>
              <li>会社から指定されたURL（例：<code className="bg-gray-100 px-2 py-1 rounded text-sm">https://yourcompany.example.com</code>）にアクセス</li>
              <li>ログイン画面でメールアドレスとパスワードを入力</li>
            </ol>
          </section>

          {/* ホーム画面の見方 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              🧭 ホーム画面の見方
            </h2>

            <p className="text-gray-700 mb-4">
              ログイン後、最初に表示される画面です。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">画面下部のナビゲーションバー</h3>
            <p className="text-gray-700 mb-4">
              スマホ画面の一番下に、5つのメニューボタンが表示されます：
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre">
{`┌─────┬─────┬─────┬─────┬─────┐
│ 🏠  │ QR  │  📦 │ 🔔  │  ☰  │
│ホーム│     │一括 │通知 │メニュー│
│     │     │移動 │     │     │
└─────┴─────┴─────┴─────┴─────┘`}
              </pre>
            </div>

            <ul className="space-y-2 text-gray-700">
              <li><strong>🏠 ホーム:</strong> ダッシュボード（メイン画面）</li>
              <li><strong>QR:</strong> QRコードスキャン機能</li>
              <li><strong>📦 一括移動:</strong> 複数の道具をまとめて移動（最もよく使う機能）</li>
              <li><strong>🔔 通知:</strong> システムからの通知を確認</li>
              <li><strong>☰ メニュー:</strong> その他の機能メニュー</li>
            </ul>
          </section>

          {/* 最も使う機能：一括移動 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-red-500 pb-2 mb-4">
              🔥 最も使う機能：一括移動
            </h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="font-semibold text-yellow-800">使用シーン</p>
              <ul className="mt-2 space-y-1 text-yellow-700 text-sm">
                <li>• 朝、現場へ道具を持ち出すとき</li>
                <li>• 夕方、倉庫へ道具を返却するとき</li>
                <li>• 道具を別の現場へ移動するとき</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">操作手順</h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">1. 移動先を選択</h4>
                <p className="text-gray-700 mb-3">
                  画面下部の「📦 一括移動」ボタンをタップ。<br />
                  3つのボタンから移動先を選びます：
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex gap-2 justify-around text-center">
                    <div className="flex-1 border-2 border-blue-500 bg-blue-50 rounded-lg p-3">
                      <div className="text-3xl mb-1">🏢</div>
                      <div className="font-medium text-sm">倉庫</div>
                    </div>
                    <div className="flex-1 border-2 border-gray-300 rounded-lg p-3">
                      <div className="text-3xl mb-1">🏗️</div>
                      <div className="font-medium text-sm">現場</div>
                    </div>
                    <div className="flex-1 border-2 border-gray-300 rounded-lg p-3">
                      <div className="text-3xl mb-1">🔧</div>
                      <div className="font-medium text-sm">修理</div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>🏢 倉庫:</strong> 道具を倉庫に返却する</li>
                  <li><strong>🏗️ 現場:</strong> 道具を現場へ持ち出す</li>
                  <li><strong>🔧 修理:</strong> 道具を修理に出す</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">2. 道具をスキャン</h4>

                <p className="text-gray-700 font-semibold mb-2">方法A: カメラでQRコードをスキャン（推奨）</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                  <li>「📷 カメラでスキャン」ボタンをタップ</li>
                  <li>カメラが起動するので、道具に貼られたQRコードを画面中央の枠に合わせる</li>
                  <li>自動で読み取られ、「✓ 道具を追加しました！」と表示される</li>
                  <li>次の道具のQRコードをスキャン（繰り返し）</li>
                  <li>すべてスキャンしたら「×」で閉じる</li>
                </ol>

                <p className="text-gray-700 font-semibold mb-2">方法B: 手動入力モード</p>
                <p className="text-gray-700 mb-2 text-sm">QRコードリーダー（ハンディスキャナー）を使う場合：</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>「⌨️ 手動入力」ボタンをタップ（緑色に変わる）</li>
                  <li>QRコードリーダーでスキャン</li>
                  <li>自動的に入力欄にコードが入力される</li>
                  <li><strong>Enterキー</strong>を押す</li>
                  <li>「✓ 道具を追加しました！」と表示される</li>
                  <li>次の道具をスキャン（繰り返し）</li>
                </ol>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">3. 選択した道具を確認</h4>
                <p className="text-gray-700 mb-3">
                  スキャンした道具が一覧で表示されます。<br />
                  間違って追加した場合は、右側の「削除 ×」をタップして削除できます。
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3">4. 一括登録ボタンを押す</h4>
                <p className="text-gray-700 mb-3">
                  画面下部の青いボタンをタップして完了。<br />
                  登録中は進捗が表示され、完了すると自動で移動履歴ページに遷移します。
                </p>
              </div>
            </div>
          </section>

          {/* QRスキャン機能 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              📱 QRスキャン機能（個別確認）
            </h2>

            <p className="text-gray-700 mb-4">
              1つの道具の情報を確認したいときに使います。
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <p className="font-semibold text-blue-800">使用シーン</p>
              <ul className="mt-2 space-y-1 text-blue-700 text-sm">
                <li>• この道具は今どこにあるか確認したい</li>
                <li>• この道具のステータスを知りたい</li>
                <li>• この道具の詳細情報を見たい</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">操作手順</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>画面下部の「QR」ボタンをタップ</li>
              <li>カメラが起動</li>
              <li>道具のQRコードをスキャン</li>
              <li>自動で道具の詳細画面に移動</li>
            </ol>

            <p className="text-gray-700 mt-4">詳細画面では以下が確認できます：</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
              <li>道具名、型番</li>
              <li>現在の位置（倉庫 or 現場名）</li>
              <li>ステータス（使用中、利用可能など）</li>
              <li>シリアル番号</li>
              <li>写真（登録されている場合）</li>
              <li>過去の移動履歴</li>
            </ul>
          </section>

          {/* 消耗品の操作 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              🧰 消耗品の操作
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">在庫を確認する</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>ホーム画面の「🧰 消耗品管理」をタップ</li>
              <li>一覧が表示される</li>
            </ol>
            <p className="text-gray-700 mb-4">
              ⚠️マークは、最小在庫を下回っている警告です。
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">在庫を調整する（入庫・出庫）</h3>

            <div className="mb-4">
              <p className="text-gray-700 font-semibold mb-2">入庫（購入して倉庫に追加する場合）</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>該当の消耗品の「在庫調整」をタップ</li>
                <li>「入庫」を選択</li>
                <li>数量を入力（例：50）</li>
                <li>「登録」ボタンをタップ</li>
              </ol>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 font-semibold mb-2">出庫（廃棄・消費した場合）</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>該当の消耗品の「在庫調整」をタップ</li>
                <li>「出庫」を選択</li>
                <li>数量を入力（例：10）</li>
                <li>「登録」ボタンをタップ</li>
              </ol>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">消耗品を現場へ移動する</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>該当の消耗品の「移動」をタップ</li>
              <li>移動元を選択（倉庫 or 現場）</li>
              <li>移動先を選択（倉庫 or 現場）</li>
              <li>数量を入力</li>
              <li>「登録」ボタンをタップ</li>
            </ol>
          </section>

          {/* よくある質問 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              💡 よくある質問（FAQ）
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Q1. QRコードが読み取れない</h3>
                <p className="text-gray-700 mb-2"><strong>A.</strong> 以下を試してください：</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm ml-4">
                  <li>明るい場所で試す</li>
                  <li>QRコードを画面中央の枠にしっかり合わせる</li>
                  <li>カメラのピントが合うまで少し待つ</li>
                  <li>QRコードが汚れていないか確認</li>
                  <li>手動入力モードでQRコードリーダーを使う</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Q2. 間違って道具を選択してしまった</h3>
                <p className="text-gray-700">
                  <strong>A.</strong> 選択済みリストの右側にある「削除 ×」ボタンをタップすれば削除できます。
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Q3. 一括移動の登録中にエラーが出た</h3>
                <p className="text-gray-700">
                  <strong>A.</strong> 一部の道具だけ失敗した場合、エラーメッセージに失敗した道具名が表示されます。失敗した道具だけがリストに残るので、もう一度「一括登録」ボタンを押してください。
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Q4. カメラが起動しない</h3>
                <p className="text-gray-700 mb-2"><strong>A.</strong> ブラウザにカメラの許可を与える必要があります：</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm ml-4">
                  <li>ブラウザの設定を開く</li>
                  <li>「サイトの設定」または「権限」を選択</li>
                  <li>カメラを「許可」に設定</li>
                  <li>ページを再読み込み</li>
                </ol>
              </div>
            </div>
          </section>

          {/* 作業報告書の作成 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 pb-2 mb-4">
              📝 作業報告書の作成・提出
            </h2>

            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
              <p className="font-semibold text-orange-800">使用シーン</p>
              <ul className="mt-2 space-y-1 text-orange-700 text-sm">
                <li>• 毎日の作業終了後に日報を作成</li>
                <li>• 現場での作業内容を記録</li>
                <li>• 写真を添付して作業状況を報告</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">新規作成の手順</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>作業報告書メニューへ移動</strong>
                <div className="ml-6 mt-2 text-sm bg-gray-50 p-3 rounded">
                  メニュー → 作業報告書 → 新規作成をタップ
                </div>
              </li>

              <li>
                <strong>基本情報を入力</strong>
                <div className="ml-6 mt-2 space-y-2 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">必須項目：</p>
                    <ul className="mt-1 space-y-1">
                      <li>• <strong>作業日</strong>: カレンダーから選択</li>
                      <li>• <strong>現場</strong>: プルダウンから選択</li>
                      <li>• <strong>天候</strong>: 晴れ/曇り/雨/雪から選択</li>
                      <li>• <strong>作業時間</strong>: 開始・終了時刻を入力</li>
                      <li>• <strong>作業内容</strong>: 具体的に記入</li>
                    </ul>
                  </div>
                </div>
              </li>

              <li>
                <strong>詳細情報を入力（任意）</strong>
                <div className="ml-6 mt-2 space-y-2 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <ul className="space-y-1">
                      <li>• <strong>帯同作業員</strong>: 一緒に作業したスタッフを選択</li>
                      <li>• <strong>作業箇所</strong>: 具体的な場所（例：2階リビング）</li>
                      <li>• <strong>進捗率</strong>: 作業の進み具合（0〜100%）</li>
                      <li>• <strong>使用道具</strong>: 使用した道具を選択</li>
                      <li>• <strong>使用材料</strong>: 使用した材料を記入</li>
                    </ul>
                  </div>
                </div>
              </li>

              <li>
                <strong>写真を添付（推奨）</strong>
                <div className="ml-6 mt-2 text-sm bg-yellow-50 p-3 rounded">
                  <p className="font-medium text-yellow-800">📸 写真の撮影・添付方法：</p>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-yellow-700">
                    <li>「写真を追加」ボタンをタップ</li>
                    <li>「カメラ」または「ライブラリから選択」を選択</li>
                    <li>写真の種類を選択（作業前/作業中/作業後/問題箇所/その他）</li>
                    <li>必要に応じてキャプション（説明文）を追加</li>
                    <li>複数枚の写真を追加可能（最大10枚）</li>
                  </ol>
                </div>
              </li>

              <li>
                <strong>資料を添付（必要に応じて）</strong>
                <div className="ml-6 mt-2 text-sm bg-gray-50 p-3 rounded">
                  <ul className="space-y-1">
                    <li>• PDF、Excel、Wordなどの資料を添付可能</li>
                    <li>• 図面や見積書などを添付する際に使用</li>
                    <li>• ファイルサイズ上限：10MB/ファイル</li>
                  </ul>
                </div>
              </li>

              <li>
                <strong>保存または提出</strong>
                <div className="ml-6 mt-2 text-sm">
                  <div className="bg-blue-50 p-3 rounded space-y-2">
                    <div>
                      <span className="font-medium">📝 下書き保存：</span>
                      <p className="mt-1">後で編集したい場合は「下書き保存」をタップ</p>
                    </div>
                    <div>
                      <span className="font-medium">✅ 提出：</span>
                      <p className="mt-1">内容を確認して「提出」をタップ（管理者の承認待ちになります）</p>
                    </div>
                  </div>
                </div>
              </li>
            </ol>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">作成した報告書の確認</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">作成した報告書は以下から確認できます：</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">📋</span>
                  <div>
                    <strong>報告書一覧</strong>
                    <p className="text-gray-600">メニュー → 作業報告書 → 一覧</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-500 mr-2">📝</span>
                  <div>
                    <strong>下書き</strong>
                    <p className="text-gray-600">ステータス「下書き」でフィルター</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✅</span>
                  <div>
                    <strong>承認済み</strong>
                    <p className="text-gray-600">ステータス「承認済み」でフィルター</p>
                  </div>
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">報告書の編集・再提出</h3>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
              <p className="font-semibold text-amber-800 mb-2">下書きまたは差し戻された報告書の編集：</p>
              <ol className="space-y-1 text-amber-700 text-sm list-decimal list-inside">
                <li>報告書一覧から該当の報告書をタップ</li>
                <li>詳細画面で「編集」ボタンをタップ</li>
                <li>内容を修正</li>
                <li>「提出」または「下書き保存」をタップ</li>
              </ol>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3">承認状況の確認</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-gray-700 mb-3">報告書のステータス：</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mr-2">下書き</span>
                  まだ提出していない状態
                </li>
                <li>
                  <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium mr-2">承認待ち</span>
                  管理者の確認待ち
                </li>
                <li>
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium mr-2">承認済み</span>
                  管理者が承認済み
                </li>
                <li>
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium mr-2">差し戻し</span>
                  修正が必要（コメントを確認して修正）
                </li>
              </ul>
            </div>
          </section>

          {/* クイックリファレンス */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              ⚡ クイックリファレンス
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">やりたいこと</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">道具を現場へ持ち出す</td>
                    <td className="px-4 py-3 text-sm text-gray-700">📦 一括移動 → 現場を選択 → QRスキャン → 登録</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">道具を倉庫へ返却</td>
                    <td className="px-4 py-3 text-sm text-gray-700">📦 一括移動 → 倉庫を選択 → QRスキャン → 登録</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">道具の場所を確認</td>
                    <td className="px-4 py-3 text-sm text-gray-700">QR → 道具をスキャン</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">作業報告書を作成</td>
                    <td className="px-4 py-3 text-sm text-gray-700">作業報告書 → 新規作成 → 入力 → 提出</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">消耗品（軍手）を補充</td>
                    <td className="px-4 py-3 text-sm text-gray-700">🧰 消耗品管理 → 在庫調整 → 入庫</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">消耗品を現場へ持ち出す</td>
                    <td className="px-4 py-3 text-sm text-gray-700">🧰 消耗品管理 → 移動 → 移動先選択</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-900">通知を確認</td>
                    <td className="px-4 py-3 text-sm text-gray-700">🔔 通知</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* サポート */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 pb-2 mb-4">
              📞 サポート
            </h2>
            <p className="text-gray-700">
              操作方法で不明な点がある場合は、管理者にお問い合わせください。
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
