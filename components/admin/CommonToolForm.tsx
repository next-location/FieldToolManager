'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
}

interface Manufacturer {
  id: string;
  name: string;
  country?: string;
}

interface CommonToolFormProps {
  categories: Category[];
  manufacturers: Manufacturer[];
  tool?: any;
  isEdit?: boolean;
}

export default function CommonToolForm({ categories, manufacturers, tool, isEdit = false }: CommonToolFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    category_id: tool?.category_id || '',
    model_number: tool?.model_number || '',
    manufacturer_id: tool?.manufacturer_id || '',
    management_type: tool?.management_type || 'individual',
    unit: tool?.unit || '個',
    purchase_price: tool?.purchase_price || '',
    image_url: tool?.image_url || '',
    notes: tool?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('道具名を入力してください');
      return;
    }

    if (!formData.management_type) {
      alert('管理タイプを選択してください');
      return;
    }

    setLoading(true);

    try {
      const url = isEdit ? `/api/admin/tools/common/${tool.id}` : '/api/admin/tools/common';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(isEdit ? '共通道具を更新しました' : '共通道具を登録しました');
        router.push('/admin/tools/common');
        router.refresh();
      } else {
        const error = await response.json();
        alert(`${isEdit ? '更新' : '登録'}に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`${isEdit ? '更新' : '登録'}中にエラーが発生しました`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="space-y-6">
        {/* 道具名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            道具名 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例: 電動ドライバー"
            required
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">カテゴリを選択（任意）</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* メーカー */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">メーカー</label>
          <select
            value={formData.manufacturer_id}
            onChange={(e) => setFormData({ ...formData, manufacturer_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">メーカーを選択（任意）</option>
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {manufacturer.name}
                {manufacturer.country && ` (${manufacturer.country})`}
              </option>
            ))}
          </select>
        </div>

        {/* 型番 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">型番</label>
          <input
            type="text"
            value={formData.model_number}
            onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="例: XYZ-100"
          />
        </div>

        {/* 管理タイプ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            管理タイプ <span className="text-red-600">*</span>
          </label>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="management_type"
                value="individual"
                checked={formData.management_type === 'individual'}
                onChange={(e) => setFormData({ ...formData, management_type: e.target.value })}
                className="mr-2"
              />
              <span className="text-sm">個別管理（シリアル番号で管理）</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="management_type"
                value="consumable"
                checked={formData.management_type === 'consumable'}
                onChange={(e) => setFormData({ ...formData, management_type: e.target.value })}
                className="mr-2"
              />
              <span className="text-sm">消耗品（数量で管理）</span>
            </label>
          </div>
        </div>

        {/* 単位 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">単位</label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="例: 個、本、箱"
          />
        </div>

        {/* 標準購入価格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            標準購入価格（参考値）
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
            <input
              type="number"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例: 15000"
              min="0"
              step="1"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            各組織が実際に購入する際の参考価格です
          </p>
        </div>

        {/* 画像URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">画像URL</label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="この道具に関する補足情報や注意事項など"
          />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200">
        <Link
          href="/admin/tools/common"
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (isEdit ? '更新中...' : '登録中...') : (isEdit ? '更新' : '登録')}
        </button>
      </div>
    </form>
  );
}
