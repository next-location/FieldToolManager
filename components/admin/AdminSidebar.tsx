'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const menuItems = [
  {
    name: 'ダッシュボード',
    href: '/admin/dashboard',
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: '契約管理',
    href: '/admin/contracts',
    requiredRole: null, // 全員表示（営業は閲覧のみ）
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: '請求書管理',
    href: '/admin/invoices',
    requiredRole: null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
      </svg>
    ),
  },
  {
    name: '入金管理',
    href: '/admin/payments',
    requiredRole: null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: '組織管理',
    href: '/admin/organizations',
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: '営業管理',
    hasSubmenu: true,
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    submenu: [
      {
        name: 'ダッシュボード',
        href: '/admin/sales',
      },
      {
        name: '営業案件一覧',
        href: '/admin/sales/leads',
      },
    ],
  },
  {
    name: 'マスタ管理',
    hasSubmenu: true,
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    submenu: [
      {
        name: '共通道具マスタ',
        href: '/admin/tools/common',
      },
      {
        name: 'メーカーマスタ',
        href: '/admin/manufacturers',
      },
      {
        name: '未登録メーカー',
        href: '/admin/manufacturers/unregistered',
      },
    ],
  },
  {
    name: 'パッケージ設定',
    href: '/admin/packages',
    requiredRole: 'owner', // オーナーのみ
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    name: '操作ログ',
    href: '/admin/logs',
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: '売上分析',
    href: '/admin/analytics',
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: '管理者アカウント',
    href: '/admin/admins',
    requiredRole: 'owner', // オーナーのみ
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: '設定',
    href: '/admin/settings',
    requiredRole: null, // 全員表示
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<'owner' | 'sales' | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    // 初期表示で営業管理配下のページなら営業管理を開く
    if (pathname.startsWith('/admin/sales')) {
      return '営業管理';
    }
    // 初期表示でマスタ管理配下のページならマスタ管理を開く
    if (pathname.startsWith('/admin/tools/common') || pathname.startsWith('/admin/manufacturers')) {
      return 'マスタ管理';
    }
    return null;
  });

  // ユーザーの権限を取得
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/admin/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  const toggleSubmenu = (menuName: string) => {
    setOpenSubmenu(openSubmenu === menuName ? null : menuName);
  };

  // 権限に基づいてメニューをフィルタリング
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.requiredRole) return true; // requiredRole が null なら全員表示
    if (!userRole) return false; // ユーザーのロールが取得できていない場合は非表示
    return userRole === item.requiredRole; // owner のみのメニューはオーナーだけ表示
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* メニュー */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {filteredMenuItems.map((item) => {
            if (item.hasSubmenu && item.submenu) {
              const isOpen = openSubmenu === item.name;
              const isActiveSection =
                (item.name === '営業管理' && pathname.startsWith('/admin/sales')) ||
                (item.name === 'マスタ管理' && (pathname.startsWith('/admin/tools/common') || pathname.startsWith('/admin/manufacturers')));

              return (
                <li key={item.name}>
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                      isActiveSection
                        ? 'bg-blue-50 text-[#1E6FFF]'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* サブメニュー */}
                  {isOpen && (
                    <ul className="mt-1 ml-8 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isActive = pathname === subItem.href;
                        return (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? 'bg-[#1E6FFF] text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#1E6FFF] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* フッター */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-center text-gray-500">
          © 2025 ザイロク
        </p>
      </div>
    </div>
  );
}
