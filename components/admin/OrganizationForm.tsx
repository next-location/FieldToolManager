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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123-4567"
              />
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
              <input
                type="text"
                name="billing_address"
                value={formData.billing_address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
