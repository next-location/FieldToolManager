import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

export const demoRestrictions = {
  // データ量制限
  limits: {
    maxTools: 20,          // 工具20個まで
    maxStaff: 5,          // スタッフ5名まで
    maxLocations: 3,      // 拠点3箇所まで
    maxReports: 10,       // 報告書10件まで
    maxPhotos: 5,         // 写真5枚まで/報告書
  },

  // 機能制限
  disabledFeatures: [
    'csv_export',         // CSVエクスポート
    'pdf_export',         // PDF出力
    'api_access',         // API連携
    'custom_fields',      // カスタムフィールド
    'advanced_analytics', // 高度な分析
    'bulk_operations',    // 一括操作
    'integrations',       // 外部連携
    'staff_import',       // スタッフ一括登録
    'custom_qr',          // QRコードカスタマイズ
  ],

  // デモで使用可能なページパス（これ以外は全て制限）
  allowedPages: [
    '/dashboard',         // ダッシュボード
    '/scan',              // QRスキャン
    '/tools',             // 道具一覧（閲覧のみ）
    '/consumables',       // 消耗品一覧（閲覧のみ、/consumables/ordersと/consumables/bulk-movementは除く）
  ],

  // UI表示
  ui: {
    watermark: 'デモ環境',
    bannerText: '本環境はデモ用です。7日後に自動削除されます。',
    bannerColor: 'bg-orange-100 text-orange-800',
    disabledButtonText: '製品版でご利用可能',
    upgradePrompt: '全機能を使うには製品版にアップグレード'
  }
}

export function useDemo() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const isDemo = user?.user_metadata?.is_demo || false
  const expiresAt = user?.user_metadata?.expires_at

  const checkLimit = (feature: keyof typeof demoRestrictions.limits, currentCount: number): boolean => {
    if (!isDemo) return true
    return currentCount < demoRestrictions.limits[feature]
  }

  const isFeatureDisabled = (feature: string): boolean => {
    if (!isDemo) return false
    return demoRestrictions.disabledFeatures.includes(feature)
  }

  const isPageRestricted = (pathname: string): boolean => {
    if (!isDemo) return false

    // 許可されたページかチェック
    const isAllowed = demoRestrictions.allowedPages.some(page => {
      if (page === '/consumables') {
        // 消耗品は一覧のみ許可、orders と bulk-movement は禁止
        return pathname === '/consumables' ||
               (pathname.startsWith('/consumables/') &&
                !pathname.startsWith('/consumables/orders') &&
                !pathname.startsWith('/consumables/bulk-movement') &&
                pathname.match(/^\/consumables\/[a-f0-9-]+$/)) // 詳細ページのみ許可
      }
      if (page === '/tools') {
        // 道具は一覧と詳細のみ許可、編集・削除・追加は禁止
        return pathname === '/tools' ||
               (pathname.startsWith('/tools/') &&
                pathname.match(/^\/tools\/[a-f0-9-]+$/)) // 詳細ページのみ許可
      }
      return pathname.startsWith(page)
    })

    return !isAllowed
  }

  const getDaysRemaining = (): number => {
    if (!expiresAt) return 0
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getHoursRemaining = (): number => {
    if (!expiresAt) return 0
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60))
  }

  return {
    isDemo,
    expiresAt,
    checkLimit,
    isFeatureDisabled,
    isPageRestricted,
    getDaysRemaining,
    getHoursRemaining,
    restrictions: demoRestrictions
  }
}
