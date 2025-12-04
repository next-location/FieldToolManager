'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganizationSettings } from './actions'
import { WarehouseHierarchySettings } from './WarehouseHierarchySettings'

type Organization = {
  id: string
  name: string
  require_qr_scan_on_movement: boolean
  require_qr_scan_on_return: boolean
  require_approval_for_loss: boolean
  enable_monthly_inventory_reminder: boolean
  enable_site_closure_checklist: boolean
  consumable_movement_tracking: 'quantity' | 'simple' | 'none'
  qr_print_size: number
}

type OrganizationSettings = {
  organization_id: string
  enable_low_stock_alert: boolean
} | null

type WarehouseTemplate = {
  id: string
  level: number
  label: string
  is_active: boolean
  display_order: number
}

export function OrganizationSettingsForm({
  organization,
  organizationSettings,
  warehouseTemplates,
}: {
  organization: Organization
  organizationSettings: OrganizationSettings
  warehouseTemplates: WarehouseTemplate[]
}) {
  const [settings, setSettings] = useState({
    require_qr_scan_on_movement: organization.require_qr_scan_on_movement,
    require_qr_scan_on_return: organization.require_qr_scan_on_return,
    require_approval_for_loss: organization.require_approval_for_loss,
    enable_monthly_inventory_reminder:
      organization.enable_monthly_inventory_reminder,
    enable_site_closure_checklist: organization.enable_site_closure_checklist,
    consumable_movement_tracking: organization.consumable_movement_tracking,
    qr_print_size: organization.qr_print_size || 25,
    enable_low_stock_alert: organizationSettings?.enable_low_stock_alert ?? true,
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
                id="enable_low_stock_alert"
                name="enable_low_stock_alert"
                type="checkbox"
                checked={settings.enable_low_stock_alert}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    enable_low_stock_alert: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="enable_low_stock_alert"
                className="font-medium text-gray-700"
              >
                低在庫アラート通知
              </label>
              <p className="text-gray-500">
                道具・消耗品の在庫が最小在庫数を下回った場合に通知します。各道具の最小在庫数は個別に設定できます。
              </p>
            </div>
          </div>

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

      {/* QRコード印刷設定 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          QRコード印刷設定
        </h3>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            QRコードの印刷サイズ
          </label>
          <p className="text-sm text-gray-500 mb-4">
            一括印刷時のQRコードのサイズを選択します。道具に貼り付けるシールのサイズに合わせて選んでください。
          </p>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="qr_size_20"
                  name="qr_print_size"
                  type="radio"
                  checked={settings.qr_print_size === 20}
                  onChange={() =>
                    setSettings({ ...settings, qr_print_size: 20 })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="qr_size_20" className="font-medium text-gray-700">
                  2cm × 2cm（小）
                </label>
                <p className="text-gray-500">
                  小型の道具や限られたスペースに最適。最小推奨サイズ。
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="qr_size_25"
                  name="qr_print_size"
                  type="radio"
                  checked={settings.qr_print_size === 25}
                  onChange={() =>
                    setSettings({ ...settings, qr_print_size: 25 })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="qr_size_25" className="font-medium text-gray-700">
                  2.5cm × 2.5cm（推奨）
                </label>
                <p className="text-gray-500">
                  読み取りやすさとサイズのバランスが良い標準サイズ。
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="qr_size_30"
                  name="qr_print_size"
                  type="radio"
                  checked={settings.qr_print_size === 30}
                  onChange={() =>
                    setSettings({ ...settings, qr_print_size: 30 })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="qr_size_30" className="font-medium text-gray-700">
                  3cm × 3cm（中）
                </label>
                <p className="text-gray-500">
                  より読み取りやすいサイズ。
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="qr_size_50"
                  name="qr_print_size"
                  type="radio"
                  checked={settings.qr_print_size === 50}
                  onChange={() =>
                    setSettings({ ...settings, qr_print_size: 50 })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="qr_size_50" className="font-medium text-gray-700">
                  5cm × 5cm（大）
                </label>
                <p className="text-gray-500">
                  大型の重機や目立たせたい場合に最適。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 消耗品管理設定 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          消耗品管理設定
        </h3>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            消耗品の移動記録方式
          </label>
          <p className="text-sm text-gray-500 mb-4">
            軍手、テープなどの消耗品を移動する際の記録方法を選択します。個別管理の道具（電動ドリルなど）には適用されません。
          </p>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consumable_tracking_quantity"
                  name="consumable_movement_tracking"
                  type="radio"
                  checked={settings.consumable_movement_tracking === 'quantity'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      consumable_movement_tracking: 'quantity',
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="consumable_tracking_quantity"
                  className="font-medium text-gray-700"
                >
                  パターンA: 数量を記録する（推奨）
                </label>
                <p className="text-gray-500">
                  例：「軍手10個を持ち出し」と記録。在庫管理が正確になります。
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consumable_tracking_simple"
                  name="consumable_movement_tracking"
                  type="radio"
                  checked={settings.consumable_movement_tracking === 'simple'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      consumable_movement_tracking: 'simple',
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="consumable_tracking_simple"
                  className="font-medium text-gray-700"
                >
                  パターンB: 移動のみ記録（数量なし）
                </label>
                <p className="text-gray-500">
                  例：「軍手を持ち出した」と記録。数量は記録しません。
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consumable_tracking_none"
                  name="consumable_movement_tracking"
                  type="radio"
                  checked={settings.consumable_movement_tracking === 'none'}
                  onChange={() =>
                    setSettings({
                      ...settings,
                      consumable_movement_tracking: 'none',
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="consumable_tracking_none"
                  className="font-medium text-gray-700"
                >
                  パターンC: 移動記録なし（在庫のみ管理）
                </label>
                <p className="text-gray-500">
                  移動履歴は記録せず、在庫数だけを管理します。
                </p>
              </div>
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

      {/* 倉庫階層設定 */}
      <WarehouseHierarchySettings
        organizationId={organization.id}
        initialTemplates={warehouseTemplates}
      />
    </form>
  )
}
