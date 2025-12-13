'use client'

import { useState, useEffect } from 'react'
import { Database, Shield, Download } from 'lucide-react'

export default function SystemSettingsForm() {
  const [settings, setSettings] = useState({
    // データベース設定
    backupEnabled: true,
    backupFrequency: 'daily',
    dataRetentionDays: 365,

    // セキュリティ設定
    maintenanceMode: false,
  })

  const [loading, setLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [backupSuccess, setBackupSuccess] = useState(false)

  // 設定を読み込み
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/system')
      if (response.ok) {
        const data = await response.json()
        setSettings({ ...settings, ...data })
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      const response = await fetch('/api/admin/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('設定の保存に失敗しました')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || '設定の保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleManualBackup = async () => {
    setBackupLoading(true)
    setBackupSuccess(false)
    setError('')

    try {
      const response = await fetch('/api/admin/backup/manual', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('バックアップの作成に失敗しました')
      }

      setBackupSuccess(true)
      setTimeout(() => setBackupSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'バックアップの作成に失敗しました')
    } finally {
      setBackupLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 成功メッセージ */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">設定を保存しました</p>
        </div>
      )}

      {/* バックアップ成功メッセージ */}
      {backupSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">バックアップを作成しました</p>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* データベース設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">データベース設定</h2>
        </div>

        <div className="space-y-4">
          {/* 手動バックアップボタン */}
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  手動バックアップ
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  現時点のデータベースをバックアップします
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualBackup}
                disabled={backupLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {backupLoading ? 'バックアップ中...' : '今すぐバックアップ'}
              </button>
            </div>
          </div>

          {/* 自動バックアップ設定 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                自動バックアップ
              </label>
              <p className="text-xs text-gray-500 mt-1">
                データベースの定期的なバックアップを有効化
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, backupEnabled: !settings.backupEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.backupEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.backupEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.backupEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  バックアップ頻度
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hourly">1時間ごと</option>
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  データ保持期間（日数）
                </label>
                <input
                  type="number"
                  value={settings.dataRetentionDays}
                  onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                  min="30"
                  max="3650"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  バックアップデータを保持する期間（30〜3650日）
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* セキュリティ設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">セキュリティ設定</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                メンテナンスモード
              </label>
              <p className="text-xs text-gray-500 mt-1">
                システム管理者以外のログインを無効にします
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          リセット
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </form>
  )
}
