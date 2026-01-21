import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Vercel Cron Job用エンドポイント
 * 全組織の自動バックアップを実行
 */
export async function GET(request: Request) {
  try {
    // Vercel Cronからの呼び出しかを検証
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 全組織のリストを取得
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .is('deleted_at', null)

    if (orgError) {
      console.error('Failed to fetch organizations:', orgError)
      throw orgError
    }

    const results = []

    // 各組織ごとにバックアップを実行
    for (const org of organizations || []) {
      try {
        console.log(`[Cron] Starting backup for organization: ${org.name} (${org.id})`)

        // 組織のadminユーザーを取得（created_by用）
        const { data: adminUser } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', org.id)
          .eq('role', 'admin')
          .is('deleted_at', null)
          .limit(1)
          .single()

        if (!adminUser) {
          console.warn(`[Cron] No admin user found for organization ${org.id}`)
          results.push({
            organization_id: org.id,
            status: 'skipped',
            reason: 'No admin user found',
          })
          continue
        }

        // バックアップAPI（内部呼び出し）のロジックを実行
        const backupResult = await executeBackup(supabase, org.id, adminUser.id)

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          status: 'success',
          file_path: backupResult.file_path,
          file_size_mb: backupResult.file_size_mb,
        })

        console.log(
          `[Cron] Backup completed for organization: ${org.name} (${backupResult.file_size_mb}MB)`
        )
      } catch (orgError) {
        console.error(`[Cron] Backup failed for organization ${org.id}:`, orgError)

        // エラーログを記録
        await supabase.from('organization_backups').insert({
          organization_id: org.id,
          backup_type: 'full',
          file_path: '',
          status: 'failed',
          error_message: orgError instanceof Error ? orgError.message : 'Unknown error',
          created_by: null,
        })

        results.push({
          organization_id: org.id,
          organization_name: org.name,
          status: 'failed',
          error: orgError instanceof Error ? orgError.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      executed_at: new Date().toISOString(),
      total_organizations: organizations?.length || 0,
      results,
    })
  } catch (error) {
    console.error('[Cron] Backup job failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Cron job failed',
      },
      { status: 500 }
    )
  }
}

/**
 * 組織単位のバックアップ実行ロジック
 * （/api/organization/backup/fullと同等の処理）
 */
async function executeBackup(supabase: any, organizationId: string, createdBy: string) {
  const pako = require('pako')

  // 全データ取得
  const [tools, consumables, staff, sites, movements, equipment, clients] = await Promise.all([
    supabase
      .from('tools')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('consumables')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase.from('users').select('*').eq('organization_id', organizationId).is('deleted_at', null),
    supabase.from('sites').select('*').eq('organization_id', organizationId).is('deleted_at', null),
    supabase
      .from('tool_movements')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('equipment')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
  ])

  // バックアップデータ構造
  const backup = {
    version: '1.0',
    organization_id: organizationId,
    backup_date: new Date().toISOString(),
    data: {
      tools: tools.data || [],
      consumables: consumables.data || [],
      staff: staff.data || [],
      sites: sites.data || [],
      movements: movements.data || [],
      equipment: equipment.data || [],
      clients: clients.data || [],
    },
  }

  // JSON → gzip圧縮
  const jsonString = JSON.stringify(backup)
  const compressed = pako.gzip(jsonString)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `backups/${organizationId}/${timestamp}_full_backup.json.gz`

  // 環境分岐：本番環境ではSupabase Storage、ローカルではファイルシステム
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // 本番環境: Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('organization-backups')
      .upload(fileName, compressed, {
        contentType: 'application/gzip',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw uploadError
    }
  } else {
    // ローカル環境: ファイルシステムに保存（テスト用）
    const fs = require('fs').promises
    const path = require('path')

    const backupDir = path.join(process.cwd(), 'backups', organizationId)
    await fs.mkdir(backupDir, { recursive: true })
    await fs.writeFile(path.join(backupDir, fileName.split('/').pop()!), compressed)

    console.log(`[DEV] Backup saved locally: ${fileName}`)
  }

  // バックアップ履歴を記録
  await supabase.from('organization_backups').insert({
    organization_id: organizationId,
    backup_type: 'full',
    file_path: fileName,
    file_size_mb: (compressed.byteLength / (1024 * 1024)).toFixed(2),
    status: 'completed',
    created_by: createdBy,
  })

  return {
    file_path: fileName,
    file_size_mb: (compressed.byteLength / (1024 * 1024)).toFixed(2),
  }
}
