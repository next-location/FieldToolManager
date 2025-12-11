'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OrganizationFormProps {
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    name: string;
    subdomain: string;
    phone: string;
    fax: string;
    postal_code: string;
    address: string;
    billing_contact_name: string;
    billing_contact_email: string;
    billing_contact_phone: string;
    billing_address: string;
    is_active: boolean;
  };
}

export default function OrganizationForm({ mode, initialData }: OrganizationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [useSameAddress, setUseSameAddress] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<{
    checked: boolean;
    isDuplicate: boolean;
    similarOrganizations: any[];
    confirmed: boolean;
  }>({ checked: false, isDuplicate: false, similarOrganizations: [], confirmed: false });
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    subdomain: initialData?.subdomain || '',
    phone: initialData?.phone || '',
    fax: initialData?.fax || '',
    postal_code: initialData?.postal_code || '',
    address: initialData?.address || '',
    billing_contact_name: initialData?.billing_contact_name || '',
    billing_contact_email: initialData?.billing_contact_email || '',
    billing_contact_phone: initialData?.billing_contact_phone || '',
    billing_address: initialData?.billing_address || '',
    is_active: initialData?.is_active ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // 組織名、住所、電話番号が変更されたら重複チェックをリセット
    if (name === 'name' || name === 'address' || name === 'phone') {
      setDuplicateCheckResult({ checked: false, isDuplicate: false, similarOrganizations: [], confirmed: false });
    }
  };

  // 重複チェック処理
  const handleDuplicateCheck = async () => {
    if (!formData.name.trim()) {
      alert('組織名を入力してください');
      return;
    }

    setIsCheckingDuplicate(true);
    try {
      const response = await fetch('/api/admin/organizations/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          excludeId: initialData?.id, // 編集時は自分自身を除外
        }),
      });

      if (!response.ok) {
        throw new Error('重複チェックに失敗しました');
      }

      const data = await response.json();
      setDuplicateCheckResult({
        checked: true,
        isDuplicate: data.isDuplicate,
        similarOrganizations: data.similarOrganizations || [],
        confirmed: false,
      });

      // 重複がなければ自動的に確認済みにする
      if (!data.isDuplicate) {
        setDuplicateCheckResult(prev => ({ ...prev, confirmed: true }));
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
      alert('重複チェックに失敗しました');
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // 郵便番号から住所を自動入力
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    // ハイフンを除去
    const cleanedPostalCode = postalCode.replace(/-/g, '');

    if (cleanedPostalCode.length !== 7) {
      return;
    }

    setIsLoadingAddress(true);
    try {
      // 郵便番号検索API（zipcloud）を使用
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedPostalCode}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const address = `${result.address1}${result.address2}${result.address3}`;
        setFormData(prev => ({
          ...prev,
          address: address
        }));
      } else {
        alert('郵便番号に該当する住所が見つかりませんでした');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      alert('住所の取得に失敗しました');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // 郵便番号入力時の処理
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, postal_code: value }));

    // ハイフンを除去して7桁になったら自動検索
    const cleanedValue = value.replace(/-/g, '');
    if (cleanedValue.length === 7) {
      fetchAddressFromPostalCode(value);
    }
  };

  // 請求先住所を連絡先住所と同じにする
  const handleUseSameAddress = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        billing_address: prev.address
      }));
    }
  };

  // 連絡先住所が変更されたら請求先住所も更新（同上の場合）
  useEffect(() => {
    if (useSameAddress) {
      setFormData(prev => ({
        ...prev,
        billing_address: prev.address
      }));
    }
  }, [formData.address, useSameAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 新規作成時は重複チェックが必須
    if (mode === 'create' && !duplicateCheckResult.checked) {
      alert('重複チェックを実行してください');
      return;
    }

    if (mode === 'create' && duplicateCheckResult.isDuplicate && !duplicateCheckResult.confirmed) {
      alert('類似する組織が見つかりました。確認してから登録してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === 'create'
        ? '/api/admin/organizations'
        : `/api/admin/organizations/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '組織の保存に失敗しました');
      }

      const data = await response.json();
      alert(mode === 'create' ? '組織を作成しました' : '組織を更新しました');
      router.push(`/admin/organizations/${data.organization.id}`);
    } catch (error) {
      console.error('Error saving organization:', error);
      alert(error instanceof Error ? error.message : '組織の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="space-y-6">
        {/* 基本情報セクション */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                組織名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="株式会社〇〇"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                サブドメイン <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subdomain"
                value={formData.subdomain}
                onChange={handleChange}
                required
                pattern="[a-z0-9-]+"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="example-company"
              />
              <p className="text-xs text-gray-500 mt-1">半角英数字とハイフンのみ</p>
            </div>
          </div>
        </div>

        {/* 連絡先情報セクション */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">連絡先情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="03-1234-5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                FAX
              </label>
              <input
                type="tel"
                name="fax"
                value={formData.fax}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="03-1234-5679"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                郵便番号
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handlePostalCodeChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123-4567"
                />
                {isLoadingAddress && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">7桁入力で自動的に住所を検索します</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                住所
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="東京都〇〇区〇〇 1-2-3"
              />
            </div>
          </div>
        </div>

        {/* 請求情報セクション */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">請求情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                請求担当者名
              </label>
              <input
                type="text"
                name="billing_contact_name"
                value={formData.billing_contact_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="山田太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                請求担当者メール
              </label>
              <input
                type="email"
                name="billing_contact_email"
                value={formData.billing_contact_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="billing@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                請求担当者電話
              </label>
              <input
                type="tel"
                name="billing_contact_phone"
                value={formData.billing_contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="03-1234-5678"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                請求先住所
              </label>
              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useSameAddress}
                    onChange={(e) => handleUseSameAddress(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">連絡先住所と同じ</span>
                </label>
              </div>
              <input
                type="text"
                name="billing_address"
                value={formData.billing_address}
                onChange={handleChange}
                disabled={useSameAddress}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  useSameAddress ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="東京都〇〇区〇〇 1-2-3"
              />
            </div>
          </div>
        </div>

        {/* ステータス */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">ステータス</h2>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">有効</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">無効にすると、この組織はシステムにアクセスできなくなります</p>
        </div>

        {/* 重複チェックセクション（新規作成時のみ） */}
        {mode === 'create' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">⚠️ 重複チェック（必須）</h2>
            <p className="text-sm text-gray-700 mb-3">
              組織名と住所を入力したら、既存組織との重複がないか必ずチェックしてください
            </p>

            <button
              type="button"
              onClick={handleDuplicateCheck}
              disabled={isCheckingDuplicate || !formData.name.trim()}
              className="px-6 py-2.5 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCheckingDuplicate ? '確認中...' : '重複チェック'}
            </button>

            {/* 重複チェック結果 */}
            {duplicateCheckResult.checked && (
              <div className="mt-4">
                {!duplicateCheckResult.isDuplicate ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-semibold">✓ 重複する組織は見つかりませんでした</p>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 font-semibold mb-3">⚠️ 類似する組織が見つかりました</p>
                    <div className="space-y-2 mb-4">
                      {duplicateCheckResult.similarOrganizations.map((org) => (
                        <div key={org.id} className="bg-white border border-red-200 rounded p-3">
                          <p className="font-semibold text-gray-900">{org.name}</p>
                          {org.subdomain && <p className="text-xs text-gray-600 font-mono">{org.subdomain}</p>}
                          {org.address && <p className="text-sm text-gray-700 mt-1">📍 {org.address}</p>}
                          {org.phone && <p className="text-sm text-gray-700">📞 {org.phone}</p>}
                          {org.billing_contact_name && (
                            <p className="text-sm text-gray-700">👤 {org.billing_contact_name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={duplicateCheckResult.confirmed}
                        onChange={(e) => setDuplicateCheckResult(prev => ({ ...prev, confirmed: e.target.checked }))}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm font-semibold text-gray-900">
                        上記を確認し、異なる組織であることを確認しました
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '保存中...' : mode === 'create' ? '作成' : '更新'}
          </button>
        </div>
      </div>
    </form>
  );
}
