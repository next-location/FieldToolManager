'use client'

import type { OnboardingFormData } from '@/types/organization'

interface Step2Props {
  formData: OnboardingFormData
  updateFormData: (updates: Partial<OnboardingFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2OperationSettings({
  formData,
  updateFormData,
  onNext,
  onBack,
}: Step2Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-gray-800">ステップ 2/4: 運用設定</h2>
      <p className="mb-6 text-gray-600">システムの運用ルールを設定してください</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 在庫管理設定 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">在庫管理設定</h3>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enableLowStockAlert}
                onChange={(e) => updateFormData({ enableLowStockAlert: e.target.checked })}
                className="mr-2 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">低在庫アラートを有効にする</span>
            </label>
            <p className="ml-7 mt-1 text-xs text-gray-500">
              在庫が最小レベルを下回った場合に通知します
            </p>
          </div>

          {formData.enableLowStockAlert && (
            <div className="ml-7">
              <p className="text-xs text-gray-500">
                ℹ️ 低在庫アラートの閾値と単位は、道具・消耗品を登録する際に個別に設定します。<br />
                （例：手袋は5個、ペンキは2L、接着剤は500ml など）
              </p>
            </div>
          )}
        </div>

        {/* 承認フロー設定 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">承認フロー設定</h3>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requireCheckoutApproval}
                onChange={(e) => updateFormData({ requireCheckoutApproval: e.target.checked })}
                className="mr-2 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                道具の貸出時に承認を必要とする
              </span>
            </label>
            <p className="ml-7 mt-1 text-xs text-gray-500">
              リーダーまたは管理者の承認が必要になります
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requireReturnApproval}
                onChange={(e) => updateFormData({ requireReturnApproval: e.target.checked })}
                className="mr-2 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                道具の返却時に承認を必要とする
              </span>
            </label>
            <p className="ml-7 mt-1 text-xs text-gray-500">
              返却時の状態確認を強制できます
            </p>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            💡 これらの設定は後から変更可能です。まずは基本的な設定で開始し、運用しながら最適化することをお勧めします。
          </p>
        </div>

        {/* ボタン */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            戻る
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            次へ
          </button>
        </div>
      </form>
    </div>
  )
}
