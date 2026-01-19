'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ProjectFormProps {
  project?: any
  mode?: 'create' | 'edit'
}

export function ProjectForm({ project, mode = 'create' }: ProjectFormProps) {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string>('')
  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const [siteSearchQuery, setSiteSearchQuery] = useState('')
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false)
  const siteDropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    project_code: project?.project_code || '',
    project_name: project?.project_name || '',
    client_id: project?.client_id || '',
    site_id: project?.site_id || '',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    contract_amount: project?.contract_amount?.toString() || '',
    budget_amount: project?.budget_amount?.toString() || '',
    status: project?.status || ('planning' as 'planning' | 'in_progress' | 'completed' | 'cancelled'),
    project_manager_id: project?.project_manager_id || ''
  })

  useEffect(() => {
    fetchClients()
    fetchUsers()
    fetchSites()
    fetchCsrfToken()
    if (mode === 'create') {
      generateProjectCode()
    }
  }, [mode])

  // 取引先変更時：紐づく現場を自動セット
  useEffect(() => {
    if (formData.client_id && sites.length > 0) {
      const clientSites = sites.filter(site => site.client_id === formData.client_id)

      // 紐づく現場が1件だけの場合は自動セット
      if (clientSites.length === 1) {
        setFormData(prev => ({ ...prev, site_id: clientSites[0].id }))
      } else if (clientSites.length === 0) {
        // 紐づく現場がない場合はクリア
        setFormData(prev => ({ ...prev, site_id: '' }))
      }
      // 2件以上の場合は既存の選択を保持（編集モード時）、または未選択のまま
    } else if (!formData.client_id) {
      // 取引先未選択の場合は現場もクリア
      setFormData(prev => ({ ...prev, site_id: '' }))
    }
  }, [formData.client_id, sites])

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch('/api/csrf-token')
      const data = await response.json()
      setCsrfToken(data.token)
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }
  }

  // ドロップダウン外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false)
        setClientSearchQuery('')
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
        setUserSearchQuery('')
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target as Node)) {
        setIsSiteDropdownOpen(false)
        setSiteSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?is_active=true&limit=1000')
      if (response.ok) {
        const result = await response.json()
        const filteredData = result.data?.filter((c: any) =>
          c.client_type === 'customer' || c.client_type === 'both'
        ) || []
        setClients(filteredData)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const hiraganaToKatakana = (str: string) => {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      const chr = match.charCodeAt(0) + 0x60
      return String.fromCharCode(chr)
    })
  }

  const filteredClients = clients.filter(client => {
    if (!clientSearchQuery) return true

    const query = clientSearchQuery.toLowerCase()
    const queryKatakana = hiraganaToKatakana(query)

    return (
      client.name?.toLowerCase().includes(query) ||
      client.name_kana?.toLowerCase().includes(query) ||
      client.name_kana?.toLowerCase().includes(queryKatakana.toLowerCase()) ||
      client.client_code?.toLowerCase().includes(query)
    )
  })

  const selectedClientName = clients.find(c => c.id === formData.client_id)?.name || ''
  const selectedUserName = users.find(u => u.id === formData.project_manager_id)?.name || ''
  const selectedSiteName = sites.find(s => s.id === formData.site_id)?.site_name || ''

  const filteredUsers = users.filter(user => {
    if (!userSearchQuery) return true

    const query = userSearchQuery.toLowerCase()
    const queryKatakana = hiraganaToKatakana(query)

    return (
      user.name?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(queryKatakana.toLowerCase()) ||
      user.email?.toLowerCase().includes(query)
    )
  })

  const filteredSites = sites.filter(site => {
    // 取引先が選択されている場合、その取引先に紐づく現場のみ表示
    if (formData.client_id && site.client_id !== formData.client_id) {
      return false
    }

    // 検索クエリでフィルタリング
    if (!siteSearchQuery) return true

    const query = siteSearchQuery.toLowerCase()
    const queryKatakana = hiraganaToKatakana(query)

    return (
      site.site_name?.toLowerCase().includes(query) ||
      site.site_name_kana?.toLowerCase().includes(query) ||
      site.site_name_kana?.toLowerCase().includes(queryKatakana.toLowerCase()) ||
      site.site_code?.toLowerCase().includes(query) ||
      site.address?.toLowerCase().includes(query)
    )
  })

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者'
      case 'leader': return 'リーダー'
      case 'manager': return 'マネージャー'
      case 'staff': return 'スタッフ'
      default: return role
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?is_active=true&limit=1000')
      if (response.ok) {
        const result = await response.json()
        const allUsers = result.data || []

        const roleOrder = { leader: 1, manager: 2, staff: 3, admin: 4 }
        const sortedUsers = allUsers.sort((a: any, b: any) => {
          const orderA = roleOrder[a.role as keyof typeof roleOrder] || 999
          const orderB = roleOrder[b.role as keyof typeof roleOrder] || 999
          if (orderA !== orderB) return orderA - orderB
          return (a.name || '').localeCompare(b.name || '')
        })

        setUsers(sortedUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites?is_active=true&limit=1000')
      if (response.ok) {
        const result = await response.json()
        const allSites = result.data || []

        // 現場名でソート
        const sortedSites = allSites.sort((a: any, b: any) => {
          return (a.site_name || '').localeCompare(b.site_name || '')
        })

        setSites(sortedSites)
      }
    } catch (error) {
      console.error('Error fetching sites:', error)
    }
  }

  const generateProjectCode = async () => {
    try {
      const year = new Date().getFullYear()
      const response = await fetch(`/api/projects?limit=1000&search=PRJ-${year}-`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || []

        if (data.length > 0) {
          const codes = data
            .map((p: any) => p.project_code)
            .filter((code: string) => code.startsWith(`PRJ-${year}-`))

          if (codes.length > 0) {
            const numbers = codes.map((code: string) => {
              const parts = code.split('-')
              return parseInt(parts[2] || '0')
            })
            const maxNumber = Math.max(...numbers)
            setFormData(prev => ({
              ...prev,
              project_code: `PRJ-${year}-${String(maxNumber + 1).padStart(4, '0')}`
            }))
          } else {
            setFormData(prev => ({
              ...prev,
              project_code: `PRJ-${year}-0001`
            }))
          }
        } else {
          setFormData(prev => ({
            ...prev,
            project_code: `PRJ-${year}-0001`
          }))
        }
      }
    } catch (error) {
      console.error('Error generating project code:', error)
      const year = new Date().getFullYear()
      setFormData(prev => ({
        ...prev,
        project_code: `PRJ-${year}-0001`
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const projectData = {
        project_code: formData.project_code,
        project_name: formData.project_name,
        client_id: formData.client_id || null,
        site_id: formData.site_id || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        contract_amount: formData.contract_amount ? parseFloat(formData.contract_amount) : null,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
        status: formData.status,
        project_manager_id: formData.project_manager_id || null
      }

      const url = mode === 'create' ? '/api/projects' : `/api/projects/${project.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        throw new Error('工事の保存に失敗しました')
      }

      router.push('/projects')
      router.refresh()
    } catch (error) {
      console.error('Error saving project:', error)
      alert('工事の保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本情報</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事番号
              </label>
              <input
                type="text"
                value={formData.project_code}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="planning">計画中</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              工事名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.project_name}
              onChange={(e) => setFormData({...formData, project_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              placeholder="〇〇ビル新築工事"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              発注者（取引先）
            </label>
            <div className="relative" ref={clientDropdownRef}>
              <input
                type="text"
                value={isClientDropdownOpen ? clientSearchQuery : selectedClientName}
                onChange={(e) => {
                  setClientSearchQuery(e.target.value)
                  setIsClientDropdownOpen(true)
                }}
                onFocus={() => setIsClientDropdownOpen(true)}
                placeholder="取引先を検索..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isClientDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredClients.length > 0 ? (
                    <ul>
                      {filteredClients.map(client => (
                        <li key={client.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({...formData, client_id: client.id})
                              setClientSearchQuery('')
                              setIsClientDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col"
                          >
                            <span className="font-medium">{client.name}</span>
                            <span className="text-xs text-gray-500">
                              {client.client_code}
                              {client.name_kana && ` / ${client.name_kana}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      該当する取引先が見つかりません
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.client_id && (
              <button
                type="button"
                onClick={() => {
                  setFormData({...formData, client_id: ''})
                  setClientSearchQuery('')
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              >
                選択をクリア
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              工事責任者
            </label>
            <div className="relative" ref={userDropdownRef}>
              <input
                type="text"
                value={isUserDropdownOpen ? userSearchQuery : selectedUserName}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value)
                  setIsUserDropdownOpen(true)
                }}
                onFocus={() => setIsUserDropdownOpen(true)}
                placeholder="責任者を検索..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isUserDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredUsers.length > 0 ? (
                    <ul>
                      {filteredUsers.map(user => (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({...formData, project_manager_id: user.id})
                              setUserSearchQuery('')
                              setIsUserDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                {getRoleLabel(user.role)}
                              </span>
                            </div>
                            {user.email && (
                              <span className="text-xs text-gray-500">{user.email}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      該当するユーザーが見つかりません
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.project_manager_id && (
              <button
                type="button"
                onClick={() => {
                  setFormData({...formData, project_manager_id: ''})
                  setUserSearchQuery('')
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              >
                選択をクリア
              </button>
            )}
          </div>

          {/* 現場選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              関連現場
            </label>
            <div className="relative" ref={siteDropdownRef}>
              <input
                type="text"
                value={isSiteDropdownOpen ? siteSearchQuery : selectedSiteName}
                onChange={(e) => {
                  setSiteSearchQuery(e.target.value)
                  setIsSiteDropdownOpen(true)
                }}
                onFocus={() => setIsSiteDropdownOpen(true)}
                placeholder={formData.client_id ? "取引先に紐づく現場を検索..." : "まず取引先を選択してください"}
                disabled={!formData.client_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                disabled={!formData.client_id}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isSiteDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSites.length > 0 ? (
                    <ul>
                      {filteredSites.map(site => (
                        <li key={site.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({...formData, site_id: site.id})
                              setSiteSearchQuery('')
                              setIsSiteDropdownOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col"
                          >
                            <span className="font-medium">{site.site_name}</span>
                            <span className="text-xs text-gray-500">
                              {site.site_code}
                              {site.address && ` / ${site.address}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      {formData.client_id
                        ? '選択された取引先に紐づく現場がありません'
                        : '該当する現場が見つかりません'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {formData.site_id && (
              <button
                type="button"
                onClick={() => {
                  setFormData({...formData, site_id: ''})
                  setSiteSearchQuery('')
                }}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              >
                選択をクリア
              </button>
            )}
            <p className="mt-1 text-xs text-gray-500">
              ※ 取引先を選択すると、その取引先に紐づく現場が表示されます
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">工期・金額</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事開始日
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事完了予定日
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                min={formData.start_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                契約金額
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">¥</span>
                <input
                  type="number"
                  value={formData.contract_amount}
                  onChange={(e) => setFormData({...formData, contract_amount: e.target.value})}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                  step="1"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                予算金額
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">¥</span>
                <input
                  type="number"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({...formData, budget_amount: e.target.value})}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                  step="1"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* フォームフッター */}
      <div className="px-4 py-3 bg-white text-right sm:px-6 space-x-3 sm:rounded-b-lg">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          disabled={loading}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : mode === 'create' ? '登録' : '更新'}
        </button>
      </div>
    </form>
  )
}
