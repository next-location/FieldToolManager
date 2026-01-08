import { createClient } from '@/lib/supabase/server'

export class DemoAnalytics {
  // デモログイン記録
  static async trackLogin(demoRequestId: string) {
    const supabase = await createClient()

    try {
      // ログイン回数をインクリメント
      await supabase.rpc('increment_demo_login', {
        request_id: demoRequestId
      })

      // アクティビティログに記録
      await supabase.from('demo_activity_logs').insert({
        demo_request_id: demoRequestId,
        action: 'login',
        created_at: new Date().toISOString()
      })

      // Google Analytics（フロントエンド側で実行）
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'demo_login', {
          demo_id: demoRequestId
        })
      }
    } catch (error) {
      console.error('Failed to track demo login:', error)
    }
  }

  // 機能使用記録
  static async trackFeatureUse(demoRequestId: string, featureName: string, details?: any) {
    const supabase = await createClient()

    try {
      await supabase.from('demo_activity_logs').insert({
        demo_request_id: demoRequestId,
        action: 'feature_use',
        feature_name: featureName,
        details: details || {},
        created_at: new Date().toISOString()
      })

      // Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'demo_feature_use', {
          feature_name: featureName,
          demo_id: demoRequestId
        })
      }
    } catch (error) {
      console.error('Failed to track feature use:', error)
    }
  }

  // エクスポート試行記録（ブロック対象）
  static async trackExportAttempt(demoRequestId: string, exportType: string) {
    const supabase = await createClient()

    try {
      await supabase.from('demo_activity_logs').insert({
        demo_request_id: demoRequestId,
        action: 'export_attempt',
        feature_name: exportType,
        details: { blocked: true },
        created_at: new Date().toISOString()
      })

      // アラート送信（営業フォローのチャンス）
      await fetch('/api/analytics/export-attempt', {
        method: 'POST',
        body: JSON.stringify({ demoRequestId, exportType })
      })
    } catch (error) {
      console.error('Failed to track export attempt:', error)
    }
  }

  // ページビュー記録
  static async trackPageView(demoRequestId: string, pagePath: string) {
    const supabase = await createClient()

    try {
      await supabase.from('demo_activity_logs').insert({
        demo_request_id: demoRequestId,
        action: 'page_view',
        feature_name: pagePath,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to track page view:', error)
    }
  }
}
