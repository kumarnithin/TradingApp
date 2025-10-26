'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Signals', href: '/dashboard/signals', icon: '🔔' },
  { name: 'Trades', href: '/dashboard/trades', icon: '💰' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:flex lg:flex-col bg-slate-900 border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-slate-800">
        <span className="text-2xl font-bold text-blue-500">🚀</span>
        <span className="text-xl font-bold text-white ml-2">TradingBot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/50">
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">D</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Demo User</p>
            <p className="text-xs text-gray-400">Paper Trading</p>
          </div>
        </div>
      </div>
    </div>
  )
}
