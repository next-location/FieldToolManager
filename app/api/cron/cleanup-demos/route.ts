import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Jobからのみ実行可能
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 1. 期限切れのデモアカウントを取得
    const { data: expiredDemos, error: fetchError } = await supabase
      .from('demo_requests')
      .select('*')
      .eq('status', 'approved')
      .lt('demo_expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Failed to fetch expired demos:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!expiredDemos || expiredDemos.length === 0) {
      return NextResponse.json({
        message: 'No expired demos found',
        deleted: 0
      })
    }

    let deletedCount = 0
    const errors: string[] = []

    // 2. 各デモアカウントを削除
    for (const demo of expiredDemos) {
      try {
        // ユーザー削除（Supabase Auth）
        if (demo.demo_user_id) {
          const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
            demo.demo_user_id
          )
          if (deleteUserError) {
            console.error(`Failed to delete user ${demo.demo_user_id}:`, deleteUserError)
            errors.push(`User ${demo.demo_user_id}: ${deleteUserError.message}`)
          }
        }

        // 会社データ削除（CASCADE設定により関連データも削除）
        if (demo.demo_company_id) {
          const { error: deleteCompanyError } = await supabase
            .from('companies')
            .delete()
            .eq('id', demo.demo_company_id)

          if (deleteCompanyError) {
            console.error(`Failed to delete company ${demo.demo_company_id}:`, deleteCompanyError)
            errors.push(`Company ${demo.demo_company_id}: ${deleteCompanyError.message}`)
          }
        }

        // ステータス更新
        const { error: updateError } = await supabase
          .from('demo_requests')
          .update({ status: 'expired' })
          .eq('id', demo.id)

        if (updateError) {
          console.error(`Failed to update demo request ${demo.id}:`, updateError)
          errors.push(`Request ${demo.id}: ${updateError.message}`)
        } else {
          deletedCount++
          console.log(`Successfully deleted demo account: ${demo.demo_email}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to delete demo ${demo.id}:`, error)
        errors.push(`Demo ${demo.id}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      message: `Cleanup completed`,
      deleted: deletedCount,
      total: expiredDemos.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Cleanup cron error:', error)
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    )
  }
}
