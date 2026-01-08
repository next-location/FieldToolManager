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
    getDaysRemaining,
    getHoursRemaining,
    restrictions: demoRestrictions
  }
}
