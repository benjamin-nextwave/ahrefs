'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import JobProgress from './JobProgress'
import ExportButton from './ExportButton'

interface ScanJob {
  id: string
  name: string
  total_domains: number
  status: string
  enrichment_type: 'webshop' | 'bouwbedrijf'
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

interface JobWithStats extends ScanJob {
  stats: {
    completed: number
    failed: number
    processing: number
    pending: number
    total: number
  }
  today_stats?: {
    scheduled: number
    completed: number
    processing: number
  }
}

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  totalDomains: number
  completedDomains: number
  failedDomains: number
  processingToday: number
}

interface JobsListProps {
  refreshTrigger: number
  onStatsUpdate?: (stats: DashboardStats) => void
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function getDaysElapsed(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function getTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diff = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function JobsList({ refreshTrigger, onStatsUpdate }: JobsListProps) {
  const [jobs, setJobs] = useState<JobWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data)
      setError(null)

      // Compute dashboard stats
      if (onStatsUpdate) {
        const activeJobs = data.filter((j: JobWithStats) => j.status === 'running' || j.status === 'pending').length
        const totalDomains = data.reduce((sum: number, j: JobWithStats) => sum + j.total_domains, 0)
        const completedDomains = data.reduce((sum: number, j: JobWithStats) => sum + j.stats.completed, 0)
        const failedDomains = data.reduce((sum: number, j: JobWithStats) => sum + j.stats.failed, 0)
        const processingToday = data.reduce((sum: number, j: JobWithStats) => sum + (j.today_stats?.scheduled || 0), 0)
        onStatsUpdate({
          totalJobs: data.length,
          activeJobs,
          totalDomains,
          completedDomains,
          failedDomains,
          processingToday,
        })
      }
    } catch {
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [onStatsUpdate])

  useEffect(() => {
    fetchJobs()
  }, [refreshTrigger, fetchJobs])

  useEffect(() => {
    const interval = setInterval(fetchJobs, 30000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      setJobs(jobs.filter(j => j.id !== jobId))
    } catch {
      alert('Failed to delete job')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-slate-200 rounded w-1/4"></div>
          <div className="h-28 bg-slate-100 rounded-xl"></div>
          <div className="h-28 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchJobs} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
          Retry
        </button>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">No scan jobs yet</p>
        <p className="text-sm text-slate-400 mt-1">Upload a CSV to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold text-slate-800">Scan Jobs</h2>
        <span className="text-xs text-slate-400">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onDelete={handleDelete}
            onClick={() => router.push(`/jobs/${job.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

function JobCard({ job, onDelete, onClick }: {
  job: JobWithStats
  onDelete: (e: React.MouseEvent, id: string) => void
  onClick: () => void
}) {
  const daysRemaining = getDaysRemaining(job.end_date)
  const daysElapsed = getDaysElapsed(job.start_date)
  const totalDays = getTotalDays(job.start_date, job.end_date)
  const timeProgress = Math.min(100, (daysElapsed / totalDays) * 100)
  const isActive = job.status === 'running' || job.status === 'pending'
  const isComplete = job.status === 'completed'

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed' },
    running: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Running' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  }

  const status = statusConfig[job.status] || statusConfig.pending

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border shadow-sm transition-all duration-200 cursor-pointer
        hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5
        ${isActive ? 'border-blue-200' : 'border-slate-200'}
      `}
    >
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 truncate">{job.name}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                job.enrichment_type === 'bouwbedrijf'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {job.enrichment_type === 'bouwbedrijf' ? 'Bouwbedrijf' : 'Webshop'}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3 shrink-0" onClick={e => e.stopPropagation()}>
            <ExportButton jobId={job.id} disabled={job.stats.completed === 0} />
            <button
              onClick={(e) => onDelete(e, job.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete job"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MiniStat label="Total" value={job.total_domains} />
          <MiniStat label="Completed" value={job.stats.completed} color="emerald" />
          <MiniStat label="Failed" value={job.stats.failed} color={job.stats.failed > 0 ? 'red' : undefined} />
          <MiniStat
            label={isComplete ? 'Done' : `${daysRemaining}d left`}
            value={isComplete ? job.stats.completed : daysRemaining}
            color={isComplete ? 'emerald' : daysRemaining <= 2 ? 'amber' : 'blue'}
            suffix={isComplete ? '' : 'd'}
            isCountdown={!isComplete}
          />
        </div>

        {/* Progress Bar */}
        <JobProgress stats={job.stats} todayStats={job.today_stats} />

        {/* Time Progress */}
        {isActive && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Day {daysElapsed} of {totalDays}</span>
              <span>{job.start_date} - {job.end_date}</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-300 rounded-full transition-all duration-500"
                style={{ width: `${timeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Today's Activity */}
        {job.today_stats && job.today_stats.scheduled > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            {job.today_stats.processing > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
            <span className="text-xs text-slate-500">
              Today: <span className="font-medium text-slate-700">{job.today_stats.completed}</span> / {job.today_stats.scheduled} scanned
              {job.today_stats.processing > 0 && (
                <span className="text-blue-600 ml-1">({job.today_stats.processing} in progress)</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color, suffix, isCountdown }: {
  label: string
  value: number
  color?: string
  suffix?: string
  isCountdown?: boolean
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  }

  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${color ? colorMap[color] || 'text-slate-800' : 'text-slate-800'}`}>
        {isCountdown ? value : value.toLocaleString()}{suffix}
      </p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}
