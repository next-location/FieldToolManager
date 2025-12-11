'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SalesActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by_name: string;
}

interface OrganizationSalesTabProps {
  organizationId: string;
  salesStatus: string;
  lastContactDate: string | null;
  nextAppointmentDate: string | null;
  expectedContractAmount: number | null;
  priority: string;
  leadSource: string | null;
  salesNotes: string | null;
}

// 営業ステータスのラベル
const salesStatusLabels: Record<string, string> = {
  not_contacted: '未接触',
  appointment: 'アポ取得',
  prospect: '見込み客',
  proposal: '提案中',
  negotiation: '商談中',
  contracting: '契約手続き中',
  contracted: '契約中',
  cancelled: '契約解除',
  do_not_contact: '連絡不要',
};

// 優先度のラベル
const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

// 活動種別のラベル
const activityTypeLabels: Record<string, string> = {
  call: '電話',
  email: 'メール',
  meeting: '面談',
  proposal: '提案',
  other: 'その他',
};

export default function OrganizationSalesTab({
  organizationId,
  salesStatus,
  lastContactDate,
  nextAppointmentDate,
  expectedContractAmount,
  priority,
  leadSource,
  salesNotes,
}: OrganizationSalesTabProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // フォームの状態
  const [formData, setFormData] = useState({
    salesStatus,
    lastContactDate: lastContactDate || '',
    nextAppointmentDate: nextAppointmentDate || '',
    expectedContractAmount: expectedContractAmount || '',
    priority,
    leadSource: leadSource || '',
    salesNotes: salesNotes || '',
  });

  // 活動追加フォームの状態
  const [activityForm, setActivityForm] = useState({
    activityType: 'other',
    title: '',
    description: '',
  });

  // 営業活動履歴を取得
  useEffect(() => {
    fetchActivities();
  }, [organizationId]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/admin/sales-activities?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // 営業情報の更新
  const handleUpdateSalesInfo = async () => {
    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/sales`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('営業情報を更新しました');
        setIsEditMode(false);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`更新に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update sales info:', error);
      alert('更新中にエラーが発生しました');
    }
  };

  // 活動を追加
  const handleAddActivity = async () => {
    if (!activityForm.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/admin/sales-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          activityType: activityForm.activityType,
          title: activityForm.title,
          description: activityForm.description,
        }),
      });

      if (response.ok) {
        alert('活動を追加しました');
        setIsAddingActivity(false);
        setActivityForm({ activityType: 'other', title: '', description: '' });
        fetchActivities();
      } else {
        const error = await response.json();
        alert(`追加に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to add activity:', error);
      alert('追加中にエラーが発生しました');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 営業ステータス概要 */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">営業情報</h2>
          {!isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              編集
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setFormData({
                    salesStatus,
                    lastContactDate: lastContactDate || '',
                    nextAppointmentDate: nextAppointmentDate || '',
                    expectedContractAmount: expectedContractAmount || '',
                    priority,
                    leadSource: leadSource || '',
                    salesNotes: salesNotes || '',
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateSalesInfo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          )}
        </div>

        {!isEditMode ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">営業ステータス</p>
              <p className="font-semibold text-gray-900">{salesStatusLabels[salesStatus] || salesStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">優先度</p>
              <p className="font-semibold text-gray-900">{priorityLabels[priority] || priority}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">最終接触日</p>
              <p className="font-semibold text-gray-900">{formatDate(lastContactDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">次回アポイント</p>
              <p className="font-semibold text-gray-900">{formatDate(nextAppointmentDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">見込み契約金額</p>
              <p className="font-semibold text-gray-900">
                {expectedContractAmount ? `¥${expectedContractAmount.toLocaleString()}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">リードソース</p>
              <p className="font-semibold text-gray-900">{leadSource || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">営業メモ</p>
              <p className="font-semibold text-gray-900 whitespace-pre-wrap">{salesNotes || '-'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">営業ステータス</label>
              <select
                value={formData.salesStatus}
                onChange={(e) => setFormData({ ...formData, salesStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(salesStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最終接触日</label>
              <input
                type="datetime-local"
                value={formData.lastContactDate}
                onChange={(e) => setFormData({ ...formData, lastContactDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">次回アポイント</label>
              <input
                type="datetime-local"
                value={formData.nextAppointmentDate}
                onChange={(e) => setFormData({ ...formData, nextAppointmentDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">見込み契約金額（円）</label>
              <input
                type="number"
                value={formData.expectedContractAmount}
                onChange={(e) => setFormData({ ...formData, expectedContractAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">リードソース</label>
              <input
                type="text"
                value={formData.leadSource}
                onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: ホームページ、紹介、展示会"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">営業メモ</label>
              <textarea
                value={formData.salesNotes}
                onChange={(e) => setFormData({ ...formData, salesNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </div>
        )}
      </div>

      {/* 営業活動履歴 */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">営業活動履歴</h2>
          {!isAddingActivity && (
            <button
              onClick={() => setIsAddingActivity(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + 活動を追加
            </button>
          )}
        </div>

        {/* 活動追加フォーム */}
        {isAddingActivity && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">新規活動</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">活動種別</label>
                <select
                  value={activityForm.activityType}
                  onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(activityTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 初回訪問、見積提出"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
                <textarea
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAddingActivity(false);
                    setActivityForm({ activityType: 'other', title: '', description: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddActivity}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 活動一覧 */}
        {loading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">営業活動の履歴がありません</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded mr-2">
                      {activityTypeLabels[activity.activity_type] || activity.activity_type}
                    </span>
                    <span className="font-semibold text-gray-900">{activity.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(activity.created_at)}</span>
                </div>
                {activity.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{activity.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">担当者: {activity.created_by_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
