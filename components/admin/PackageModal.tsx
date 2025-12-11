import { useState, useEffect } from 'react';

interface PackageFeature {
  id?: string;
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

interface PackageModalProps {
  package: Package | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PackageModal({ package: pkg, onClose, onSuccess }: PackageModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthly_fee: 0,
    package_key: '',
    is_active: true,
  });

  const [features, setFeatures] = useState<PackageFeature[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pkg) {
      setFormData({
        name: pkg.name,
        description: pkg.description,
        monthly_fee: pkg.monthly_fee,
        package_key: pkg.package_key,
        is_active: pkg.is_active,
      });
      setFeatures(pkg.features || []);
    }
  }, [pkg]);

  // 機能追加
  const handleAddFeature = () => {
    setFeatures([
      ...features,
      {
        feature_name: '',
        feature_key: '',
        is_header: false,
        display_order: features.length,
      },
    ]);
  };

  // 機能削除
  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  // 機能更新
  const handleFeatureChange = (index: number, field: keyof PackageFeature, value: any) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFeatures(newFeatures);
  };

  // 保存
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = pkg ? `/api/admin/packages/${pkg.id}` : '/api/admin/packages';
      const method = pkg ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          features,
        }),
      });

      if (response.ok) {
        alert(pkg ? 'パッケージを更新しました' : 'パッケージを作成しました');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {pkg ? 'パッケージ編集' : '新規パッケージ作成'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">基本情報</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パッケージ名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                月額料金（円） *
              </label>
              <input
                type="number"
                value={formData.monthly_fee || ''}
                onChange={(e) => setFormData({ ...formData, monthly_fee: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="例: 18000"
                min="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                月額料金を設定します
              </p>
            </div>

            {pkg && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パッケージキー
                </label>
                <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 font-mono text-sm text-gray-600">
                  {formData.package_key}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  システムが自動生成したキーです（編集不可）
                </p>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                有効化する
              </label>
            </div>
          </div>

          {/* 機能リスト */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">機能リスト</h3>
                <p className="text-xs text-gray-500 mt-1">
                  このパッケージに含まれる機能を定義します
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddFeature}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                + 機能追加
              </button>
            </div>

            {/* 機能キーの説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-semibold mb-2">💡 機能キーについて</p>
              <p className="text-xs text-blue-700 mb-2">
                機能キーは、アクセス制御に使用する識別子です。以下の形式で記述してください：
              </p>
              <div className="space-y-1 text-xs text-blue-700 font-mono bg-white rounded p-2">
                <div><span className="text-green-600">asset</span>.tool_management - 資産管理系</div>
                <div><span className="text-green-600">dx</span>.attendance - 業務効率化系</div>
                <div><span className="text-green-600">master</span>.sites - マスタ管理系</div>
                <div><span className="text-green-600">report</span>.analytics - レポート系</div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                詳細は <a href="/docs/FEATURE_KEY_NAMING.md" target="_blank" className="underline">命名規則ドキュメント</a> を参照
              </p>
            </div>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={feature.feature_name}
                      onChange={(e) => handleFeatureChange(index, 'feature_name', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="機能名（例: 道具マスタ管理）"
                    />
                    <input
                      type="text"
                      value={feature.feature_key || ''}
                      onChange={(e) => handleFeatureChange(index, 'feature_key', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                      placeholder="機能キー（例: asset.tool_management）"
                    />
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={feature.is_header}
                        onChange={(e) => handleFeatureChange(index, 'is_header', e.target.checked)}
                        className="mr-2"
                      />
                      ヘッダー表示（【】で囲む）
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {features.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                機能が追加されていません
              </p>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? '保存中...' : (pkg ? '更新' : '作成')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
