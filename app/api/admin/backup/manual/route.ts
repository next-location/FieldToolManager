import { NextRequest, NextResponse } from 'next/server'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession()

    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // バックアップディレクトリを作成
    const backupDir = path.join(process.cwd(), 'backups')
    await fs.mkdir(backupDir, { recursive: true })

    // バックアップファイル名（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `backup_${timestamp}.sql`)

    // データベース接続情報を環境変数から取得
    const dbHost = 'localhost'
    const dbPort = '54322'
    const dbName = 'postgres'
    const dbUser = 'postgres'
    const dbPassword = 'postgres'

    // pg_dumpコマンドを実行
    const command = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${backupFile}`

    console.log('[BACKUP] Starting manual backup...')
    console.log('[BACKUP] Backup file:', backupFile)

    await execAsync(command)

    // バックアップファイルのサイズを取得
    const stats = await fs.stat(backupFile)
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log('[BACKUP] Backup completed. Size:', fileSizeInMB, 'MB')

    // バックアップ履歴をデータベースに記録
    await supabase.from('database_backups').insert({
      backup_type: 'manual',
      file_path: backupFile,
      file_size_mb: parseFloat(fileSizeInMB),
      created_by: session.id,
      status: 'completed',
    })

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      admin_id: session.id,
      action: 'MANUAL_BACKUP',
      resource_type: 'database',
      resource_id: 'manual_backup',
      details: {
        file_path: backupFile,
        file_size_mb: fileSizeInMB,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'バックアップが完了しました',
      file_size_mb: fileSizeInMB,
    })
  } catch (error: any) {
    console.error('[BACKUP] Error:', error)

    // エラーログを記録
    const session = await getSuperAdminSession()
    if (session) {
      await supabase.from('super_admin_logs').insert({
        admin_id: session.id,
        action: 'MANUAL_BACKUP_FAILED',
        resource_type: 'database',
        resource_id: 'manual_backup',
        details: {
          error: error.message,
        },
      })
    }

    return NextResponse.json(
      { error: 'バックアップの作成に失敗しました: ' + error.message },
      { status: 500 }
    )
  }
}
