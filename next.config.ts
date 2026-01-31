import type { NextConfig } from "next";
import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'ufmuxaekjnriqbfqcumj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // キャッシュバスティングのため、ビルドIDを変更
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // HTMLキャッシュ無効化（Vercelキャッシュ問題対策）
  async headers() {
    return [
      {
        // 全てのページルート（HTMLドキュメント）に対して
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // HTMLは常にサーバーに確認（max-age=0）、JS/CSSは別途キャッシュOK
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  // マーケティング用リダイレクト設定
  async redirects() {
    return [
      {
        source: '/check',
        destination: '/?utm_source=form&utm_medium=email&utm_campaign=202602',
        permanent: false, // 302リダイレクト（一時的）
      },
      // 他のキャンペーン用URLも追加可能
      {
        source: '/demo',
        destination: '/?utm_source=form&utm_medium=email&utm_campaign=demo202602',
        permanent: false,
      },
      {
        source: '/trial',
        destination: '/?utm_source=form&utm_medium=email&utm_campaign=trial202602',
        permanent: false,
      },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
})

export default withMDX(nextConfig);
