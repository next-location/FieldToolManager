'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { includesKana } from '@/lib/utils/kana';

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

interface NewContractFormProps {
  organizations: Organization[];
  packages: Package[];
  superAdminId: string;
}

// 料金体系（PRICING_STRATEGY.mdより）
const PLAN_PRICING = {
  start: { userLimit: 10, monthlyFee: 18000, annualFee: 194400, setupFee: 10000 },
  standard: { userLimit: 30, monthlyFee: 45000, annualFee: 486000, setupFee: 28000 },
  business: { userLimit: 50, monthlyFee: 70000, annualFee: 756000, setupFee: 45000 },
  pro: { userLimit: 100, monthlyFee: 120000, annualFee: 1296000, setupFee: 80000 },
};

export default function NewContractForm({ organizations, packages, superAdminId }: NewContractFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInitialFees, setShowInitialFees] = useState(false);

  // 組織検索用のstate
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState('');
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    organizationId: '',
    contractType: 'monthly' as 'monthly' | 'annual',
    plan: 'start' as keyof typeof PLAN_PRICING,
    selectedPackageId: '' as string,
    userLimit: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    autoRenew: true,
    trialEndDate: '',
    billingDay: new Date().getDate(), // 請求日（今日の日付をデフォルト）
    initialSetupFee: 10000,
    initialDataRegistrationFee: '',
    initialOnsiteFee: '',
    initialTrainingFee: '',
    initialOtherFee: '',
    initialDiscount: '',
    billingContactName: '',
    billingContactEmail: '',
    billingContactPhone: '',
    billingAddress: '',
    // 初期管理者情報（パスワードは契約完了時に自動生成）
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    notes: '',
  });

  // 組織検索フィルター（ひらがな・カタカナ相互変換対応）
  const filteredOrganizations = useMemo(() => {
    if (!orgSearchQuery.trim()) return organizations;

    return organizations.filter((org) => {
      return (
        includesKana(org.name, orgSearchQuery) ||
        includesKana(org.address || '', orgSearchQuery) ||
        includesKana(org.subdomain, orgSearchQuery)
      );
    });
  }, [orgSearchQuery, organizations]);

  // 組織選択時に請求情報と初期管理者情報を自動入力
  useEffect(() => {
    if (formData.organizationId) {
      const selectedOrg = organizations.find(org => org.id === formData.organizationId);
      if (selectedOrg) {
        setSelectedOrgName(`${selectedOrg.name} (${selectedOrg.subdomain})`);
        setFormData(prev => ({
          ...prev,
          // 請求情報
          billingContactName: selectedOrg.billing_contact_name || '',
          billingContactEmail: selectedOrg.billing_contact_email || '',
          billingContactPhone: selectedOrg.billing_contact_phone || '',
          billingAddress: selectedOrg.billing_address || '',
          // 初期管理者情報（組織の請求担当者情報を初期値として設定）
          adminName: selectedOrg.billing_contact_name || '',
          adminEmail: selectedOrg.billing_contact_email || '',
          adminPhone: selectedOrg.billing_contact_phone || '',
        }));
      }
    }
  }, [formData.organizationId, organizations]);

  // クリックアウトサイドでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
    };

    if (showOrgDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOrgDropdown]);

  const calculateFees = () => {
    const planConfig = PLAN_PRICING[formData.plan];
    const baseFee = planConfig.monthlyFee;

    // 選択されたパッケージの料金を計算
    let packageFee = 0;
    if (formData.selectedPackageId) {
      const pkg = packages.find(p => p.id === formData.selectedPackageId);
      if (pkg) {
        packageFee = pkg.monthly_fee;
      }
    }

    const totalMonthlyFee = baseFee + packageFee;
    const totalInitialFee = formData.initialSetupFee +
      (parseFloat(formData.initialDataRegistrationFee as string) || 0) +
      (parseFloat(formData.initialOnsiteFee as string) || 0) +
      (parseFloat(formData.initialTrainingFee as string) || 0) +
      (parseFloat(formData.initialOtherFee as string) || 0) -
      (parseFloat(formData.initialDiscount as string) || 0);
    return { baseFee, packageFee, totalMonthlyFee, totalInitialFee };
  };

  const { baseFee, packageFee, totalMonthlyFee, totalInitialFee } = calculateFees();

  const handlePlanChange = (plan: keyof typeof PLAN_PRICING) => {
    const planConfig = PLAN_PRICING[plan];
    setFormData({ ...formData, plan, userLimit: planConfig.userLimit, initialSetupFee: planConfig.setupFee });
  };

  const openPricingTable = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open('/admin/pricing-table', 'pricing', 'width=1000,height=800,scrollbars=yes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // CSRFトークンを取得
      const csrfResponse = await fetch('/api/admin/csrf');
      const { token: csrfToken } = await csrfResponse.json();

      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          initialDataRegistrationFee: parseFloat(formData.initialDataRegistrationFee as string) || 0,
          initialOnsiteFee: parseFloat(formData.initialOnsiteFee as string) || 0,
          initialTrainingFee: parseFloat(formData.initialTrainingFee as string) || 0,
          initialOtherFee: parseFloat(formData.initialOtherFee as string) || 0,
          initialDiscount: parseFloat(formData.initialDiscount as string) || 0,
          baseMonthlyFee: baseFee,
          packageMonthlyFee: packageFee,
          totalMonthlyFee,
          totalInitialFee: Math.max(0, totalInitialFee),
          createdBy: superAdminId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '契約作成に失敗しました');
      router.push('/admin/contracts');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const discountValue = parseFloat(formData.initialDiscount as string) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-sm text-red-800">{error}</p></div>}
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">契約組織</h2>
        <div className="relative" ref={orgDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">組織 <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={selectedOrgName || orgSearchQuery}
            onChange={(e) => {
              setOrgSearchQuery(e.target.value);
              setSelectedOrgName('');
              setFormData({ ...formData, organizationId: '' });
              setShowOrgDropdown(true);
            }}
            onFocus={() => setShowOrgDropdown(true)}
            placeholder="組織名または住所で検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"
          />
          <p className="text-xs text-gray-500 mt-1">
            組織名・住所・サブドメインで検索できます（ひらがな・カタカナ対応）
          </p>

          {/* ドロップダウンリスト */}
          {showOrgDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredOrganizations.length > 0 ? (
                filteredOrganizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, organizationId: org.id });
                      setSelectedOrgName(`${org.name} (${org.subdomain})`);
                      setOrgSearchQuery('');
                      setShowOrgDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      <span className="font-mono">{org.subdomain}</span>
                      {org.address && <span className="ml-2">• {org.address}</span>}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  検索結果がありません
                </div>
              )}
            </div>
          )}

          {/* 選択済み組織の表示 */}
          {formData.organizationId && selectedOrgName && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-900">選択済み: {selectedOrgName}</div>
                {organizations.find(o => o.id === formData.organizationId)?.address && (
                  <div className="text-xs text-blue-700 mt-0.5">
                    {organizations.find(o => o.id === formData.organizationId)?.address}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, organizationId: '' });
                  setSelectedOrgName('');
                  setOrgSearchQuery('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                変更
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">プラン・機能設定</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">契約タイプ <span className="text-red-500">*</span></label>
            <select value={formData.contractType} onChange={(e) => setFormData({ ...formData, contractType: e.target.value as 'monthly' | 'annual' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]">
              <option value="monthly">月契約</option>
              <option value="annual">年契約（10%割引）</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">基本プラン <span className="text-red-500">*</span></label>
            <select value={formData.plan} onChange={(e) => handlePlanChange(e.target.value as keyof typeof PLAN_PRICING)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]">
              <option value="start">スタート（~10名）</option>
              <option value="standard">スタンダード（~30名）</option>
              <option value="business">ビジネス（~50名）</option>
              <option value="pro">プロ（~100名）</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">ユーザー上限数</label>
          <input type="number" value={formData.userLimit} onChange={(e) => setFormData({ ...formData, userLimit: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">機能パック（1つ選択）</label>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <label key={pkg.id} className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="packageSelect"
                  checked={formData.selectedPackageId === pkg.id}
                  onChange={() => {
                    setFormData({
                      ...formData,
                      selectedPackageId: pkg.id
                    });
                  }}
                  className="mt-1 h-4 w-4 text-[#1E6FFF] focus:ring-[#1E6FFF] border-gray-300"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">
                    {pkg.name}（¥{pkg.monthly_fee.toLocaleString()}/月）
                  </span>
                  <p className="text-xs text-gray-500">{pkg.description}</p>
                </div>
              </label>
            ))}
          </div>
          {packages.length === 0 && (
            <p className="text-sm text-gray-500">パッケージが登録されていません</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">契約期間</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">契約開始日 <span className="text-red-500">*</span></label>
            <input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">契約終了日（任意）</label>
            <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">請求日（毎月） <span className="text-red-500">*</span></label>
            <select
              required
              value={formData.billingDay}
              onChange={(e) => setFormData({ ...formData, billingDay: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}日</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">毎月この日に請求書が自動生成されます</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">トライアル終了日（任意）</label>
            <input type="date" value={formData.trialEndDate} onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
            <p className="text-xs text-gray-500 mt-1">トライアル期間中は料金が発生しません</p>
          </div>
          <div className="flex items-center pt-8">
            <input type="checkbox" id="autoRenew" checked={formData.autoRenew} onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })} className="h-4 w-4 text-[#1E6FFF] focus:ring-[#1E6FFF] border-gray-300 rounded"/>
            <label htmlFor="autoRenew" className="ml-2 text-sm text-gray-700">自動更新する（{formData.contractType === 'monthly' ? '1ヶ月' : '1年'}ごと）</label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">初期費用</h2>
            <a href="#" onClick={openPricingTable} className="text-xs text-[#1E6FFF] hover:text-[#0D4FCC] underline">費用表を見る</a>
          </div>
          <button type="button" onClick={() => setShowInitialFees(!showInitialFees)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{showInitialFees ? '初期費用を隠す' : '初期費用を入力する'}</button>
        </div>
        {showInitialFees && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">基本設定費（自動設定）</label>
                <input type="text" value={`¥${formData.initialSetupFee.toLocaleString()}`} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">データ登録費</label>
                <input type="number" min="0" step="1000" value={formData.initialDataRegistrationFee} onChange={(e) => setFormData({ ...formData, initialDataRegistrationFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
                <p className="text-xs text-gray-500 mt-1">~100件:¥20,000 ~500件:¥50,000 ~1,000件:¥80,000</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">オンサイト作業費</label>
                <input type="number" min="0" step="1000" value={formData.initialOnsiteFee} onChange={(e) => setFormData({ ...formData, initialOnsiteFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
                <p className="text-xs text-gray-500 mt-1">時給¥3,000 × 作業時間</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">研修費</label>
                <input type="number" min="0" step="1000" value={formData.initialTrainingFee} onChange={(e) => setFormData({ ...formData, initialTrainingFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
                <p className="text-xs text-gray-500 mt-1">管理者研修:¥30,000~ 現場研修:¥5,000~</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">その他費用</label>
                <input type="number" min="0" step="1000" value={formData.initialOtherFee} onChange={(e) => setFormData({ ...formData, initialOtherFee: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
                <p className="text-xs text-gray-500 mt-1">交通費・宿泊費など</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">お値引き</label>
                <input type="number" min="0" step="1000" value={formData.initialDiscount} onChange={(e) => setFormData({ ...formData, initialDiscount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
                <p className="text-xs text-gray-500 mt-1">キャンペーンや特別割引</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">請求情報</h2>
        <p className="text-xs text-gray-600 mb-4">※ 組織管理で設定された情報が自動で入力されます。必要に応じて変更してください。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">請求担当者名</label>
            <input type="text" value={formData.billingContactName} onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">請求担当者メール</label>
            <input type="email" value={formData.billingContactEmail} onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">請求担当者電話番号</label>
            <input type="tel" value={formData.billingContactPhone} onChange={(e) => setFormData({ ...formData, billingContactPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">請求先住所</label>
          <textarea value={formData.billingAddress} onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">初期管理者情報</h2>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>📧 契約完了時の自動処理：</strong><br />
            • 初期管理者アカウントが自動作成されます<br />
            • セキュアなパスワードが自動生成されます<br />
            • ウェルカムメールが送信されます（ログイン情報含む）
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">管理者氏名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.adminName}
              onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
              placeholder="山田 太郎"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">管理者メールアドレス <span className="text-red-500">*</span></label>
            <input
              type="email"
              required
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"
            />
            <p className="text-xs text-gray-500 mt-1">このアドレスにウェルカムメールが送信されます</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">管理者電話番号</label>
            <input
              type="tel"
              value={formData.adminPhone}
              onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
              placeholder="090-1234-5678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>
        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} placeholder="契約に関する特記事項があれば記入してください" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6FFF]"/>
      </div>

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

      <div className="flex justify-end space-x-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">キャンセル</button>
        <button type="submit" disabled={loading} className="px-6 py-2 bg-[#1E6FFF] text-white rounded-lg hover:bg-[#0D4FCC] disabled:bg-gray-400 transition-colors">{loading ? '作成中...' : '契約を作成'}</button>
      </div>
    </form>
  );
}
