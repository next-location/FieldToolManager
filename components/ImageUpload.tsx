'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface ImageUploadProps {
  organizationId: string
  currentImageUrl?: string | null
  onImageUploaded: (url: string) => void
  onImageRemoved: () => void
}

export function ImageUpload({
  organizationId,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください')
      return
    }

    // ファイルタイプチェック
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPEG、PNG、WebP形式の画像のみアップロード可能です')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // ファイル名生成 (organization_id/timestamp_randomstring.ext)
      const fileExt = file.name.split('.').pop()
      const fileName = `${organizationId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      // Supabase Storageにアップロード
      const { data, error: uploadError } = await supabase.storage
        .from('tool-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('tool-images')
        .getPublicUrl(data.path)

      const publicUrl = urlData.publicUrl

      // プレビュー表示用にローカルURLを生成
      const localUrl = URL.createObjectURL(file)
      setPreview(localUrl)

      // 親コンポーネントにURLを渡す
      onImageUploaded(publicUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentImageUrl) return

    try {
      // URLからパスを抽出
      const url = new URL(currentImageUrl)
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/tool-images\/(.+)/)
      if (pathMatch) {
        const filePath = pathMatch[1]

        // Storageから削除
        const { error } = await supabase.storage
          .from('tool-images')
          .remove([filePath])

        if (error) {
          console.error('Delete error:', error)
        }
      }

      setPreview(null)
      onImageRemoved()
    } catch (err: any) {
      console.error('Remove error:', err)
      setError('画像の削除に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          道具画像
        </label>

        {preview ? (
          <div className="relative">
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={preview}
                alt="道具画像プレビュー"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
          >
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600 mb-1">クリックして画像を選択</p>
            <p className="text-xs text-gray-500">JPEG, PNG, WebP (最大5MB)</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {uploading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">アップロード中...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        ※ 画像は組織ごとに管理され、他の組織からは閲覧できません
      </p>
    </div>
  )
}
