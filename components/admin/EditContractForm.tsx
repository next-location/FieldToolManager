'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  address?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
  billing_address?: string;
}

interface PackageFeature {
  id: string;
  feature_name: string;
  feature_key?: string;
  is_header: boolean;
  display_order: number;
}

interface Package {
  id: string;
  name: string;
  description: string;
  monthly_fee: number;
  package_key: string;
  is_active: boolean;
  display_order: number;
  features: PackageFeature[];
}

interface ContractPackage {
  package_id: string;
  packages: {
    id: string;
    name: string;
    package_key: string;
  };
}

interface Contract {
  id: string;
  organization_id: string;
  contract_number: string;
  plan: string;
  user_count: number;
  billing_cycle: string;
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  trial_end_date?: string;
  billing_day: number;
  initial_setup_fee: number;
  initial_data_registration_fee?: number;
  initial_onsite_fee?: number;
  initial_training_fee?: number;
  initial_other_fee?: number;
  total_initial_fee: number;
  initial_discount: number;
  monthly_base_fee?: number;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
  billing_address?: string;
  notes?: string;
  organizations: Organization;
}

interface EditContractFormProps {
  contract: Contract;
  contractPackages: ContractPackage[];
  packages: Package[];
}

const PLAN_PRICING = {
  start: { userLimit: 10, monthlyFee: 18000, annualFee: 194400, setupFee: 10000 },
  standard: { userLimit: 30, monthlyFee: 45000, annualFee: 486000, setupFee: 28000 },
  business: { userLimit: 50, monthlyFee: 70000, annualFee: 756000, setupFee: 45000 },
  pro: { userLimit: 100, monthlyFee: 120000, annualFee: 1296000, setupFee: 80000 },
  enterprise: { userLimit: 101, monthlyFee: 0, annualFee: 0, setupFee: 0 },
};

