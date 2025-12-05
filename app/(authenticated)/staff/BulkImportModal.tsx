'use client'

import { useState } from 'react'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface StaffImportRow {
  name: string
  email: string
  password: string
  role: 'admin' | 'leader' | 'staff'
  department?: string
  employee_id?: string
  phone?: string
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<StaffImportRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const handleDownloadTemplate = () => {
    const csvContent = `name,email,password,role,department,employee_id,phone
山田太郎,yamada@example.com,password123,staff,工事部,E001,090-1234-5678
佐藤花子,sato@example.com,password123,leader,営業部,E002,080-2345-6789`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'staff_import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0])
      setParsedData([])
      setError('')
      setResult(null)
    }
  }

  const parseCSV = async () => {
    if (!csvFile) {
      setError('CSVファイルを選択してください')
      return
    }

    setParsing(true)
    setError('')

    try {
      const text = await csvFile.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        throw new Error('CSVファイルにデータがありません')
      }

      // ヘッダー行をパース
      const headers = lines[0].split(',').map((h) => h.trim())

      // 必須カラムチェック
      const requiredHeaders = ['name', 'email', 'password', 'role']
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        throw new Error(`必須カラムが不足しています: ${missingHeaders.join(', ')}`)
      }

      // データ行をパース
      const data: StaffImportRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim())
        if (values.length !== headers.length) {
          throw new Error(`行${i + 1}: カラム数が一致しません`)
        }

        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || undefined
        })

        data.push({
          name: row.name,
          email: row.email,
          password: row.password,
          role: row.role as 'admin' | 'leader' | 'staff',
          department: row.department,
          employee_id: row.employee_id,
          phone: row.phone,
        })
      }

      setParsedData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (parsedData.length === 0) {
      setError('インポートするデータがありません')
      return
    }

    setImporting(true)
    setError('')

    try {
      const response = await fetch('/api/staff/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff: parsedData }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.validation_errors) {
          throw new Error(`バリデーションエラー:\n${data.validation_errors.join('\n')}`)
        }
        if (data.duplicate_emails) {
          throw new Error(`重複するメールアドレス:\n${data.duplicate_emails.join('\n')}`)
        }
        throw new Error(data.error || 'インポートに失敗しました')
      }

      setResult(data)
      if (data.success > 0) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setCsvFile(null)
    setParsedData([])
    setError('')
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">CSV一括登録</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* ステップ1: テンプレートダウンロード */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">ステップ1: テンプレートをダウンロード</h3>
            <p className="text-sm text-gray-600 mb-3">
              CSVテンプレートをダウンロードし、スタッフ情報を入力してください。
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              📥 テンプレートをダウンロード
            </button>
          </div>

          {/* ステップ2: CSVファイルアップロード */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">ステップ2: CSVファイルをアップロード</h3>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {csvFile && (
              <p className="mt-2 text-sm text-gray-600">選択: {csvFile.name}</p>
            )}
          </div>

          {/* ステップ3: プレビュー */}
          {csvFile && parsedData.length === 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">ステップ3: プレビュー</h3>
              <button
                onClick={parseCSV}
                disabled={parsing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {parsing ? '解析中...' : 'CSVを解析'}
              </button>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* プレビューテーブル */}
          {parsedData.length > 0 && !result && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">プレビュー（{parsedData.length}件）</h3>
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">名前</th>
                      <th className="px-4 py-2 text-left">メール</th>
                      <th className="px-4 py-2 text-left">権限</th>
                      <th className="px-4 py-2 text-left">部署</th>
                      <th className="px-4 py-2 text-left">社員番号</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.email}</td>
                        <td className="px-4 py-2">{row.role}</td>
                        <td className="px-4 py-2">{row.department || '-'}</td>
                        <td className="px-4 py-2">{row.employee_id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* インポート結果 */}
          {result && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">インポート結果</h3>
              <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-3">
                <p className="text-blue-800">
                  ✅ 成功: {result.success}件 | ❌ 失敗: {result.failed}件
                </p>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded">
                  <p className="font-semibold text-yellow-800 mb-2">エラー詳細:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            {result ? '閉じる' : 'キャンセル'}
          </button>
          {parsedData.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? 'インポート中...' : `${parsedData.length}件をインポート`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
