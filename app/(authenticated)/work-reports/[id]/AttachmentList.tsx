'use client'

import { useState, useEffect, useRef } from 'react'

interface Attachment {
  id: string
  file_url: string
  attachment_type: string
  file_name: string
  description?: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

interface AttachmentListProps {
  reportId: string
  canEdit: boolean
}

const attachmentTypeLabels: Record<string, string> = {
  drawing: '図面',
  specification: '仕様書',
  manual: 'マニュアル',
  report: 'レポート',
  other: 'その他',
}

const getFileIcon = (mimeType: string): string => {
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  return '📎'
}

export function AttachmentList({ reportId, canEdit }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('drawing')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 資料を取得
  useEffect(() => {
    fetchAttachments()
  }, [reportId])

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/work-reports/${reportId}/attachments`)
      if (response.ok) {
        const data = await response.json()
        console.log('📎 Fetched attachments data:', data) // デバッグ用
        // dataが配列でない場合の処理
        if (Array.isArray(data)) {
          setAttachments(data)
        } else if (data && typeof data === 'object') {
          // dataがオブジェクトの場合、attachmentsプロパティを探す
          const attachmentArray = data.attachments || data.data || []
          console.log('📎 Extracted attachment array:', attachmentArray) // デバッグ用
          setAttachments(Array.isArray(attachmentArray) ? attachmentArray : [])
        } else {
          console.error('📎 Unexpected data format:', data)
          setAttachments([])
        }
      }
    } catch (err) {
      console.error('資料取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください')
      return
    }

    // MIMEタイプチェック
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      setError('PDF、画像、Excel、Wordファイルのみアップロード可能です')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', selectedType)
      if (description) {
        formData.append('description', description)
      }

      const response = await fetch(`/api/work-reports/${reportId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      const data = await response.json()
      console.log('📎 Upload response data:', data) // デバッグ用
      // APIは{ attachment: ... }形式で返すので、attachmentプロパティを取得
      const newAttachment = data.attachment || data
      console.log('📎 New attachment to add:', newAttachment) // デバッグ用
      console.log('📎 Current attachments before add:', attachments) // デバッグ用
      setAttachments(prevAttachments => {
        const updated = [...prevAttachments, newAttachment]
        console.log('📎 Updated attachments array:', updated) // デバッグ用
        return updated
      })
      setDescription('')

      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('この資料を削除しますか？')) return

    try {
      const response = await fetch(`/api/work-reports/${reportId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      setAttachments(attachments.filter((a) => a.id !== attachmentId))
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow sm:rounded-lg mb-6">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          添付資料 {attachments.length > 0 && `(${attachments.length}件)`}
        </h3>

        {/* アップロードフォーム（編集可能な場合のみ） */}
        {canEdit && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">資料を追加</h4>

            <div className="space-y-3">
              {/* 資料タイプと説明 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="attachment_type" className="block text-sm font-medium text-gray-700 mb-1">
                    資料タイプ
                  </label>
                  <select
                    id="attachment_type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(attachmentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    説明（オプション）
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="例: 設計図 修正版"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* ファイル選択 */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  PDF、画像、Excel、Word形式（最大10MB）
                </p>
              </div>

              {uploading && (
                <div className="text-sm text-blue-600">
                  アップロード中...
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 資料一覧 */}
        {attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {getFileIcon(attachment.mime_type)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex-shrink-0">
                        {attachmentTypeLabels[attachment.attachment_type]}
                      </span>
                    </div>
                    {attachment.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {attachment.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <a
                    href={attachment.file_url}
                    download={attachment.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            {canEdit ? '資料を追加してください' : '添付資料がありません'}
          </div>
        )}
      </div>
    </div>
  )
}
