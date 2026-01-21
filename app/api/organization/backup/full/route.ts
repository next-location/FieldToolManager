import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pako from 'pako' // gzip圧縮用

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 認証・権限チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 全データ取得
    const [tools, consumables, staff, sites, movements, equipment, clients] = await Promise.all([
      supabase
        .from('tools')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null),
      supabase
        .from('consumables')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null),
      supabase.from('users').select('*').eq('organization_id', userData.organization_id).is('deleted_at', null),
      supabase
        .from('sites')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null),
      supabase
        .from('tool_movements')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase
        .from('equipment')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null),
      supabase
        .from('clients')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null),
    ])

    // バックアップデータ構造
    const backup = {
      version: '1.0',
      organization_id: userData.organization_id,
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
    const fileName = `backups/${userData.organization_id}/${timestamp}_full_backup.json.gz`

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

      const backupDir = path.join(process.cwd(), 'backups', userData.organization_id)
      await fs.mkdir(backupDir, { recursive: true })
      await fs.writeFile(path.join(backupDir, fileName.split('/').pop()!), compressed)

      console.log(`[DEV] Backup saved locally: ${fileName}`)
    }

    // バックアップ履歴を記録
    await supabase.from('organization_backups').insert({
      organization_id: userData.organization_id,
      backup_type: 'full',
      file_path: fileName,
      file_size_mb: (compressed.byteLength / (1024 * 1024)).toFixed(2),
      status: 'completed',
      created_by: user.id,
    })

    return NextResponse.json({
      success: true,
      file_path: fileName,
      file_size_mb: (compressed.byteLength / (1024 * 1024)).toFixed(2),
      environment: isProduction ? 'production' : 'development',
    })
  } catch (error) {
    console.error('Backup error:', error)

    // エラーログを記録
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (userData) {
          await supabase.from('organization_backups').insert({
            organization_id: userData.organization_id,
            backup_type: 'full',
            file_path: '',
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            created_by: user.id,
          })
        }
      }
    } catch (logError) {
      console.error('Error logging failed backup:', logError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'バックアップに失敗しました' },
      { status: 500 }
    )
  }
}
