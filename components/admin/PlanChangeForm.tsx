'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Package {
  id: string;
  name: string;
  package_key: string;
  monthly_fee: number;
}

interface ContractPackage {
  package_id: string;
  packages: Package;
}

interface Contract {
  id: string;
  contract_number: string;
  billing_cycle: 'monthly' | 'annual';
  start_date: string;
  end_date: string;
}

interface PlanChangeFormProps {
  contract: Contract;
  currentPackages: ContractPackage[];
  availablePackages: Package[];
  currentPlan: string;
  currentBaseFee: number;
  currentUserLimit: number;
}

// 基本プラン定義
const basePlans = [
  { key: 'start', name: 'スタート', baseFee: 10000, userLimit: 10 },
  { key: 'standard', name: 'スタンダード', baseFee: 20000, userLimit: 30 },
  { key: 'business', name: 'ビジネス', baseFee: 40000, userLimit: 100 },
  { key: 'pro', name: 'プロ', baseFee: 80000, userLimit: 300 },
  { key: 'enterprise', name: 'エンタープライズ', baseFee: 150000, userLimit: 1000 },
];

export default function PlanChangeForm({
  contract,
  currentPackages,
  availablePackages,
  currentPlan,
  currentBaseFee,
  currentUserLimit
}: PlanChangeFormProps) {
  const router = useRouter();

  // 基本プラン選択
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [newBaseFee, setNewBaseFee] = useState(currentBaseFee);
  const [newUserLimit, setNewUserLimit] = useState(currentUserLimit);

  // 機能パックは1つのみ選択（ラジオボタン）
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    currentPackages.length > 0 ? currentPackages[0].package_id : ''
  );
  const [changeDate, setChangeDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialFee, setInitialFee] = useState<string>('0'); // 初期費用（手動入力）
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');

  // 基本プラン変更時の処理
  const handlePlanChange = (planKey: string) => {
    const plan = basePlans.find(p => p.key === planKey);
    if (plan) {
      setSelectedPlan(planKey);
      setNewBaseFee(plan.baseFee);
      setNewUserLimit(plan.userLimit);
      setPreview(null); // プレビューをリセット
    }
  };

  // プレビュー計算
  const handlePreview = async () => {
    setIsLoading(true);
    setError('');
    setPreview(null);

    try {
      const response = await fetch('/api/admin/contracts/change-plan/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contract.id,
          new_plan: selectedPlan,
          new_base_fee: newBaseFee,
          new_user_limit: newUserLimit,
          new_package_ids: [selectedPackageId],
          change_date: changeDate,
          initial_fee: parseFloat(initialFee) || 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'プレビューの取得に失敗しました');
      }

      setPreview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // プラン変更実行
  const handleSubmit = async () => {
    if (!preview) {
      setError('先にプレビューを確認してください');
      return;
    }

    if (!confirm('プラン変更を実行しますか?')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/contracts/${contract.id}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_plan: selectedPlan,
          new_base_fee: newBaseFee,
          new_user_limit: newUserLimit,
          new_package_ids: [selectedPackageId],
          change_date: changeDate,
          initial_fee: parseFloat(initialFee) || 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'プラン変更に失敗しました');
      }

      alert('プラン変更が完了しました');
      router.push(`/admin/contracts/${contract.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // パッケージ選択（ラジオボタン）
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    setPreview(null); // プレビューをリセット
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* 現在のプラン */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">現在のプラン</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">基本プラン</p>
              <p className="text-sm font-medium text-gray-900 mt-2">
                {basePlans.find(p => p.key === currentPlan)?.name || currentPlan}
              </p>
              <p className="text-xs text-gray-500">
                ¥{currentBaseFee.toLocaleString()}/月・{currentUserLimit}名まで
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">機能パック</p>
              <div className="mt-2 space-y-1">
                {currentPackages.map(cp => (
                  <div key={cp.package_id} className="text-sm font-medium text-gray-900">
                    {cp.packages.name}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">請求サイクル</p>
              <p className="text-sm font-medium text-gray-900 mt-2">
                {contract.billing_cycle === 'monthly' ? '月払い' : '年払い'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 基本プラン選択 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">変更後の基本プラン</h2>
        <div className="space-y-3">
          {basePlans.map(plan => (
            <label
              key={plan.key}
              className={`flex items-center p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedPlan === plan.key ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="base_plan"
                checked={selectedPlan === plan.key}
                onChange={() => handlePlanChange(plan.key)}
                className="h-4 w-4 text-blue-600"
              />
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900">{plan.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({plan.userLimit}名まで)</span>
                  </div>
                  <span className="text-gray-900 font-semibold">¥{plan.baseFee.toLocaleString()}/月</span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 機能パック選択 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">変更後の機能パック</h2>
        <div className="space-y-3">
          {availablePackages.map(pkg => (
            <label
              key={pkg.id}
              className={`flex items-center p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedPackageId === pkg.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="package"
                checked={selectedPackageId === pkg.id}
                onChange={() => handlePackageSelect(pkg.id)}
                className="h-4 w-4 text-blue-600"
              />
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{pkg.name}</span>
                  <span className="text-gray-900 font-semibold">¥{pkg.monthly_fee.toLocaleString()}/月</span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 変更日 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          変更日
        </label>
        <input
          type="date"
          value={changeDate}
          onChange={(e) => {
            setChangeDate(e.target.value);
            setPreview(null);
          }}
          min={new Date().toISOString().split('T')[0]}
          className="border rounded-lg px-3 py-2"
        />
        <p className="text-sm text-gray-500 mt-1">
          ※変更日以降の請求に反映されます
        </p>
      </div>

      {/* 初期費用（アップグレード時のみ） */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          初期費用（任意）
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">¥</span>
          <input
            type="number"
            value={initialFee}
            onChange={(e) => {
              setInitialFee(e.target.value);
              setPreview(null);
            }}
            min="0"
            step="1000"
            className="border rounded-lg pl-8 pr-3 py-2 w-64"
            placeholder="0"
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          ※アップグレードに伴い初期費用が発生する場合のみ入力してください
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* プレビュー表示 */}
      {preview && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">日割り計算プレビュー</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">変更前月額料金</p>
                <p className="text-xs text-gray-500">
                  基本料金: ¥{preview.old_base_fee?.toLocaleString() || '0'}<br/>
                  機能パック: ¥{preview.old_package_fee?.toLocaleString() || '0'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  ¥{preview.old_monthly_fee.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">変更後月額料金</p>
                <p className="text-xs text-gray-500">
                  基本料金: ¥{preview.new_base_fee?.toLocaleString() || '0'}<br/>
                  機能パック: ¥{preview.new_package_fee?.toLocaleString() || '0'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  ¥{preview.new_monthly_fee.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">日割り計算詳細</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>計算期間</span>
                  <span className="font-medium">
                    {preview.billing_period_start} 〜 {preview.billing_period_end}
                    （{preview.proration_days}日間）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>旧プラン日割り額</span>
                  <span className="font-medium text-red-600">
                    -¥{Math.abs(preview.old_plan_prorated).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>新プラン日割り額</span>
                  <span className="font-medium text-green-600">
                    +¥{preview.new_plan_prorated.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>日割り差額</span>
                  <span className={preview.prorated_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {preview.prorated_difference >= 0 ? '+' : ''}¥{preview.prorated_difference.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {preview.initial_fee > 0 && (
              <div className="flex justify-between py-2 border-t">
                <span className="text-sm text-gray-600">初期費用</span>
                <span className="font-medium text-orange-600">
                  +¥{preview.initial_fee.toLocaleString()}
                </span>
              </div>
            )}

            <div className="bg-white rounded p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">小計</span>
                <span className="font-medium">¥{preview.subtotal?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">消費税（10%）</span>
                <span className="font-medium">¥{preview.tax_amount?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">次回請求額（税込）</span>
                <span className="text-2xl font-bold text-gray-900">
                  ¥{preview.total_with_tax?.toLocaleString() || '0'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                = 新プラン月額料金 {preview.prorated_difference >= 0 ? '+' : ''} 日割り差額
                {preview.initial_fee > 0 ? ' + 初期費用' : ''} + 消費税
              </p>
            </div>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          disabled={isLoading}
        >
          キャンセル
        </button>
        <button
          onClick={handlePreview}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading || !selectedPackageId}
        >
          {isLoading ? '計算中...' : 'プレビュー'}
        </button>
        {preview && (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            disabled={isLoading}
          >
            プラン変更を実行
          </button>
        )}
      </div>
    </div>
  );
}
