'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UnregisteredManufacturer {
  name: string;
  count: number;
  organizations: string[];
}

export default function UnregisteredManufacturersList() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<UnregisteredManufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnifyModal, setShowUnifyModal] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState<UnregisteredManufacturer | null>(null);
  const [targetManufacturerName, setTargetManufacturerName] = useState('');
  const [unifying, setUnifying] = useState(false);

  useEffect(() => {
    fetchUnregisteredManufacturers();
  }, []);

  const fetchUnregisteredManufacturers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/manufacturers/unregistered');
      if (response.ok) {
        const data = await response.json();
        setManufacturers(data.manufacturers || []);
      }
    } catch (error) {
      console.error('Error fetching unregistered manufacturers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnify = async () => {
    if (!selectedManufacturer || !targetManufacturerName.trim()) {
      alert('統一先のメーカー名を入力してください');
      return;
    }

    setUnifying(true);
    try {
      const response = await fetch('/api/admin/manufacturers/unify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName: selectedManufacturer.name,
          newManufacturerName: targetManufacturerName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.updatedCount}件の道具のメーカーを統一しました`);
        setShowUnifyModal(false);
        setSelectedManufacturer(null);
        setTargetManufacturerName('');
        fetchUnregisteredManufacturers();
        router.refresh();
      } else {
        const error = await response.json();
        alert(`統一に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Error unifying manufacturer:', error);
      alert('統一中にエラーが発生しました');
    } finally {
      setUnifying(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-3">読み込み中...</p>
      </div>
    );
  }

  if (manufacturers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
        <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-700 font-medium mb-2">未登録メーカーはありません</p>
        <p className="text-sm text-gray-500">
          すべてのメーカーがメーカーマスタに登録されています
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          💡 顧客が自由入力したメーカー名の一覧です。表記ゆれがある場合は「統一」ボタンでメーカーマスタに追加して統一できます。
        </p>
      </div>

      {/* 未登録メーカー一覧 */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  メーカー名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用回数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用組織
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {manufacturers.map((mfr, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{mfr.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {mfr.count}件
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {mfr.organizations.slice(0, 3).join(', ')}
                      {mfr.organizations.length > 3 && ` 他${mfr.organizations.length - 3}組織`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedManufacturer(mfr);
                        setTargetManufacturerName(mfr.name);
                        setShowUnifyModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      メーカーマスタに追加して統一
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 統一モーダル */}
      {showUnifyModal && selectedManufacturer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">メーカーをマスタに追加して統一</h3>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                「{selectedManufacturer.name}」を使用している{selectedManufacturer.count}件の道具を、
                メーカーマスタに追加して統一します。
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ この操作を実行すると、「{selectedManufacturer.name}」を使用しているすべての道具のメーカーが
                  メーカーマスタの参照に変更されます。
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メーカーマスタに登録する正式名称 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={targetManufacturerName}
                onChange={(e) => setTargetManufacturerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 山田工業"
              />
              <p className="text-xs text-gray-500 mt-1">
                表記を修正する場合は正しいメーカー名に変更してください
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUnifyModal(false);
                  setSelectedManufacturer(null);
                  setTargetManufacturerName('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleUnify}
                disabled={unifying}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {unifying ? '統一中...' : 'メーカーマスタに追加して統一'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
