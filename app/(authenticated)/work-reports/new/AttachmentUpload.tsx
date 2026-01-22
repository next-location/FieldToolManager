'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, FileText, FileImage, FileSpreadsheet, File } from 'lucide-react'

interface Attachment {
  id: string // 一時ID（アップロード前）またはDB ID（アップロード後）
  file?: File
  file_name: string
  file_type: '図面' | '仕様書' | 'マニュアル' | 'その他'
  description: string
  display_order: number
  uploaded?: boolean
  storage_path?: string
  mime_type?: string
  file_size?: number
}

interface AttachmentUploadProps {
  reportId?: string
  onAttachmentsChange?: (attachments: Attachment[]) => void
}

const FILE_TYPE_OPTIONS = ['図面', '仕様書', 'マニュアル', 'その他'] as const

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return <File className="h-5 w-5" />

  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5" />
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />
  if (
    mimeType.includes('spreadsheet') ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return <FileSpreadsheet className="h-5 w-5" />
  }
  if (
    mimeType.includes('word') ||
    mimeType === 'application/msword'
  ) {
    return <FileText className="h-5 w-5" />
  }

  return <File className="h-5 w-5" />
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentUpload({ reportId, onAttachmentsChange }: AttachmentUploadProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 既存の添付ファイルを読み込む
  useEffect(() => {
    if (!reportId) return

    const fetchAttachments = async () => {
      try {
        const response = await fetch(`/api/work-reports/${reportId}/attachments`)
        if (!response.ok) return

        const data = await response.json()
        const existingAttachments = (data.attachments || []).map((attachment: any) => ({
          id: attachment.id,
          file_name: attachment.file_name,
          file_type: attachment.file_type || 'その他',
          description: attachment.description || '',
          display_order: attachment.display_order,
          uploaded: true,
          storage_path: attachment.file_url,
          mime_type: attachment.mime_type,
          file_size: attachment.file_size,
        }))
        setAttachments(existingAttachments)
      } catch (error) {
        console.error('添付ファイルの読み込みエラー:', error)
      }
    }

    fetchAttachments()
  }, [reportId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // ファイルサイズチェック（10MB）
    const MAX_SIZE = 10 * 1024 * 1024
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) {
        alert(`${file.name} はサイズが大きすぎます（最大10MB）`)
        return false
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name} は対応していない形式です（PDF、画像、Excel、Wordのみ）`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // 新しい添付ファイルを追加
    const newAttachments: Attachment[] = validFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      file,
      file_name: file.name,
      file_type: 'その他',
      description: '',
      display_order: attachments.length + index,
      uploaded: false,
      mime_type: file.type,
      file_size: file.size,
    }))

    const updatedAttachments = [...attachments, ...newAttachments]
    setAttachments(updatedAttachments)
    onAttachmentsChange?.(updatedAttachments)

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // reportIdがある場合は即座にアップロード
    if (reportId) {
      await uploadAttachments(newAttachments)
    }
  }

  const uploadAttachments = async (attachmentsToUpload: Attachment[]) => {
    setUploading(true)

    for (const attachment of attachmentsToUpload) {
      if (!attachment.file || attachment.uploaded) continue

      try {
        const formData = new FormData()
        formData.append('file', attachment.file)
        formData.append('file_type', attachment.file_type)
        formData.append('description', attachment.description || '')
        formData.append('display_order', attachment.display_order.toString())

        const response = await fetch(`/api/work-reports/${reportId}/attachments`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'ファイルのアップロードに失敗しました')
        }

        const { attachment: uploadedAttachment } = await response.json()

        // アップロード成功: 一時IDをDB IDに置き換え
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? {
                  ...a,
                  id: uploadedAttachment.id,
                  uploaded: true,
                  storage_path: uploadedAttachment.storage_path,
                }
              : a
          )
        )
      } catch (error) {
        console.error('Upload error:', error)
        alert(error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました')
      }
    }

    setUploading(false)
  }

  const updateFileType = (id: string, file_type: Attachment['file_type']) => {
    const updatedAttachments = attachments.map((a) =>
      a.id === id ? { ...a, file_type } : a
    )
    setAttachments(updatedAttachments)
    onAttachmentsChange?.(updatedAttachments)
  }

  const updateDescription = (id: string, description: string) => {
    const updatedAttachments = attachments.map((a) =>
      a.id === id ? { ...a, description } : a
    )
    setAttachments(updatedAttachments)
    onAttachmentsChange?.(updatedAttachments)
  }

  const removeAttachment = async (id: string) => {
    const attachment = attachments.find((a) => a.id === id)

    if (attachment?.uploaded && reportId) {
      // サーバーから削除
      try {
        const response = await fetch(`/api/work-reports/${reportId}/attachments/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('ファイルの削除に失敗しました')
        }
      } catch (error) {
        console.error('Delete error:', error)
        alert('ファイルの削除に失敗しました')
        return
      }
    }

    const updatedAttachments = attachments.filter((a) => a.id !== id)
    setAttachments(updatedAttachments)
    onAttachmentsChange?.(updatedAttachments)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">添付ファイル</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          ファイルを追加
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            添付ファイルをアップロードしてください
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF、画像、Excel、Word形式、最大10MB
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-gray-400">
                  {getFileIcon(attachment.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file_name}
                      </p>
                      {attachment.file_size && (
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.file_size)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="flex-shrink-0 text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        種別
                      </label>
                      <select
                        value={attachment.file_type}
                        onChange={(e) =>
                          updateFileType(attachment.id, e.target.value as Attachment['file_type'])
                        }
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {FILE_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        説明（任意）
                      </label>
                      <input
                        type="text"
                        value={attachment.description}
                        onChange={(e) => updateDescription(attachment.id, e.target.value)}
                        placeholder="ファイルの説明を入力"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {attachment.uploaded && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      アップロード済み
                    </div>
                  )}
                  {uploading && !attachment.uploaded && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      アップロード中...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-blue-600">
          ファイルをアップロード中...
        </div>
      )}
    </div>
  )
}
