'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface UploadedPhoto {
  id: string
  photo_url: string
  photo_type: string
  caption?: string
  file_size: number
}

interface PhotoUploaderProps {
  reportId: string
  onUploadComplete?: (photo: UploadedPhoto) => void
  onDeleteComplete?: (photoId: string) => void
}

const photoTypeLabels: Record<string, string> = {
  before: '作業前',
  during: '作業中',
  after: '作業後',
  issue: '問題点',
  other: 'その他',
}

export function PhotoUploader({ reportId, onUploadComplete, onDeleteComplete }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('during')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 写真一覧を取得
  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/work-reports/${reportId}/photos`)
      if (response.ok) {
        const data = await response.json()
        setPhotos(data)
      }
    } catch (err) {
      console.error('写真取得エラー:', err)
    }
  }

  // コンポーネントマウント時に写真を取得
  useState(() => {
    if (reportId) {
      fetchPhotos()
    }
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください')
      return
    }

    // MIMEタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('JPEGまたはPNG形式の画像をアップロードしてください')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('photo_type', selectedType)
      if (caption) {
        formData.append('caption', caption)
      }

      const response = await fetch(`/api/work-reports/${reportId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      const newPhoto = await response.json()
      setPhotos([...photos, newPhoto])
      setCaption('')

      if (onUploadComplete) {
        onUploadComplete(newPhoto)
      }

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

  const handleDelete = async (photoId: string) => {
    if (!confirm('この写真を削除しますか？')) return

    try {
      const response = await fetch(`/api/work-reports/${reportId}/photos/${photoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      setPhotos(photos.filter((p) => p.id !== photoId))

      if (onDeleteComplete) {
        onDeleteComplete(photoId)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* アップロードフォーム */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">写真を追加</h4>

        <div className="space-y-3">
          {/* 写真タイプ選択 */}
          <div>
            <label htmlFor="photo_type" className="block text-sm font-medium text-gray-700 mb-1">
              写真タイプ
            </label>
            <select
              id="photo_type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(photoTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* キャプション */}
          <div>
            <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
              説明（オプション）
            </label>
            <input
              type="text"
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="例: 基礎工事完了時"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ファイル選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              画像ファイル
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, WebP形式（最大5MB）
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

      {/* アップロード済み写真一覧 */}
      {photos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            アップロード済み写真 ({photos.length}枚)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={photo.photo_url}
                    alt={photo.caption || photoTypeLabels[photo.photo_type]}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      {photoTypeLabels[photo.photo_type]}
                    </span>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                  {photo.caption && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatFileSize(photo.file_size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
