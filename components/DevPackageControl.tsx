'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

/**
 * 開発環境専用：パッケージ切り替えコントロールパネル
 * 本番環境では表示されない
 */
export function DevPackageControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<string>('');

  useEffect(() => {
    // 現在の設定を取得
    const stored = localStorage.getItem('mock_package_type');
    if (stored) {
      setCurrentPackage(stored);
    }
  }, []);

  // 本番環境では表示しない
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handlePackageChange = (packageType: string) => {
    if (packageType === '') {
      localStorage.removeItem('mock_package_type');
    } else {
      localStorage.setItem('mock_package_type', packageType);
    }
    setCurrentPackage(packageType);
    // ページをリロードして設定を反映
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="開発用パッケージコントロール"
        >
          <Settings className="w-5 h-5" />
        </button>
      ) : (
        <div className="bg-gray-800 text-white rounded-lg shadow-xl p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">開発用パッケージ切り替え</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">
              現在: {currentPackage || 'API取得（デフォルト）'}
            </div>

            <button
              onClick={() => handlePackageChange('')}
              className={`w-full px-3 py-2 rounded text-sm text-left ${
                currentPackage === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🔧 API取得（デフォルト）
            </button>

            <button
              onClick={() => handlePackageChange('asset')}
              className={`w-full px-3 py-2 rounded text-sm text-left ${
                currentPackage === 'asset'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📦 現場資産パックのみ
            </button>

            <button
              onClick={() => handlePackageChange('dx')}
              className={`w-full px-3 py-2 rounded text-sm text-left ${
                currentPackage === 'dx'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💼 現場DXパックのみ
            </button>

            <button
              onClick={() => handlePackageChange('full')}
              className={`w-full px-3 py-2 rounded text-sm text-left ${
                currentPackage === 'full'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ⭐ フル機能パック
            </button>

            <button
              onClick={() => handlePackageChange('none')}
              className={`w-full px-3 py-2 rounded text-sm text-left ${
                currentPackage === 'none'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🆓 トライアル（機能なし）
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              パッケージを変更するとページがリロードされます
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
