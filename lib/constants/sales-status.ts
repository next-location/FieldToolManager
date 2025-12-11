// 営業ステータスの定義（共通）

export const salesStatusLabels: Record<string, string> = {
  not_contacted: '未接触',
  appointment: 'アポ取得',
  prospect: '見込み客',
  proposal: '提案中',
  negotiation: '商談中',
  contracting: '契約手続き中',
  contracted: '契約中',
  cancelled: '契約解除',
  lost: '失注',
  do_not_contact: '連絡不要',
};

export const salesStatusColors: Record<string, string> = {
  not_contacted: 'bg-gray-100 text-gray-800',
  appointment: 'bg-blue-100 text-blue-800',
  prospect: 'bg-cyan-100 text-cyan-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  negotiation: 'bg-orange-100 text-orange-800',
  contracting: 'bg-purple-100 text-purple-800',
  contracted: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  lost: 'bg-amber-100 text-amber-800',
  do_not_contact: 'bg-gray-200 text-gray-600',
};
