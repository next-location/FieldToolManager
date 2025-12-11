'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Manufacturer {
  id: string;
  name: string;
  country: string | null;
  website_url: string | null;
  support_phone: string | null;
  notes: string | null;
}

interface ManufacturerFormProps {
  manufacturer?: Manufacturer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManufacturerForm({ manufacturer, onClose, onSuccess }: ManufacturerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: manufacturer?.name || '',
    country: manufacturer?.country || '',
    website_url: manufacturer?.website_url || '',
    support_phone: manufacturer?.support_phone || '',
    notes: manufacturer?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert('メーカー名を入力してください');
      return;
    }

    setLoading(true);

    try {
      const url = manufacturer ? `/api/admin/manufacturers/${manufacturer.id}` : '/api/admin/manufacturers';
      const method = manufacturer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(manufacturer ? 'メーカーを更新しました' : 'メーカーを登録しました');
        onSuccess();
        router.refresh();
      } else {
        const error = await response.json();
        alert(`${manufacturer ? '更新' : '登録'}に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`${manufacturer ? '更新' : '登録'}中にエラーが発生しました`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {manufacturer ? 'メーカー編集' : 'メーカー新規登録'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メーカー名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メーカー名 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: マキタ"
              required
            />
          </div>

          {/* 国 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">国</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例: 日本"
            />
          </div>

          {/* ウェブサイトURL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ウェブサイトURL</label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>

          {/* サポート電話番号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">サポート電話番号</label>
            <input
              type="tel"
              value={formData.support_phone}
              onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例: 0120-123-456"
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="メーカーに関する補足情報"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (manufacturer ? '更新中...' : '登録中...') : (manufacturer ? '更新' : '登録')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
