'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ChartBarIcon, 
  BellIcon, 
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ArrowTrendingUpIcon 
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Signals', href: '/dashboard/signals', icon: BellIcon },
  { name: 'Trades', href: '/dashboard/trades', icon: CurrencyDollarIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-slate-800">
        <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
        <span className="ml-3 text-xl font-bold text-white">TradingBot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Account info */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold">U</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Demo User</p>
            <p className="text-xs text-gray-400">Paper Trading</p>
          </div>
        </div>
      </div>
    </div>
  )
}
