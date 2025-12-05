'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface Photo {
  id: string
  photo_url: string
  photo_type: string
  caption?: string
  file_size: number
  uploaded_at: string
}

interface PhotoGalleryProps {
  reportId: string
  canEdit: boolean
}

const photoTypeLabels: Record<string, string> = {
  before: '作業前',
  during: '作業中',
  after: '作業後',
  issue: '問題点',
  other: 'その他',
}

export function PhotoGallery({ reportId, canEdit }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('during')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 写真を取得
  useEffect(() => {
    fetchPhotos()
  }, [reportId])

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/work-reports/${reportId}/photos`)
      if (response.ok) {
        const data = await response.json()
        setPhotos(data)
      }
    } catch (err) {
      console.error('写真取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

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
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null)
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
    <>
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            写真 {photos.length > 0 && `(${photos.length}枚)`}
          </h3>

          {/* アップロードフォーム（編集可能な場合のみ） */}
          {canEdit && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">写真を追加</h4>

              <div className="space-y-3">
                {/* 写真タイプ選択 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                </div>

                {/* ファイル選択 */}
                <div>
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
          )}

          {/* 写真ギャラリー */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group">
                  <div
                    className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <Image
                      src={photo.photo_url}
                      alt={photo.caption || photoTypeLabels[photo.photo_type]}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        {photoTypeLabels[photo.photo_type]}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(photo.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    {photo.caption && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {canEdit ? '写真を追加してください' : '写真がありません'}
            </div>
          )}
        </div>
      </div>

      {/* 画像ビューアーモーダル */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="bg-white rounded-lg overflow-hidden">
              <div className="relative" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.caption || photoTypeLabels[selectedPhoto.photo_type]}
                  className="w-full h-auto"
                />
              </div>

              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {photoTypeLabels[selectedPhoto.photo_type]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatFileSize(selectedPhoto.file_size)}
                  </span>
                </div>
                {selectedPhoto.caption && (
                  <p className="text-sm text-gray-700">{selectedPhoto.caption}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(selectedPhoto.uploaded_at).toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
