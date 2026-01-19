import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zairoku.com'

  // 静的公開ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/request-demo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/request-demo/success`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/commercial-law`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]

  // 🔮 将来の拡張: ブログ記事の動的生成
  // 実装時は以下のコメントを外してください
  /*
  const blogPosts = await fetchBlogPosts() // Supabaseなどから取得
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))
  */

  // 🔮 将来の拡張: お知らせの動的生成
  /*
  const announcements = await fetchAnnouncements()
  const announcementPages: MetadataRoute.Sitemap = announcements.map((item) => ({
    url: `${baseUrl}/news/${item.slug}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
  */

  return [
    ...staticPages,
    // ...blogPages,        // 将来有効化
    // ...announcementPages, // 将来有効化
  ]
}

// 🔮 将来の拡張: ブログ記事取得関数（実装例）
/*
async function fetchBlogPosts() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return data || []
}
*/

// 🔮 将来の拡張: お知らせ取得関数（実装例）
/*
async function fetchAnnouncements() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data } = await supabase
    .from('announcements')
    .select('slug, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return data || []
}
*/
