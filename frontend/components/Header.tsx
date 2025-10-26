'use client'

import { useState } from 'react'

export default function Header() {
  const [searchFocus, setSearchFocus] = useState(false)

  return (
    <header className="sticky top-0 z-40 h-20 glass border-b border-white/10 backdrop-blur-2xl">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className={`
            relative transition-all duration-300
            ${searchFocus ? 'scale-105' : 'scale-100'}
          `}>
            <input
              type="text"
              placeholder="Search symbols, trades..."
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              className={`
                w-full h-12 pl-12 pr-4 rounded-2xl
                glass-light text-white text-sm placeholder-white/50
                focus:outline-none transition-all duration-300
                ${searchFocus 
                  ? 'border-blue-500/50 shadow-lg shadow-blue-500/20' 
                  : 'border-transparent'
                }
              `}
            />
            <svg 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4 ml-6">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2 px-4 py-2 glass-light rounded-xl">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-xs font-semibold text-white/80 hidden sm:inline">Connected</span>
          </div>

          {/* Notifications */}
          <button className="w-10 h-10 glass-light rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:scale-110 group relative">
            <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
              3
            </div>
          </button>

          {/* Settings */}
          <button className="w-10 h-10 glass-light rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:scale-110 hover:rotate-90 group">
            <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
