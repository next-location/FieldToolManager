'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, GripVertical } from 'lucide-react'

interface Photo {
  id: string // 一時ID（アップロード前）またはDB ID（アップロード後）
  file?: File
  preview?: string
  caption: string
  photo_type?: string
  display_order: number
  taken_at?: string
  location_name?: string
  uploaded?: boolean // アップロード済みかどうか
  storage_path?: string
}

interface PhotoUploadProps {
  reportId?: string // 作成後のreport IDが渡される
  onPhotosChange?: (photos: Photo[]) => void
}

export function PhotoUpload({ reportId, onPhotosChange }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 既存の写真を読み込む
  useEffect(() => {
    if (!reportId) return

    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/work-reports/${reportId}/photos`)
        if (!response.ok) return

        const data = await response.json()
        const existingPhotos = (data.photos || []).map((photo: any) => ({
          id: photo.id,
          preview: photo.photo_url,
          caption: photo.caption || '',
          photo_type: photo.photo_type,
          display_order: photo.display_order,
          taken_at: photo.taken_at,
          location_name: photo.location_name,
          uploaded: true,
          storage_path: photo.storage_path,
        }))
        setPhotos(existingPhotos)
      } catch (error) {
        console.error('写真の読み込みエラー:', error)
      }
    }

    fetchPhotos()
  }, [reportId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // ファイルサイズチェック（5MB）
    const MAX_SIZE = 5 * 1024 * 1024
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) {
        alert(`${file.name} はサイズが大きすぎます（最大5MB）`)
        return false
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(`${file.name} は対応していない形式です（JPEG, PNG, WebPのみ）`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // プレビュー用のURLを生成して新しい写真を追加
    const newPhotos: Photo[] = validFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      display_order: photos.length + index,
      uploaded: false,
    }))

    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotosChange?.(updatedPhotos)

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // reportIdがある場合は即座にアップロード
    if (reportId) {
      await uploadPhotos(newPhotos)
    }
  }

  const uploadPhotos = async (photosToUpload: Photo[]) => {
    setUploading(true)

    for (const photo of photosToUpload) {
      if (!photo.file || photo.uploaded) continue

      try {
        const formData = new FormData()
        formData.append('file', photo.file)
        formData.append('caption', photo.caption || '')
        formData.append('display_order', photo.display_order.toString())
        if (photo.taken_at) formData.append('taken_at', photo.taken_at)
        if (photo.location_name) formData.append('location_name', photo.location_name)

        const response = await fetch(`/api/work-reports/${reportId}/photos`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '写真のアップロードに失敗しました')
        }

        const { photo: uploadedPhoto } = await response.json()

        // アップロード成功: 一時IDをDB IDに置き換え、uploaded フラグを設定
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? {
                  ...p,
                  id: uploadedPhoto.id,
                  uploaded: true,
                  storage_path: uploadedPhoto.storage_path,
                }
              : p
          )
        )
      } catch (error) {
        console.error('Upload error:', error)
        alert(error instanceof Error ? error.message : '写真のアップロードに失敗しました')
      }
    }

    setUploading(false)
  }

  const updateCaption = (id: string, caption: string) => {
    const updatedPhotos = photos.map((p) => (p.id === id ? { ...p, caption } : p))
    setPhotos(updatedPhotos)
    onPhotosChange?.(updatedPhotos)

    // アップロード済みの写真の場合、サーバーに更新を送信
    const photo = photos.find((p) => p.id === id)
    if (photo?.uploaded && reportId) {
      updatePhotoOnServer(id, { caption })
    }
  }

  const updatePhotoOnServer = async (photoId: string, updates: Partial<Photo>) => {
    try {
      const response = await fetch(`/api/work-reports/${reportId}/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('写真情報の更新に失敗しました')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('写真情報の更新に失敗しました')
    }
  }

  const removePhoto = async (id: string) => {
    const photo = photos.find((p) => p.id === id)

    if (photo?.uploaded && reportId) {
      // サーバーから削除
      try {
        const response = await fetch(`/api/work-reports/${reportId}/photos/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('写真の削除に失敗しました')
        }
      } catch (error) {
        console.error('Delete error:', error)
        alert('写真の削除に失敗しました')
        return
      }
    }

    // プレビューURLをクリーンアップ
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview)
    }

    const updatedPhotos = photos.filter((p) => p.id !== id)
    setPhotos(updatedPhotos)
    onPhotosChange?.(updatedPhotos)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === index) return

    const newPhotos = [...photos]
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1)
    newPhotos.splice(index, 0, draggedPhoto)

    // display_order を更新
    const updatedPhotos = newPhotos.map((photo, idx) => ({
      ...photo,
      display_order: idx,
    }))

    setPhotos(updatedPhotos)
    setDraggedIndex(index)
    onPhotosChange?.(updatedPhotos)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    // アップロード済みの写真の順序をサーバーに反映
    if (reportId) {
      for (const photo of photos) {
        if (photo.uploaded) {
          await updatePhotoOnServer(photo.id, { display_order: photo.display_order })
        }
      }
    }

    setDraggedIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">写真</h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          写真を追加
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            写真をアップロードしてください
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPEG, PNG, WebP形式、最大5MB
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative border rounded-lg overflow-hidden ${
                draggedIndex === index ? 'opacity-50' : ''
              } cursor-move`}
            >
              <div className="aspect-video bg-gray-100 relative">
                {photo.preview && (
                  <img
                    src={photo.preview}
                    alt={photo.caption || '写真'}
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute top-2 left-2 p-1 bg-gray-800 bg-opacity-50 text-white rounded">
                  <GripVertical className="h-4 w-4" />
                </div>
                {photo.uploaded && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                    アップロード済み
                  </div>
                )}
                {uploading && !photo.uploaded && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    アップロード中...
                  </div>
                )}
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => updateCaption(photo.id, e.target.value)}
                  placeholder="キャプション（任意）"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 text-xs text-gray-500">
                  表示順: {photo.display_order + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-blue-600">
          写真をアップロード中...
        </div>
      )}
    </div>
  )
}
