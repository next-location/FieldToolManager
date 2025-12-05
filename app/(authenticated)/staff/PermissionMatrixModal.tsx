'use client'

interface PermissionMatrixModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Permission {
  feature: string
  category: string
  admin: boolean | string
  manager: boolean | string
  leader: boolean | string
  staff: boolean | string
}

export function PermissionMatrixModal({ isOpen, onClose }: PermissionMatrixModalProps) {
  const permissions: Permission[] = [
    // スタッフ管理
    { feature: 'スタッフ一覧閲覧', category: 'スタッフ管理', admin: true, manager: true, leader: true, staff: true },
    { feature: 'スタッフ追加', category: 'スタッフ管理', admin: true, manager: 'leader・staffのみ', leader: false, staff: false },
    { feature: 'スタッフ編集', category: 'スタッフ管理', admin: true, manager: 'leader・staffのみ', leader: false, staff: false },
    { feature: 'スタッフ削除', category: 'スタッフ管理', admin: true, manager: 'leader・staffのみ', leader: false, staff: false },
    { feature: '権限変更', category: 'スタッフ管理', admin: true, manager: false, leader: false, staff: false },
    { feature: 'パスワードリセット', category: 'スタッフ管理', admin: true, manager: false, leader: false, staff: false },
    { feature: '変更履歴閲覧', category: 'スタッフ管理', admin: true, manager: false, leader: false, staff: false },
    { feature: 'CSV一括登録', category: 'スタッフ管理', admin: true, manager: false, leader: false, staff: false },

    // 道具管理
    { feature: '道具一覧閲覧', category: '道具管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '道具登録', category: '道具管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '道具編集', category: '道具管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '道具削除', category: '道具管理', admin: true, manager: false, leader: false, staff: false },
    { feature: 'QRコード印刷', category: '道具管理', admin: true, manager: true, leader: false, staff: false },
    { feature: 'CSV一括登録', category: '道具管理', admin: true, manager: false, leader: false, staff: false },

    // 在庫管理
    { feature: '在庫確認', category: '在庫管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '在庫調整', category: '在庫管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '棚卸し実施', category: '在庫管理', admin: true, manager: true, leader: false, staff: false },

    // 出入庫管理
    { feature: '出入庫履歴閲覧', category: '出入庫管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '出庫登録', category: '出入庫管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '入庫登録', category: '出入庫管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '一括出入庫', category: '出入庫管理', admin: true, manager: true, leader: false, staff: false },

    // 現場管理
    { feature: '現場一覧閲覧', category: '現場管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '現場登録', category: '現場管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '現場編集', category: '現場管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '現場削除', category: '現場管理', admin: true, manager: false, leader: false, staff: false },

    // 重機管理
    { feature: '重機一覧閲覧', category: '重機管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '重機登録', category: '重機管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '重機編集', category: '重機管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '重機削除', category: '重機管理', admin: true, manager: false, leader: false, staff: false },
    { feature: '期限管理・通知', category: '重機管理', admin: true, manager: true, leader: false, staff: false },
    { feature: 'CSV一括登録', category: '重機管理', admin: true, manager: false, leader: false, staff: false },

    // 消耗品管理
    { feature: '消耗品一覧閲覧', category: '消耗品管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '消耗品登録', category: '消耗品管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '消耗品編集', category: '消耗品管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '消耗品削除', category: '消耗品管理', admin: true, manager: false, leader: false, staff: false },
    { feature: '在庫調整（±100個まで）', category: '消耗品管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '在庫調整（制限なし）', category: '消耗品管理', admin: true, manager: true, leader: false, staff: false },
    { feature: 'CSV一括登録', category: '消耗品管理', admin: true, manager: false, leader: false, staff: false },

    // 道具セット管理
    { feature: '道具セット一覧閲覧', category: '道具セット管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '道具セット登録', category: '道具セット管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '道具セット編集', category: '道具セット管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '道具セット削除', category: '道具セット管理', admin: true, manager: false, leader: false, staff: false },
    { feature: '道具セット移動', category: '道具セット管理', admin: true, manager: true, leader: true, staff: true },

    // 勤怠管理
    { feature: '自分の出退勤打刻', category: '勤怠管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '自分の勤怠履歴閲覧', category: '勤怠管理', admin: true, manager: true, leader: true, staff: true },
    { feature: '勤怠一覧閲覧', category: '勤怠管理', admin: '全員', manager: '全員', leader: '自チームのみ', staff: false },
    { feature: 'リーダー用QR発行', category: '勤怠管理', admin: true, manager: true, leader: true, staff: false },
    { feature: 'アラート通知閲覧', category: '勤怠管理', admin: '全員', manager: '全員', leader: '自チームのみ', staff: false },
    { feature: '月次勤怠レポート', category: '勤怠管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '手動修正（全員）', category: '勤怠管理', admin: true, manager: true, leader: false, staff: false },
    { feature: '手動修正（自チーム）', category: '勤怠管理', admin: true, manager: true, leader: true, staff: false },
    { feature: '出退勤設定', category: '勤怠管理', admin: true, manager: false, leader: false, staff: false },
    { feature: '現場QR管理', category: '勤怠管理', admin: true, manager: false, leader: false, staff: false },
    { feature: 'タブレット端末管理', category: '勤怠管理', admin: true, manager: false, leader: false, staff: false },

    // レポート・分析
    { feature: 'ダッシュボード閲覧', category: 'レポート・分析', admin: true, manager: true, leader: true, staff: true },
    { feature: '監査ログ閲覧', category: 'レポート・分析', admin: true, manager: false, leader: false, staff: false },
    { feature: 'CSVエクスポート', category: 'レポート・分析', admin: true, manager: true, leader: false, staff: false },
    { feature: '詳細分析', category: 'レポート・分析', admin: true, manager: false, leader: false, staff: false },

    // 設定
    { feature: '組織設定', category: '設定', admin: true, manager: false, leader: false, staff: false },
    { feature: 'カテゴリ管理', category: '設定', admin: true, manager: false, leader: false, staff: false },
    { feature: '保管場所管理', category: '設定', admin: true, manager: false, leader: false, staff: false },
    { feature: 'プラン変更', category: '設定', admin: true, manager: false, leader: false, staff: false },
  ]

  // カテゴリごとにグループ化
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = []
    }
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">権限マトリックス</h2>
            <p className="text-sm text-gray-600 mt-1">各ロールの機能別アクセス権限一覧</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {/* 凡例 */}
          <div className="mb-6 flex space-x-4 text-sm">
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></span>
              <span>可能</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></span>
              <span>条件付き</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></span>
              <span>不可</span>
            </div>
          </div>

          {/* カテゴリ別テーブル */}
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 bg-gray-100 px-3 py-2 rounded">
                {category}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '17.5%' }} />
                    <col style={{ width: '17.5%' }} />
                    <col style={{ width: '17.5%' }} />
                    <col style={{ width: '17.5%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-700 border-b whitespace-nowrap">機能</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 border-b">
                        <div className="flex flex-col items-center">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                            admin
                          </span>
                          <span className="text-xs text-gray-500 mt-1">管理者</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 border-b">
                        <div className="flex flex-col items-center">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            manager
                          </span>
                          <span className="text-xs text-gray-500 mt-1">マネージャー</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 border-b">
                        <div className="flex flex-col items-center">
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            leader
                          </span>
                          <span className="text-xs text-gray-500 mt-1">リーダー</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-700 border-b">
                        <div className="flex flex-col items-center">
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                            staff
                          </span>
                          <span className="text-xs text-gray-500 mt-1">一般</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {perms.map((perm, index) => {
                      const renderCell = (value: boolean | string) => {
                        if (typeof value === 'string') {
                          return (
                            <span className="inline-block px-3 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
                              ⚠ {value}
                            </span>
                          )
                        }
                        return (
                          <span
                            className={`inline-block px-3 py-1 text-xs font-semibold rounded ${
                              value
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {value ? '✓ 可' : '✗ 不可'}
                          </span>
                        )
                      }

                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 border-b text-gray-700 whitespace-nowrap">{perm.feature}</td>
                          <td className="px-4 py-3 border-b text-center">
                            {renderCell(perm.admin)}
                          </td>
                          <td className="px-4 py-3 border-b text-center">
                            {renderCell(perm.manager)}
                          </td>
                          <td className="px-4 py-3 border-b text-center">
                            {renderCell(perm.leader)}
                          </td>
                          <td className="px-4 py-3 border-b text-center">
                            {renderCell(perm.staff)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* サマリー */}
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded p-4">
              <h4 className="font-semibold text-purple-900 mb-2">📌 管理者（admin）の概要</h4>
              <p className="text-sm text-purple-800">
                組織全体の管理を担当し、すべての機能にアクセス可能です。
                スタッフの追加・編集・削除、組織設定の変更、プラン管理など、重要な操作を実行できます。
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📌 マネージャー（manager）の概要</h4>
              <p className="text-sm text-blue-800">
                現場運営の中心的役割を担います。道具・消耗品・現場の登録・編集、在庫調整、CSVエクスポートなど、
                日常業務の大部分を管理できます。
              </p>
              <ul className="mt-2 text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>スタッフ管理：</strong> leader・staffアカウントのみ追加・編集・削除可能（admin・managerアカウントは不可）</li>
                <li><strong>組織設定：</strong> 管理者のみが実行可能</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h4 className="font-semibold text-green-900 mb-2">📌 リーダー（leader）/ 一般スタッフ（staff）の概要</h4>
              <p className="text-sm text-green-800">
                現場での日常的な道具の出入庫、移動、在庫確認などの基本操作を実行できます。
                道具や消耗品の登録・編集はマネージャー以上の権限が必要です。
              </p>
              <ul className="mt-2 text-sm text-green-800 space-y-1 list-disc list-inside">
                <li><strong>消耗品在庫調整：</strong> ±100個までに制限（大幅な調整はマネージャー以上に依頼）</li>
                <li><strong>道具セット登録：</strong> 不可（移動のみ可能）</li>
                <li><strong>CSV一括登録：</strong> すべてのページで管理者のみに制限</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="text-xs text-gray-700">
                💡 この権限一覧は管理者のみが閲覧できます。制限事項の詳細は各機能のマニュアルを参照してください。
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
