'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ManufacturerForm from './ManufacturerForm';

interface Manufacturer {
  id: string;
  name: string;
  country: string | null;
  website_url: string | null;
  support_phone: string | null;
  notes: string | null;
  is_system_common: boolean;
  created_at: string;
}

interface ManufacturersListProps {
  manufacturers: Manufacturer[];
}

export default function ManufacturersList({ manufacturers: initialManufacturers }: ManufacturersListProps) {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingManufacturer, setDeletingManufacturer] = useState<Manufacturer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);

  // ひらがな・カタカナ変換関数
  const normalizeString = (str: string) => {
    // カタカナをひらがなに変換
    const toHiragana = str.replace(/[\u30a1-\u30f6]/g, (match) => {
      const chr = match.charCodeAt(0) - 0x60;
      return String.fromCharCode(chr);
    });
    // ひらがなをカタカナに変換
    const toKatakana = str.replace(/[\u3041-\u3096]/g, (match) => {
      const chr = match.charCodeAt(0) + 0x60;
      return String.fromCharCode(chr);
    });
    return { original: str.toLowerCase(), hiragana: toHiragana.toLowerCase(), katakana: toKatakana.toLowerCase() };
  };

  // 検索フィルタ（ひらがな・カタカナ両方対応）
  const filteredManufacturers = manufacturers.filter((mfr) => {
    const searchNorm = normalizeString(search);
    const nameNorm = normalizeString(mfr.name);
    const countryNorm = mfr.country ? normalizeString(mfr.country) : null;

    return (
      nameNorm.original.includes(searchNorm.original) ||
      nameNorm.hiragana.includes(searchNorm.original) ||
      nameNorm.katakana.includes(searchNorm.original) ||
      nameNorm.original.includes(searchNorm.hiragana) ||
      nameNorm.original.includes(searchNorm.katakana) ||
      (countryNorm && (
        countryNorm.original.includes(searchNorm.original) ||
        countryNorm.hiragana.includes(searchNorm.original) ||
        countryNorm.katakana.includes(searchNorm.original)
      ))
    );
  });

  // システム共通メーカーと組織メーカーに分類
  const systemManufacturers = filteredManufacturers.filter((m) => m.is_system_common);
  const customManufacturers = filteredManufacturers.filter((m) => !m.is_system_common);

  const handleDelete = async () => {
    if (!deletingManufacturer) return;

    try {
      const response = await fetch(`/api/admin/manufacturers/${deletingManufacturer.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('メーカーを削除しました');
        setShowDeleteModal(false);
        setDeletingManufacturer(null);
        // 本番環境でキャッシュをクリアして即座に反映
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`削除に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting manufacturer:', error);
      alert('削除中にエラーが発生しました');
    }
  };

  return (
    <div>
      {/* ヘッダーアクション */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 検索 */}
          <input
            type="text"
            placeholder="メーカー名、国で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
          />
        </div>

        {/* 新規登録ボタン */}
        <button
          onClick={() => {
            setEditingManufacturer(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新規登録
        </button>
      </div>

      {/* システム共通メーカー */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">システム共通</span>
          {systemManufacturers.length}件
        </h2>

        {systemManufacturers.length === 0 ? (
          <p className="text-gray-500 text-sm">システム共通メーカーはありません</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemManufacturers.map((mfr) => (
              <div
                key={mfr.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-gray-900">{mfr.name}</h3>
                  {mfr.country && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{mfr.country}</span>
                  )}
                </div>
                {mfr.website_url && (
                  <p className="text-xs text-blue-600 truncate mb-1">
                    <a href={mfr.website_url} target="_blank" rel="noopener noreferrer">
                      {mfr.website_url}
                    </a>
                  </p>
                )}
                {mfr.support_phone && (
                  <p className="text-xs text-gray-600 mb-2">📞 {mfr.support_phone}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditingManufacturer(mfr);
                      setShowForm(true);
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => {
                      setDeletingManufacturer(mfr);
                      setShowDeleteModal(true);
                    }}
                    className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 組織独自メーカー（未実装） */}
      {customManufacturers.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">組織独自</span>
            {customManufacturers.length}件
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customManufacturers.map((mfr) => (
              <div
                key={mfr.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <h3 className="text-base font-bold text-gray-900 mb-2">{mfr.name}</h3>
                {mfr.country && <p className="text-xs text-gray-600">国: {mfr.country}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && deletingManufacturer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">メーカーを削除しますか？</h3>
            <p className="text-gray-600 mb-2">
              「{deletingManufacturer.name}」を削除してもよろしいですか？
            </p>
            <p className="text-sm text-red-600 mb-6">
              ⚠️ このメーカーを使用している道具がある場合、影響が出る可能性があります。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingManufacturer(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 作成/編集フォームモーダル */}
      {showForm && (
        <ManufacturerForm
          manufacturer={editingManufacturer}
          onClose={() => {
            setShowForm(false);
            setEditingManufacturer(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingManufacturer(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
