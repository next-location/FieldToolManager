'use client';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  next_action: string | null;
  next_action_date: string | null;
  activity_date: string;
  created_by: string | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const activityTypeConfig = {
    phone_call: { icon: '📞', label: '架電', color: 'bg-blue-100 text-blue-800' },
    email: { icon: '✉️', label: 'メール', color: 'bg-green-100 text-green-800' },
    inquiry_form: { icon: '📝', label: '問い合わせ', color: 'bg-purple-100 text-purple-800' },
    meeting: { icon: '🤝', label: '対面商談', color: 'bg-orange-100 text-orange-800' },
    online_meeting: { icon: '💻', label: 'オンライン商談', color: 'bg-cyan-100 text-cyan-800' },
    proposal_sent: { icon: '📋', label: '提案書送付', color: 'bg-yellow-100 text-yellow-800' },
    follow_up: { icon: '🔄', label: 'フォローアップ', color: 'bg-indigo-100 text-indigo-800' },
    status_change: { icon: '🔔', label: 'ステータス変更', color: 'bg-pink-100 text-pink-800' },
    other: { icon: '📌', label: 'その他', color: 'bg-gray-100 text-gray-800' },
  };

  const outcomeConfig = {
    success: { label: '成功', color: 'text-green-600' },
    no_answer: { label: '不在・不通', color: 'text-gray-600' },
    declined: { label: '断られた', color: 'text-red-600' },
    pending: { label: '保留', color: 'text-yellow-600' },
    scheduled: { label: '予定', color: 'text-blue-600' },
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        活動履歴 ({activities.length}件)
      </h2>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">まだ活動履歴がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const typeConfig = activityTypeConfig[activity.activity_type as keyof typeof activityTypeConfig] || activityTypeConfig.other;
            const outcomeInfo = activity.outcome ? outcomeConfig[activity.outcome as keyof typeof outcomeConfig] : null;

            return (
              <div key={activity.id} className="relative">
                {/* タイムライン線 */}
                {index !== activities.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
                )}

                <div className="flex gap-3">
                  {/* アイコン */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${typeConfig.color} flex items-center justify-center text-sm z-10`}>
                    {typeConfig.icon}
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-1 pb-4">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            {outcomeInfo && (
                              <span className={`text-xs font-medium ${outcomeInfo.color}`}>
                                {outcomeInfo.label}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">{activity.title}</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.activity_date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* 詳細 */}
                      {activity.description && (
                        <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                          {activity.description}
                        </p>
                      )}

                      {/* 次回アクション */}
                      {activity.next_action && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <p className="text-xs text-gray-600 mb-1">次回アクション:</p>
                          <p className="text-sm text-gray-900">{activity.next_action}</p>
                          {activity.next_action_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              予定日: {new Date(activity.next_action_date).toLocaleDateString('ja-JP')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* フッター */}
                      {activity.created_by && (
                        <p className="text-xs text-gray-500 mt-2">
                          作成者: {activity.created_by}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
