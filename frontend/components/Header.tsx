'use client'

import { useState } from 'react'
import { BellIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export default function Header() {
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(3)

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search symbols, trades..."
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Connected</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <BellIcon className="h-5 w-5 text-gray-400" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] font-semibold text-white flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
