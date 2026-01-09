import Link from 'next/link'
import Image from 'next/image'

export default function HelpLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/images/zairoku-logo.png"
                alt="ザイロク"
                width={120}
                height={30}
                className="h-8 w-auto"
              />
              <span className="text-sm text-gray-600">ヘルプセンター</span>
            </div>
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              ログインページに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose prose-blue max-w-none bg-white rounded-lg shadow-sm p-8">
          <h1>ログイン方法</h1>

          <p>ザイロクへのログイン手順を説明します。</p>

          <h2>ログイン画面へのアクセス</h2>

          <h3>PCの場合</h3>

          <p>ブラウザで以下のURLにアクセスしてください:</p>
          <ul>
            <li>本番環境: <code>https://あなたの会社名.zairoku.com</code></li>
            <li>または: <code>https://zairoku.com</code> からログイン</li>
          </ul>

          <Image
            src="/images/manual/login-screen-pc.png"
            alt="PC版ログイン画面"
            width={700}
            height={400}
            className="rounded-lg border border-gray-200"
          />

          <h3>スマホの場合</h3>

          <p>ブラウザで <code>https://あなたの会社名.zairoku.com</code> にアクセスしてください。</p>

          <Image
            src="/images/manual/login-screen-mobile.png"
            alt="スマホ版ログイン画面"
            width={300}
            height={600}
            className="rounded-lg border border-gray-200"
          />

          <hr />

          <h2>ログイン手順</h2>

          <h3>1. メールアドレスを入力</h3>

          <p>管理者から通知されたメールアドレスを入力してください。</p>

          <h3>2. パスワードを入力</h3>

          <p>初回ログイン時に設定したパスワードを入力してください。</p>

          <h3>3. ログインボタンをクリック</h3>

          <p>「ログイン」ボタンをクリックしてください。</p>

          <h3>4. ログイン完了</h3>

          <p>ログインに成功すると、ダッシュボード画面が表示されます。</p>

          <Image
            src="/images/manual/dashboard-after-login.png"
            alt="ログイン後のダッシュボード"
            width={700}
            height={400}
            className="rounded-lg border border-gray-200"
          />

          <p><strong>スマホの場合:</strong></p>

          <Image
            src="/images/manual/dashboard-after-login-mobile.png"
            alt="スマホ版ダッシュボード"
            width={300}
            height={600}
            className="rounded-lg border border-gray-200"
          />

          <hr />

          <h2>初回ログイン時の注意点</h2>

          <h3>パスワード設定</h3>

          <p>初回ログイン時は、管理者から送られた招待メールからパスワードを設定する必要があります。</p>

          <ol>
            <li>招待メール内の「パスワードを設定」リンクをクリック</li>
            <li>新しいパスワードを入力（8文字以上推奨）</li>
            <li>パスワードを再入力して確認</li>
            <li>「パスワードを設定」ボタンをクリック</li>
          </ol>

          <h3>パスワードの要件</h3>

          <ul>
            <li><strong>最小文字数</strong>: 8文字以上</li>
            <li><strong>推奨</strong>: 大文字・小文字・数字を組み合わせる</li>
            <li><strong>禁止</strong>: 簡単に推測できるパスワード（例: password123）</li>
          </ul>

          <hr />

          <h2>ログインできない場合</h2>

          <h3>ケース1: メールアドレスまたはパスワードが間違っている</h3>

          <p><strong>エラーメッセージ</strong>: 「メールアドレスまたはパスワードが正しくありません」</p>

          <p><strong>対処法</strong>:</p>
          <ul>
            <li>メールアドレスのスペルミスを確認</li>
            <li>パスワードの大文字・小文字を確認</li>
            <li>Caps Lockがオンになっていないか確認</li>
          </ul>

          <h3>ケース2: パスワードを忘れた</h3>

          <ol>
            <li>ログイン画面の「パスワードをお忘れですか？」リンクをクリック</li>
            <li>登録されているメールアドレスを入力</li>
            <li>「パスワードリセットメールを送信」ボタンをクリック</li>
            <li>届いたメールからパスワードをリセット</li>
          </ol>

          <Image
            src="/images/manual/password-reset.png"
            alt="パスワードリセット画面"
            width={500}
            height={400}
            className="rounded-lg border border-gray-200"
          />

          <h3>ケース3: アカウントがロックされた</h3>

          <p>複数回ログインに失敗すると、セキュリティのため一時的にアカウントがロックされます。</p>

          <p><strong>対処法</strong>:</p>
          <ul>
            <li>15分待ってから再度試す</li>
            <li>または管理者に連絡してロック解除を依頼</li>
          </ul>

          <hr />

          <h2>セキュリティに関する注意事項</h2>

          <h3>パスワードの管理</h3>

          <ul>
            <li><strong>他人と共有しない</strong>: パスワードは絶対に他人に教えないでください</li>
            <li><strong>定期的に変更</strong>: 3ヶ月に1回程度の変更を推奨</li>
            <li><strong>使い回しをしない</strong>: 他のサービスと同じパスワードを使わない</li>
          </ul>

          <h3>公共のPCを使う場合</h3>

          <ul>
            <li>ログイン後は必ず「ログアウト」してください</li>
            <li>ブラウザの「パスワードを保存」機能は使用しないでください</li>
          </ul>

          <hr />

          <h2>お困りの際は</h2>

          <p>ログインに関して問題が解決しない場合は、システム管理者にお問い合わせください。</p>
        </article>

        {/* フッター */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            ログインページに戻る
          </Link>
        </div>
      </main>
    </div>
  )
}
