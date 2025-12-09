'use client';

import { useState, useEffect } from 'react';

interface ContractData {
  id: string;
  organization_id: string;
  plan_type: string;
  user_limit: number;
  has_asset_package: boolean;
  has_dx_efficiency_package: boolean;
  status: string;
  base_monthly_fee: number;
  package_monthly_fee: number;
  total_monthly_fee: number;
}

interface ContractManagementProps {
  organizationId: string;
  isSuperAdmin: boolean;
}

export function ContractManagement({ organizationId, isSuperAdmin }: ContractManagementProps) {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    plan_type: 'standard',
    user_limit: 30,
    has_asset_package: true,
    has_dx_efficiency_package: true,
    status: 'active',
  });

  useEffect(() => {
    fetchContract();
  }, [organizationId]);

  const fetchContract = async () => {
    try {
      const res = await fetch('/api/organization/contract');
      if (res.ok) {
        const data = await res.json();
        const orgContract = data.contracts?.find((c: any) => c.organization_id === organizationId);
        if (orgContract) {
          setContract(orgContract);
          setFormData({
            plan_type: orgContract.plan_type || 'standard',
            user_limit: orgContract.user_limit || 30,
            has_asset_package: orgContract.has_asset_package || false,
            has_dx_efficiency_package: orgContract.has_dx_efficiency_package || false,
            status: orgContract.status || 'active',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setMessage({ type: 'error', text: 'スーパーアドミン権限が必要です' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/organization/contract', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          ...formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setContract(data.contract);
        setIsEditing(false);
        setMessage({ type: 'success', text: '契約情報を更新しました' });
        // ページをリロードして機能制御を更新
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '更新に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateFees = () => {
    const baseFees: Record<string, number> = {
      start: 18000,
      standard: 45000,
      business: 70000,
      pro: 120000,
    };

    const baseFee = baseFees[formData.plan_type] || 18000;

    let packageFee = 0;
    if (formData.has_asset_package && formData.has_dx_efficiency_package) {
      packageFee = 32000; // フル機能統合パック（割引）
    } else if (formData.has_asset_package) {
      packageFee = 18000;
    } else if (formData.has_dx_efficiency_package) {
      packageFee = 22000;
    }

    return {
      baseFee,
      packageFee,
      total: baseFee + packageFee,
    };
  };

  const fees = calculateFees();

  if (!isSuperAdmin) {
    // 一般管理者は閲覧のみ
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">契約情報</h2>
        {contract ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">プラン:</span>
              <span className="font-medium">{contract.plan_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ユーザー上限:</span>
              <span className="font-medium">{contract.user_limit}名</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">現場資産パック:</span>
              <span className="font-medium">{contract.has_asset_package ? '✓ 有効' : '無効'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">現場DXパック:</span>
              <span className="font-medium">{contract.has_dx_efficiency_package ? '✓ 有効' : '無効'}</span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="text-gray-600">月額料金:</span>
              <span className="font-bold text-lg">¥{contract.total_monthly_fee?.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">契約情報がありません</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">契約管理（スーパーアドミン専用）</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            編集
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* プランタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              プラン
            </label>
            <select
              value={formData.plan_type}
              onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="start">スタート（~10名）</option>
              <option value="standard">スタンダード（11~30名）</option>
              <option value="business">ビジネス（31~50名）</option>
              <option value="pro">プロ（51~100名）</option>
            </select>
          </div>

          {/* ユーザー上限 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ユーザー上限
            </label>
            <input
              type="number"
              value={formData.user_limit}
              onChange={(e) => setFormData({ ...formData, user_limit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="1000"
            />
          </div>

          {/* パッケージ選択 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              機能パッケージ
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.has_asset_package}
                onChange={(e) => setFormData({ ...formData, has_asset_package: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">
                現場資産パック（道具・重機・消耗品管理） - ¥18,000/月
              </span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.has_dx_efficiency_package}
                onChange={(e) => setFormData({ ...formData, has_dx_efficiency_package: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">
                現場DX業務効率化パック（出退勤・作業報告書・帳票） - ¥22,000/月
              </span>
            </label>
            {formData.has_asset_package && formData.has_dx_efficiency_package && (
              <p className="text-xs text-green-600 ml-6">
                ✓ フル機能統合パック割引適用（¥32,000/月）
              </p>
            )}
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="trial">トライアル</option>
              <option value="active">有効</option>
              <option value="suspended">一時停止</option>
              <option value="cancelled">キャンセル</option>
              <option value="expired">期限切れ</option>
            </select>
          </div>

          {/* 料金サマリー */}
          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <h3 className="font-medium text-gray-900 mb-2">料金サマリー</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">基本料金:</span>
              <span>¥{fees.baseFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">パッケージ料金:</span>
              <span>¥{fees.packageFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300">
              <span>月額合計:</span>
              <span className="text-blue-600">¥{fees.total.toLocaleString()}</span>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                fetchContract();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">プラン:</span>
            <span className="font-medium">{contract?.plan_type || 'なし'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ユーザー上限:</span>
            <span className="font-medium">{contract?.user_limit || 0}名</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">現場資産パック:</span>
            <span className={contract?.has_asset_package ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {contract?.has_asset_package ? '✓ 有効' : '無効'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">現場DXパック:</span>
            <span className={contract?.has_dx_efficiency_package ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {contract?.has_dx_efficiency_package ? '✓ 有効' : '無効'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ステータス:</span>
            <span className={`font-medium ${contract?.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
              {contract?.status || 'なし'}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t">
            <span className="text-gray-600">月額料金:</span>
            <span className="font-bold text-lg text-blue-600">
              ¥{contract?.total_monthly_fee?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
