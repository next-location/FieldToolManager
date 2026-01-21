import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPublicManualArticle } from '@/lib/manual/public-metadata'

export default async function HelpLoginPage() {
  const article = await getPublicManualArticle('login')

  if (!article) {
    notFound()
  }

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
        <style dangerouslySetInnerHTML={{
          __html: `
            .help-article h1 {
              font-size: 1.875rem;
              font-weight: 700;
              color: #1f2937;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 0.5rem;
              margin-top: 2rem;
              margin-bottom: 1.5rem;
            }
            .help-article h2 {
              font-size: 1.5rem;
              font-weight: 600;
              color: #374151;
              border-left: 4px solid #3b82f6;
              padding-left: 0.75rem;
              margin-top: 2rem;
              margin-bottom: 1rem;
            }
            .help-article h3 {
              font-size: 1.25rem;
              font-weight: 600;
              color: #4b5563;
              padding-left: 0.5rem;
              border-left: 3px solid #9ca3af;
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
            }
            .help-article h4 {
              font-size: 1.125rem;
              font-weight: 600;
              color: #6b7280;
              margin-top: 1.25rem;
              margin-bottom: 0.5rem;
            }
          `
        }} />
        <article className="help-article prose prose-blue max-w-none bg-white rounded-lg shadow-sm p-8">
          <h1>{article.frontmatter.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
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