export default function EditContractForm({ contract, contractPackages, packages }: EditContractFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 初期費用が1つでも入力されている場合はデフォルトで開く
  const hasInitialFees = !!(
    contract.initial_setup_fee ||
    contract.initial_data_registration_fee ||
    contract.initial_onsite_fee ||
    contract.initial_training_fee ||
    contract.initial_other_fee ||
    contract.initial_discount
  );
  const [showInitialFees, setShowInitialFees] = useState(hasInitialFees);

  const [formData, setFormData] = useState({
    contractType: contract.billing_cycle as 'monthly' | 'annual',
    plan: contract.plan as keyof typeof PLAN_PRICING,
    selectedPackageId: contractPackages[0]?.package_id || '',
    userLimit: contract.user_count,
    customBaseFee: contract.monthly_base_fee?.toString() || '',
    customUserLimit: contract.user_count > 100 ? contract.user_count.toString() : '',
    startDate: contract.start_date.split('T')[0],
    endDate: contract.end_date ? contract.end_date.split('T')[0] : '',
    autoRenew: contract.auto_renew,
    trialEndDate: contract.trial_end_date ? contract.trial_end_date.split('T')[0] : '',
    billingDay: contract.billing_day,
    initialSetupFee: contract.initial_setup_fee,
    initialDataRegistrationFee: contract.initial_data_registration_fee?.toString() || '',
    initialOnsiteFee: contract.initial_onsite_fee?.toString() || '',
    initialTrainingFee: contract.initial_training_fee?.toString() || '',
    initialOtherFee: contract.initial_other_fee?.toString() || '',
    initialDiscount: contract.initial_discount?.toString() || '',
    billingContactName: contract.billing_contact_name || contract.organizations.billing_contact_name || '',
    billingContactEmail: contract.billing_contact_email || contract.organizations.billing_contact_email || '',
    billingContactPhone: contract.billing_contact_phone || contract.organizations.billing_contact_phone || '',
    billingAddress: contract.billing_address || contract.organizations.billing_address || contract.organizations.address || '',
    notes: contract.notes || '',
  });

  // プラン変更時の処理
  useEffect(() => {
    if (formData.plan !== 'enterprise') {
      const pricing = PLAN_PRICING[formData.plan];
      setFormData(prev => ({
        ...prev,
        userLimit: pricing.userLimit,
        initialSetupFee: pricing.setupFee,
        customBaseFee: '',
        customUserLimit: '',
      }));
    }
  }, [formData.plan]);

  // 料金計算
  const selectedPackage = useMemo(() => {
    return packages.find(p => p.id === formData.selectedPackageId);
  }, [formData.selectedPackageId, packages]);

  const baseFee = useMemo(() => {
    if (formData.plan === 'enterprise') {
      return parseInt(formData.customBaseFee) || 0;
    }
    const pricing = PLAN_PRICING[formData.plan];
    return formData.contractType === 'annual' ? Math.floor(pricing.annualFee / 12) : pricing.monthlyFee;
  }, [formData.plan, formData.contractType, formData.customBaseFee]);

  const packageFee = useMemo(() => {
    return selectedPackage?.monthly_fee || 0;
  }, [selectedPackage]);

  const totalMonthlyFee = baseFee + packageFee;

  const totalInitialFee = useMemo(() => {
    const setup = formData.initialSetupFee || 0;
    const data = parseInt(formData.initialDataRegistrationFee) || 0;
    const onsite = parseInt(formData.initialOnsiteFee) || 0;
    const training = parseInt(formData.initialTrainingFee) || 0;
    const other = parseInt(formData.initialOtherFee) || 0;
    const discount = parseInt(formData.initialDiscount) || 0;
    return setup + data + onsite + training + other - discount;
  }, [formData.initialSetupFee, formData.initialDataRegistrationFee, formData.initialOnsiteFee, formData.initialTrainingFee, formData.initialOtherFee, formData.initialDiscount]);

  const discountValue = parseInt(formData.initialDiscount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_cycle: formData.contractType,
          plan: formData.plan,
          user_count: formData.plan === 'enterprise' ? parseInt(formData.customUserLimit) : formData.userLimit,
          monthly_base_fee: formData.plan === 'enterprise' ? parseInt(formData.customBaseFee) : null,
          base_monthly_fee: baseFee,
          package_monthly_fee: packageFee,
          total_monthly_fee: totalMonthlyFee,
          start_date: formData.startDate,
          end_date: formData.endDate || null,
          auto_renew: formData.autoRenew,
          trial_end_date: formData.trialEndDate || null,
          billing_day: formData.billingDay,
          initial_setup_fee: formData.initialSetupFee,
          initial_data_registration_fee: parseInt(formData.initialDataRegistrationFee) || 0,
          initial_onsite_fee: parseInt(formData.initialOnsiteFee) || 0,
          initial_training_fee: parseInt(formData.initialTrainingFee) || 0,
          initial_other_fee: parseInt(formData.initialOtherFee) || 0,
          initial_discount: parseInt(formData.initialDiscount) || 0,
          total_initial_fee: totalInitialFee,
          billing_contact_name: formData.billingContactName,
          billing_contact_email: formData.billingContactEmail,
          billing_contact_phone: formData.billingContactPhone,
          billing_address: formData.billingAddress,
          notes: formData.notes,
          package_id: formData.selectedPackageId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '契約の更新に失敗しました');
      }

      const result = await response.json();

      // 見積もりが削除された場合は自動的に再生成
      if (result.deleted_estimates > 0) {
        try {
          const estimateResponse = await fetch('/api/admin/invoices/generate-estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contract_id: contract.id }),
          });

          if (!estimateResponse.ok) {
            console.error('Failed to regenerate estimate after contract edit');
          } else {
            console.log('Estimate regenerated successfully after contract edit');
          }
        } catch (estimateError) {
          console.error('Error regenerating estimate:', estimateError);
        }
      }

      router.push(`/admin/contracts/${contract.id}`);
      router.refresh();
    } catch (err: any) {
      console.error('Error updating contract:', err);
      setError(err.message || '契約の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 組織情報（読み取り専用） */}
      <div className="bg-gray-50 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">組織情報</h2>
        <div className="space-y-2 text-sm">
          <div><span className="text-gray-600">組織名:</span> <span className="font-medium">{contract.organizations.name}</span></div>
          <div><span className="text-gray-600">サブドメイン:</span> <span className="font-medium">{contract.organizations.subdomain}</span></div>
          <div><span className="text-gray-600">契約番号:</span> <span className="font-mono font-medium">{contract.contract_number}</span></div>
        </div>
      </div>

      {/* プラン選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">プラン選択</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">契約タイプ</label>
            <select value={formData.contractType} onChange={(e) => setFormData({ ...formData, contractType: e.target.value as 'monthly' | 'annual' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]">
              <option value="monthly">月契約</option>
              <option value="annual">年契約（10%割引）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">プラン</label>
            <select value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value as keyof typeof PLAN_PRICING })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]">
              <option value="start">スタート（10名まで）</option>
              <option value="standard">スタンダード（30名まで）</option>
              <option value="business">ビジネス（50名まで）</option>
              <option value="pro">プロ（100名まで）</option>
              <option value="enterprise">エンタープライズ（カスタム）</option>
            </select>
          </div>
          {formData.plan === 'enterprise' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">月額基本料金（円）</label>
                <input type="number" required value={formData.customBaseFee} onChange={(e) => setFormData({ ...formData, customBaseFee: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ユーザー上限</label>
                <input type="number" required value={formData.customUserLimit} onChange={(e) => setFormData({ ...formData, customUserLimit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 機能パック選択 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">機能パック選択</h2>
        <div className="space-y-3">
          {packages.map((pkg) => (
            <label key={pkg.id} className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.selectedPackageId === pkg.id ? 'border-[#1E6FFF] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="package" value={pkg.id} checked={formData.selectedPackageId === pkg.id} onChange={(e) => setFormData({ ...formData, selectedPackageId: e.target.value })} className="mt-1 mr-3" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                  </div>
                  <span className="text-lg font-bold text-[#1E6FFF] ml-4">¥{pkg.monthly_fee.toLocaleString()}/月</span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 契約期間 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">契約期間</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">開始日</label>
            <input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">終了日（任意）</label>
            <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">請求日（毎月）</label>
            <select value={formData.billingDay} onChange={(e) => setFormData({ ...formData, billingDay: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}日</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <input type="checkbox" id="autoRenew" checked={formData.autoRenew} onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })} className="mr-2" />
          <label htmlFor="autoRenew" className="text-sm text-gray-700">自動更新</label>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">トライアル終了日（任意）</label>
          <input type="date" value={formData.trialEndDate} onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
        </div>
      </div>

      {/* 初期費用 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">初期費用</h2>
          <button type="button" onClick={() => setShowInitialFees(!showInitialFees)} className="text-sm text-[#1E6FFF] hover:underline">
            {showInitialFees ? '閉じる' : '詳細を表示'}
          </button>
        </div>
        {showInitialFees && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">初期設定費（円）</label>
              <input type="number" value={formData.initialSetupFee} onChange={(e) => setFormData({ ...formData, initialSetupFee: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">データ登録費（円）</label>
              <input type="number" value={formData.initialDataRegistrationFee} onChange={(e) => setFormData({ ...formData, initialDataRegistrationFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">オンサイト作業費（円）</label>
              <input type="number" value={formData.initialOnsiteFee} onChange={(e) => setFormData({ ...formData, initialOnsiteFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">研修費（円）</label>
              <input type="number" value={formData.initialTrainingFee} onChange={(e) => setFormData({ ...formData, initialTrainingFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">その他費用（円）</label>
              <input type="number" value={formData.initialOtherFee} onChange={(e) => setFormData({ ...formData, initialOtherFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">お値引き（円）</label>
              <input type="number" value={formData.initialDiscount} onChange={(e) => setFormData({ ...formData, initialDiscount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
            </div>
          </div>
        )}
      </div>

      {/* 請求先情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">請求先情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">担当者名</label>
            <input type="text" value={formData.billingContactName} onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
            <input type="email" value={formData.billingContactEmail} onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
            <input type="tel" value={formData.billingContactPhone} onChange={(e) => setFormData({ ...formData, billingContactPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">請求先住所</label>
            <textarea value={formData.billingAddress} onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
          </div>
        </div>
      </div>

      {/* 備考 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>
        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]" />
      </div>

      {/* 料金サマリー */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">料金サマリー</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-700">基本プラン料金:</span><span className="font-medium">¥{baseFee.toLocaleString()}/月</span></div>
          {packageFee > 0 && <div className="flex justify-between"><span className="text-gray-700">機能パック料金:</span><span className="font-medium">¥{packageFee.toLocaleString()}/月</span></div>}
          <div className="flex justify-between pt-2 border-t border-blue-300"><span className="font-semibold text-gray-900">月額合計:</span><span className="font-bold text-[#1E6FFF] text-lg">¥{totalMonthlyFee.toLocaleString()}</span></div>
          {formData.contractType === 'annual' && <p className="text-xs text-green-600">※ 年契約のため10%割引が適用されています</p>}
          {showInitialFees && (
            <>
              <div className="flex justify-between pt-2 border-t border-blue-300 mt-4"><span className="font-semibold text-gray-900">初期費用合計:</span><span className="font-bold text-orange-600 text-lg">¥{Math.max(0, totalInitialFee).toLocaleString()}</span></div>
              {discountValue > 0 && <p className="text-xs font-medium" style={{color: '#DC2626'}}>※ お値引き -¥{discountValue.toLocaleString()}が適用されています</p>}
            </>
          )}
        </div>
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">キャンセル</button>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-[#1E6FFF] text-white rounded-lg hover:bg-[#0D4FCC] disabled:bg-gray-400 transition-colors">{loading ? '更新中...' : '契約を更新'}</button>
      </div>
    </form>
  );
}
