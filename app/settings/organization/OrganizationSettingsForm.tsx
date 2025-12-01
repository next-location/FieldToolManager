'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganizationSettings } from './actions'

type Organization = {
  id: string
  name: string
  require_qr_scan_on_movement: boolean
  require_qr_scan_on_return: boolean
  require_approval_for_loss: boolean
  enable_monthly_inventory_reminder: boolean
  enable_site_closure_checklist: boolean
}

export function OrganizationSettingsForm({
  organization,
}: {
  organization: Organization
}) {
  const [settings, setSettings] = useState({
    require_qr_scan_on_movement: organization.require_qr_scan_on_movement,
    require_qr_scan_on_return: organization.require_qr_scan_on_return,
    require_approval_for_loss: organization.require_approval_for_loss,
    enable_monthly_inventory_reminder:
      organization.enable_monthly_inventory_reminder,
    enable_site_closure_checklist: organization.enable_site_closure_checklist,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const result = await updateOrganizationSettings(
        organization.id,
        settings
      )

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: '設定を更新しました' })
        router.refresh()
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '更新に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
      {message && (
        <div
          className={`rounded-md p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* 道具移動時の設定 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          道具移動時の設定
        </h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="require_qr_scan_on_movement"
                name="require_qr_scan_on_movement"
                type="checkbox"
                checked={settings.require_qr_scan_on_movement}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    require_qr_scan_on_movement: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="require_qr_scan_on_movement"
                className="font-medium text-gray-700"
              >
                道具移動時にQRスキャン必須（厳密モード）
              </label>
              <p className="text-gray-500">
                道具を移動する際、実物のQRコードをスキャンして確認することを必須にします。データと現物の不一致を防ぎます。
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="require_qr_scan_on_return"
                name="require_qr_scan_on_return"
                type="checkbox"
                checked={settings.require_qr_scan_on_return}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    require_qr_scan_on_return: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="require_qr_scan_on_return"
                className="font-medium text-gray-700"
              >
                道具返却時のみQRスキャン必須
              </label>
              <p className="text-gray-500">
                持ち出し時は簡易モード、返却時のみQRスキャンで確認します。返却忘れを防ぎたい場合に有効です。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 紛失・承認設定 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          紛失・承認設定
        </h3>
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="require_approval_for_loss"
              name="require_approval_for_loss"
              type="checkbox"
              checked={settings.require_approval_for_loss}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  require_approval_for_loss: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label
              htmlFor="require_approval_for_loss"
              className="font-medium text-gray-700"
            >
              紛失報告時に承認フロー必須
            </label>
            <p className="text-gray-500">
              道具の紛失報告時、管理者の承認を必須にします。誤操作を防ぎます。
            </p>
          </div>
        </div>
      </div>

      {/* 通知・リマインド設定 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          通知・リマインド設定
        </h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="enable_monthly_inventory_reminder"
                name="enable_monthly_inventory_reminder"
                type="checkbox"
                checked={settings.enable_monthly_inventory_reminder}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enable_monthly_inventory_reminder: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="enable_monthly_inventory_reminder"
                className="font-medium text-gray-700"
              >
                月次棚卸しリマインド通知
              </label>
              <p className="text-gray-500">
                毎月、在庫確認のリマインド通知を送信します。
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="enable_site_closure_checklist"
                name="enable_site_closure_checklist"
                type="checkbox"
                checked={settings.enable_site_closure_checklist}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enable_site_closure_checklist: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="enable_site_closure_checklist"
                className="font-medium text-gray-700"
              >
                現場終了時に道具返却チェックリスト表示
              </label>
              <p className="text-gray-500">
                現場が完了になる際、その現場に残っている道具の返却チェックリストを表示します。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </form>
  )
}
