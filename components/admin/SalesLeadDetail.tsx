'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { salesStatusLabels, salesStatusColors } from '@/lib/constants/sales-status';

interface Organization {
  id: string;
  name: string;
  subdomain: string | null;
  phone: string | null;
  address: string | null;
  sales_status: string;
  last_contact_date: string | null;
  next_appointment_date: string | null;
  expected_contract_amount: number | null;
  priority: string;
  lead_source: string | null;
  sales_notes: string | null;
}

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by_name: string;
}

interface SalesLeadDetailProps {
  organization: Organization;
  activities: Activity[];
  superAdminId: string;
  superAdminName: string;
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const activityTypeLabels: Record<string, string> = {
  phone_call: '電話',
  email: 'メール',
  inquiry_form: '問い合わせフォーム',
  meeting: '面談',
  online_meeting: 'オンライン面談',
  proposal_sent: '提案書送付',
  follow_up: 'フォローアップ',
  status_change: 'ステータス変更',
  contract: '契約',
  after_support: 'アフターサポート',
  other: 'その他',
};

// ISO形式の日時をdatetime-local形式に変換（yyyy-MM-ddThh:mm）
const formatDatetimeLocal = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function SalesLeadDetail({
  organization,
  activities: initialActivities,
  superAdminId,
  superAdminName,
}: SalesLeadDetailProps) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activities, setActivities] = useState(initialActivities);

  const [formData, setFormData] = useState({
    salesStatus: organization.sales_status,
    lastContactDate: formatDatetimeLocal(organization.last_contact_date),
    nextAppointmentDate: formatDatetimeLocal(organization.next_appointment_date),
    expectedContractAmount: organization.expected_contract_amount || '',
    priority: organization.priority,
    leadSource: organization.lead_source || '',
    salesNotes: organization.sales_notes || '',
  });

  const [activityForm, setActivityForm] = useState({
    activityType: 'other',
    title: '',
    description: '',
  });

  const handleUpdateSalesInfo = async () => {
    try {
      const response = await fetch(`/api/admin/organizations/${organization.id}/sales`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();

        // 警告メッセージがあれば表示
        if (data.warning) {
          alert(`営業情報を更新しました\n\n⚠️ 注意: ${data.warning}`);
        } else {
          alert('営業情報を更新しました');
        }

        setIsEditMode(false);

        // 作成された活動履歴を即座に一覧に追加
        if (data.activity) {
          setActivities([data.activity, ...activities]);
        }

        // サーバーから最新データも取得（バックグラウンド）
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
          organizationId: organization.id,
          activityType: activityForm.activityType,
          title: activityForm.title,
          description: activityForm.description,
        }),
      });

      if (response.ok) {
        const newActivity = await response.json();

        alert('活動を追加しました');
        setIsAddingActivity(false);
        setActivityForm({ activityType: 'other', title: '', description: '' });

        // クライアント側で即座に活動一覧を更新
        setActivities([newActivity.activity, ...activities]);

        // サーバーから最新データも取得（バックグラウンド）
        router.refresh();
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 基本情報カード */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">基本情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">会社名</p>
            <p className="font-semibold text-gray-900">{organization.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">サブドメイン</p>
            <p className="font-semibold text-gray-900 font-mono">{organization.subdomain || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">電話番号</p>
            <p className="font-semibold text-gray-900">{organization.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">住所</p>
            <p className="font-semibold text-gray-900">{organization.address || '-'}</p>
          </div>
          <div className="col-span-2">
            <Link
              href={`/admin/organizations/${organization.id}`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              組織詳細ページを開く →
            </Link>
          </div>
        </div>
      </div>

      {/* 営業情報カード */}
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
                    salesStatus: organization.sales_status,
                    lastContactDate: formatDatetimeLocal(organization.last_contact_date),
                    nextAppointmentDate: formatDatetimeLocal(organization.next_appointment_date),
                    expectedContractAmount: organization.expected_contract_amount || '',
                    priority: organization.priority,
                    leadSource: organization.lead_source || '',
                    salesNotes: organization.sales_notes || '',
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
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${salesStatusColors[organization.sales_status]}`}>
                {salesStatusLabels[organization.sales_status]}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">優先度</p>
              <p className="font-semibold text-gray-900">{priorityLabels[organization.priority]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">最終接触日</p>
              <p className="font-semibold text-gray-900">{formatDate(organization.last_contact_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">次回アポイント</p>
              <p className="font-semibold text-gray-900">{formatDate(organization.next_appointment_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">見込み契約金額</p>
              <p className="font-semibold text-gray-900">
                {organization.expected_contract_amount ? `¥${organization.expected_contract_amount.toLocaleString()}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">リードソース</p>
              <p className="font-semibold text-gray-900">{organization.lead_source || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">営業メモ</p>
              <p className="font-semibold text-gray-900 whitespace-pre-wrap mt-1">{organization.sales_notes || '-'}</p>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 初回訪問、見積提出、契約締結"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
                <textarea
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="活動の詳細を記入してください"
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
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">営業活動の履歴がありません</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
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
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">{activity.description}</p>
                )}
                <p className="text-xs text-gray-400">担当者: {activity.created_by_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
