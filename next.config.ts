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
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
})

export default withMDX(nextConfig);
