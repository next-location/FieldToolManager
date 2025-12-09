'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import { importToolMastersFromCSV } from './actions'

type Category = {
  id: string
  name: string
}

type CSVRow = {
  name: string
  model_number?: string
  manufacturer?: string
  category?: string
  unit?: string
  minimum_stock?: string
  notes?: string
}

type Props = {
  categories: Category[]
  organizationId: string
}

export function CSVImportClient({ categories, organizationId }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<CSVRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CSVテンプレートをダウンロード
  const handleDownloadTemplate = () => {
    const template = `name,model_number,manufacturer,category,unit,minimum_stock,notes
電動ドライバー,DD-100,マキタ,電動工具,台,1,14.4V充電式
インパクトドライバー,ID-200,日立,電動工具,台,1,18V充電式
ハンマー,HM-01,トンボ,手工具,個,2,500g`

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '道具マスタインポートテンプレート.csv'
    link.click()
  }

  // ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    // CSVをパース
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        setPreviewData(results.data as CSVRow[])
      },
      error: (err) => {
        setError(`CSVの読み込みに失敗しました: ${err.message}`)
      },
    })
  }

  // インポート実行
  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      setError('ファイルを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // カテゴリ名からIDへのマッピング作成
      const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.name] = cat.id
        return acc
      }, {} as Record<string, string>)

      // データ変換
      const toolMasters = previewData.map((row) => ({
        name: row.name,
        model_number: row.model_number || undefined,
        manufacturer: row.manufacturer || undefined,
        category_id: row.category ? categoryMap[row.category] : undefined,
        unit: row.unit || '個',
        minimum_stock: row.minimum_stock ? parseInt(row.minimum_stock, 10) : 1,
        notes: row.notes || undefined,
      }))

      const result = await importToolMastersFromCSV(toolMasters)

      if (result.error) {
        setError(result.error)
      } else {
        alert(`${result.count}件の道具マスタをインポートしました`)
        router.push('/master/tools')
      }
    } catch (err: any) {
      setError(err.message || 'インポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/master/tools"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← 道具マスタ管理に戻る
        </Link>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            道具マスタCSVインポート
          </h1>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: テンプレートダウンロード */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              1. CSVテンプレートをダウンロード
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              以下のボタンからテンプレートをダウンロードして、Excelなどで編集してください。
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              📄 テンプレートダウンロード
            </button>
          </div>

          {/* Step 2: CSVフォーマット説明 */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              2. CSVフォーマット
            </h2>
            <div className="bg-gray-50 rounded-md p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      列名
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      必須
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">
                      説明
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">name</td>
                    <td className="py-2 px-3">
                      <span className="text-red-600">必須</span>
                    </td>
                    <td className="py-2 px-3">道具名</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">model_number</td>
                    <td className="py-2 px-3">任意</td>
                    <td className="py-2 px-3">型番</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">manufacturer</td>
                    <td className="py-2 px-3">任意</td>
                    <td className="py-2 px-3">メーカー名</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">category</td>
                    <td className="py-2 px-3">任意</td>
                    <td className="py-2 px-3">カテゴリ名（既存のカテゴリ名を指定）</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">unit</td>
                    <td className="py-2 px-3">任意</td>
                    <td className="py-2 px-3">単位（デフォルト: 個）</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">minimum_stock</td>
                    <td className="py-2 px-3">任意</td>
                    <td className="py-2 px-3">最小在庫数（デフォルト: 1）</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-blue-600">notes</td>
                    <td className="py-2 px-3">任意</td>
                    <td className="py-2 px-3">備考</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Step 3: ファイル選択 */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              3. CSVファイルを選択
            </h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
            <p className="mt-2 text-sm text-gray-500">
              UTF-8エンコーディングのCSVファイルを選択してください
            </p>
          </div>

          {/* Step 4: プレビュー */}
          {previewData.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-3">
                4. プレビュー（{previewData.length}件）
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        道具名
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        型番
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        メーカー
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        カテゴリ
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        単位
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        最小在庫
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.model_number || '-'}</td>
                        <td className="px-3 py-2">{row.manufacturer || '-'}</td>
                        <td className="px-3 py-2">{row.category || '-'}</td>
                        <td className="px-3 py-2">{row.unit || '個'}</td>
                        <td className="px-3 py-2">{row.minimum_stock || '1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    ...他 {previewData.length - 10} 件
                  </p>
                )}
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/master/tools"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              キャンセル
            </Link>
            <button
              onClick={handleImport}
              disabled={loading || previewData.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'インポート中...' : `${previewData.length}件をインポート`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
