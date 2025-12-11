'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import PackageCard from '@/components/admin/PackageCard';
import PackageModal from '@/components/admin/PackageModal';

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

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'sales' | null>(null);

  // パッケージ一覧を取得
  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/admin/packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  // ユーザーの権限を取得
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/admin/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    fetchPackages();
  }, []);

  // 新規作成モーダルを開く
  const handleCreate = () => {
    setEditingPackage(null);
    setIsModalOpen(true);
  };

  // 編集モーダルを開く
  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setIsModalOpen(true);
  };

  // パッケージ削除
  const handleDelete = async (id: string) => {
    if (!confirm('このパッケージを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('パッケージを削除しました');
        fetchPackages();
      } else {
        const error = await response.json();
        alert(error.error || 'パッケージの削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('パッケージの削除に失敗しました');
    }
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  // 保存成功時
  const handleSaveSuccess = () => {
    fetchPackages();
    handleCloseModal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <AdminHeader userName="Super Admin" />

      {/* サイドバーとメインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* ヘッダー */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">パッケージ設定</h1>
                <p className="text-sm text-gray-600 mt-2">
                  機能パッケージの詳細と料金設定を管理します。
                </p>
              </div>
              <button
                onClick={handleCreate}
                disabled={userRole !== 'owner'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title={userRole === 'sales' ? '営業ロールでは編集できません' : ''}
              >
                + 新規パッケージ作成
              </button>
            </div>

            {/* 説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                💡 パッケージは契約作成時に選択できます。料金や機能リストを編集・追加できます。
              </p>
            </div>

            {/* パッケージカード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  package={pkg}
                  onEdit={() => handleEdit(pkg)}
                  onDelete={() => handleDelete(pkg.id)}
                  isReadOnly={userRole === 'sales'}
                />
              ))}
            </div>

            {packages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">パッケージがまだ登録されていません</p>
                <button
                  onClick={handleCreate}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  最初のパッケージを作成
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* パッケージ作成・編集モーダル */}
      {isModalOpen && (
        <PackageModal
          package={editingPackage}
          onClose={handleCloseModal}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}
