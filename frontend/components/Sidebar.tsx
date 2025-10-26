'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', gradient: 'from-blue-500 to-cyan-500' },
  { name: 'Signals', href: '/dashboard/signals', icon: '🔔', gradient: 'from-purple-500 to-pink-500' },
  { name: 'Trades', href: '/dashboard/trades', icon: '💰', gradient: 'from-green-500 to-emerald-500' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📈', gradient: 'from-orange-500 to-red-500' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️', gradient: 'from-gray-500 to-slate-500' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-72 lg:flex lg:flex-col glass border-r border-white/10">
      {/* Logo Section */}
      <div className="flex items-center justify-center h-20 border-b border-white/10">
        <div className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <span className="text-2xl">🚀</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            TradingBot
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-4 py-4 rounded-2xl transition-all duration-300
                ${isActive 
                  ? 'glass-light shadow-lg shadow-blue-500/20' 
                  : 'hover:glass-light'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-lg
                bg-gradient-to-br ${item.gradient} 
                ${isActive ? 'shadow-lg' : 'opacity-70 group-hover:opacity-100'}
                transition-all duration-300 group-hover:scale-110
              `}>
                {item.icon}
              </div>
              <span className={`
                ml-4 font-semibold text-sm
                ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}
                transition-colors duration-300
              `}>
                {item.name}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className="glass-light rounded-2xl p-4 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer group">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
              D
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Demo User</p>
              <p className="text-xs text-white/60">Paper Trading</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
          </div>
        </div>
      </div>
    </div>
  )
}
