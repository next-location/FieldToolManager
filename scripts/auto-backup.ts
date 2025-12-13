#!/usr/bin/env ts-node

/**
 * 自動データベースバックアップスクリプト
 *
 * 使い方:
 *   npm run backup
 *
 * または crontab に登録:
 *   # 毎日午前2時に実行
 *   0 2 * * * cd /path/to/FieldToolManager && npm run backup
 *
 *   # 1時間ごとに実行
 *   0 * * * * cd /path/to/FieldToolManager && npm run backup
 *
 *   # 毎週日曜日午前2時に実行
 *   0 2 * * 0 cd /path/to/FieldToolManager && npm run backup
 */

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

async function getSystemSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'system_config')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data?.value || {}
}

async function createBackup() {
  try {
    console.log('[AUTO-BACKUP] Starting automatic backup...')

    // システム設定を取得
    const settings = await getSystemSettings()

    if (!settings.backupEnabled) {
      console.log('[AUTO-BACKUP] Automatic backup is disabled in system settings')
      return
    }

    // バックアップディレクトリを作成
    const backupDir = path.join(process.cwd(), 'backups')
    await fs.mkdir(backupDir, { recursive: true })

    // バックアップファイル名（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `backup_${timestamp}.sql`)

    // データベース接続情報
    const dbHost = 'localhost'
    const dbPort = '54322'
    const dbName = 'postgres'
    const dbUser = 'postgres'
    const dbPassword = 'postgres'

    // pg_dumpコマンドを実行
    const command = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${backupFile}`

    console.log('[AUTO-BACKUP] Executing pg_dump...')
    await execAsync(command)

    // バックアップファイルのサイズを取得
    const stats = await fs.stat(backupFile)
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log('[AUTO-BACKUP] Backup completed. Size:', fileSizeInMB, 'MB')
    console.log('[AUTO-BACKUP] File:', backupFile)

    // バックアップ履歴をデータベースに記録
    await supabase.from('database_backups').insert({
      backup_type: 'automatic',
      file_path: backupFile,
      file_size_mb: parseFloat(fileSizeInMB),
      status: 'completed',
    })

    // 古いバックアップを削除
    await cleanupOldBackups(settings.dataRetentionDays || 365)

    console.log('[AUTO-BACKUP] Process completed successfully')
  } catch (error: any) {
    console.error('[AUTO-BACKUP] Error:', error.message)

    // エラーをデータベースに記録
    await supabase.from('database_backups').insert({
      backup_type: 'automatic',
      file_path: '',
      status: 'failed',
      error_message: error.message,
    })

    process.exit(1)
  }
}

async function cleanupOldBackups(retentionDays: number) {
  try {
    console.log(`[AUTO-BACKUP] Cleaning up backups older than ${retentionDays} days...`)

    // 保持期限を計算
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // 古いバックアップレコードを取得
    const { data: oldBackups, error } = await supabase
      .from('database_backups')
      .select('id, file_path')
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', 'completed')

    if (error) {
      throw error
    }

    if (!oldBackups || oldBackups.length === 0) {
      console.log('[AUTO-BACKUP] No old backups to clean up')
      return
    }

    console.log(`[AUTO-BACKUP] Found ${oldBackups.length} old backups to delete`)

    // ファイルを削除
    for (const backup of oldBackups) {
      try {
        await fs.unlink(backup.file_path)
        console.log(`[AUTO-BACKUP] Deleted file: ${backup.file_path}`)
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`[AUTO-BACKUP] Failed to delete file ${backup.file_path}:`, err.message)
        }
      }
    }

    // データベースレコードを削除
    const { error: deleteError } = await supabase
      .from('database_backups')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('status', 'completed')

    if (deleteError) {
      throw deleteError
    }

    console.log(`[AUTO-BACKUP] Cleanup completed: ${oldBackups.length} backups removed`)
  } catch (error: any) {
    console.error('[AUTO-BACKUP] Cleanup error:', error.message)
    // クリーンアップエラーはプロセスを終了させない
  }
}

// スクリプト実行
createBackup()
