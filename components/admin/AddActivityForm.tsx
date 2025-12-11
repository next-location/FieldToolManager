'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AddActivityFormProps {
  leadId: string;
}

export default function AddActivityForm({ leadId }: AddActivityFormProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    activityType: 'phone_call',
    title: '',
    description: '',
    outcome: '',
    nextAction: '',
    nextActionDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/sales/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // フォームをリセット
        setFormData({
          activityType: 'phone_call',
          title: '',
          description: '',
          outcome: '',
          nextAction: '',
          nextActionDate: '',
        });
        setIsExpanded(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || '追加に失敗しました');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">新規活動を追加</h2>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 活動タイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活動タイプ
            </label>
            <select
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="phone_call">📞 架電</option>
              <option value="email">✉️ メール送信</option>
              <option value="inquiry_form">📝 問い合わせフォーム</option>
              <option value="meeting">🤝 対面商談</option>
              <option value="online_meeting">💻 オンライン商談</option>
              <option value="proposal_sent">📋 提案書送付</option>
              <option value="follow_up">🔄 フォローアップ</option>
              <option value="other">📌 その他</option>
            </select>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例: 初回ヒアリング"
              required
            />
          </div>

          {/* 詳細 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="活動の詳細を入力..."
            />
          </div>

          {/* 結果 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              結果
            </label>
            <select
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              <option value="success">成功</option>
              <option value="no_answer">不在・不通</option>
              <option value="declined">断られた</option>
              <option value="pending">保留</option>
              <option value="scheduled">予定</option>
            </select>
          </div>

          {/* 次回アクション */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              次回アクション
            </label>
            <input
              type="text"
              value={formData.nextAction}
              onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例: 提案書を送付する"
            />
          </div>

          {/* 次回アクション予定日 */}
          {formData.nextAction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                次回アクション予定日
              </label>
              <input
                type="datetime-local"
                value={formData.nextActionDate}
                onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm bg-[#1E6FFF] text-white rounded-lg hover:bg-[#0D4FCC] transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? '追加中...' : '活動を追加'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
