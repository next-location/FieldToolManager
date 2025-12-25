'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteOrganizationButton({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('この組織を削除してもよろしいですか？\n\n削除すると以下のデータも全て削除されます：\n- 契約情報\n- ユーザーアカウント\n- 工具・資材データ\n- 現場データ\n- 作業報告書\n\nこの操作は取り消せません。')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '組織の削除に失敗しました');
      }

      alert('組織を削除しました');
      router.push('/admin/organizations');
      router.refresh();
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert(error instanceof Error ? error.message : '組織の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      {isDeleting ? '削除中...' : '削除'}
    </button>
  );
}
