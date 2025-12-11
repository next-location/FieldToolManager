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

interface PackageCardProps {
  package: Package;
  onEdit: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export default function PackageCard({ package: pkg, onEdit, onDelete, isReadOnly = false }: PackageCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 relative">
      {/* 無効バッジ */}
      {!pkg.is_active && (
        <div className="absolute top-4 right-4">
          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
            無効
          </span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">{pkg.name}</h2>
        <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
      </div>

      {/* 料金 */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-blue-600">
          ¥{pkg.monthly_fee.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">/ 月（税抜）</p>
      </div>

      {/* 機能リスト */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">含まれる機能:</h3>
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {pkg.features.map((feature, index) => {
            // ヘッダー表示
            if (feature.is_header) {
              return (
                <li key={index} className="font-semibold text-sm text-gray-800 mt-3 first:mt-0">
                  {feature.feature_name}
                </li>
              );
            }

            // 通常の機能項目
            return (
              <li key={index} className="flex items-start text-sm text-gray-600">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature.feature_name}
              </li>
            );
          })}
        </ul>
      </div>

      {/* パッケージキー */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">パッケージキー:</span>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
            {pkg.package_key}
          </code>
        </div>
      </div>

      {/* アクションボタン */}
      {isReadOnly ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-xs text-yellow-700">
            📌 閲覧のみ（営業ロールでは編集・削除不可）
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            編集
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-600 rounded-lg font-semibold text-sm"
          >
            削除
          </button>
        </div>
      )}
    </div>
  );
}
