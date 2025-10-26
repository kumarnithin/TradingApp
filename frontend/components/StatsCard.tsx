'use client'

import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface StatsCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  gradient: string
}

export default function StatsCard({ title, value, change, icon, gradient }: StatsCardProps) {
  const isPositive = change ? change >= 0 : null

  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${gradient}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm font-semibold ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {isPositive ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-2">{title}</h3>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}
