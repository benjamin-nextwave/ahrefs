'use client'

import { useState } from 'react'
import UploadForm from './components/UploadForm'
import JobsList from './components/JobsList'

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  totalDomains: number
  completedDomains: number
  failedDomains: number
  processingToday: number
}

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0, activeJobs: 0, totalDomains: 0,
    completedDomains: 0, failedDomains: 0, processingToday: 0,
  })

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleStatsUpdate = (newStats: DashboardStats) => {
    setStats(newStats)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Jobs" value={stats.totalJobs} color="slate" />
        <StatCard label="Active" value={stats.activeJobs} color="blue" pulse={stats.activeJobs > 0} />
        <StatCard label="Total Domains" value={stats.totalDomains} color="slate" />
        <StatCard label="Completed" value={stats.completedDomains} color="emerald" />
        <StatCard label="Failed" value={stats.failedDomains} color="red" />
        <StatCard label="Today" value={stats.processingToday} color="teal" pulse={stats.processingToday > 0} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <UploadForm onUploadSuccess={handleUploadSuccess} />
        </div>
        <div className="lg:col-span-2">
          <JobsList refreshTrigger={refreshTrigger} onStatsUpdate={handleStatsUpdate} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, pulse }: {
  label: string
  value: number
  color: string
  pulse?: boolean
}) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
  }

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] || colorMap.slate}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium opacity-70">{label}</p>
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-50"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current opacity-75"></span>
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-1 animate-count-up">{value.toLocaleString()}</p>
    </div>
  )
}
