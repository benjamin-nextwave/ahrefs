'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ExportButton from '@/app/components/ExportButton'

interface TrafficEntry { date: string; organic_traffic: number; paid_traffic: number }
interface KeywordEntry { keyword: string; volume: number; traffic: number; position: number; difficulty: number }

interface DomainRecord {
  id: string
  domain: string
  status: string
  scheduled_date: string
  error_message: string | null
  retry_count: number
  webshop_metrics?: Array<{ traffic_history: TrafficEntry[] }>
  bouwbedrijf_metrics?: Array<{ keywords: KeywordEntry[]; total_keywords: number; total_traffic: number }>
}

interface JobDetail {
  job: {
    id: string
    name: string
    total_domains: number
    status: string
    enrichment_type: 'webshop' | 'bouwbedrijf'
    start_date: string
    end_date: string
    created_at: string
  }
  stats: { completed: number; failed: number; processing: number; pending: number; total: number }
  domains: DomainRecord[]
  byDate: Record<string, DomainRecord[]>
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.id}`)
        if (!res.ok) throw new Error()
        setData(await res.json())
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
    const interval = setInterval(fetchJob, 30000)
    return () => clearInterval(interval)
  }, [params.id, router])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>
    )
  }

  const { job, stats, domains } = data
  const isWebshop = job.enrichment_type === 'webshop'
  const completedPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  const daysRemaining = Math.max(0, Math.ceil((new Date(job.end_date).getTime() - Date.now()) / 86400000))
  const totalDays = Math.max(1, Math.ceil((new Date(job.end_date).getTime() - new Date(job.start_date).getTime()) / 86400000))
  const daysElapsed = Math.max(0, Math.floor((Date.now() - new Date(job.start_date).getTime()) / 86400000))

  const filteredDomains = filter === 'all'
    ? domains
    : domains.filter(d => d.status === filter)

  // Group by date for timeline
  const dates = Object.keys(data.byDate).sort()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">Dashboard</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-700 font-medium">{job.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="gradient-brand p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{job.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  isWebshop ? 'bg-white/20 text-white' : 'bg-white/20 text-white'
                }`}>
                  {isWebshop ? 'Webshop' : 'Bouwbedrijf'}
                </span>
              </div>
              <p className="text-sm text-white/70">
                Created {new Date(job.created_at).toLocaleDateString()} &middot; {job.start_date} to {job.end_date}
              </p>
            </div>
            <div onClick={e => e.stopPropagation()}>
              <ExportButton jobId={job.id} disabled={stats.completed === 0} />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100">
          <DetailStat label="Total Domains" value={stats.total} />
          <DetailStat label="Completed" value={stats.completed} color="emerald" />
          <DetailStat label="Failed" value={stats.failed} color={stats.failed > 0 ? 'red' : undefined} />
          <DetailStat label="Pending" value={stats.pending} />
          <DetailStat
            label={job.status === 'completed' ? 'Status' : 'Days Left'}
            value={job.status === 'completed' ? 0 : daysRemaining}
            displayValue={job.status === 'completed' ? 'Done' : `${daysRemaining}`}
            color={job.status === 'completed' ? 'emerald' : 'blue'}
          />
        </div>
      </div>

      {/* Progress + Timeline Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overall Progress */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Scan Progress</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#10b981" strokeWidth="3"
                  strokeDasharray={`${completedPercent}, 100`}
                  className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-800">{completedPercent.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <ProgressRow label="Completed" value={stats.completed} total={stats.total} color="bg-emerald-500" />
              <ProgressRow label="Failed" value={stats.failed} total={stats.total} color="bg-red-400" />
              <ProgressRow label="Pending" value={stats.pending} total={stats.total} color="bg-slate-200" />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Day {daysElapsed} of {totalDays} &middot; ~{Math.max(0, Math.ceil(stats.pending / Math.max(1, Math.ceil(stats.total / totalDays))))} days to go based on schedule
          </p>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Schedule Timeline</h3>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {dates.map(date => {
              const dayDomains = data.byDate[date]
              const done = dayDomains.filter(d => d.status === 'completed').length
              const fail = dayDomains.filter(d => d.status === 'failed').length
              const total = dayDomains.length
              const isToday = date === new Date().toISOString().split('T')[0]
              const isPast = new Date(date) < new Date(new Date().toISOString().split('T')[0])

              return (
                <div key={date} className={`flex items-center gap-3 text-xs py-1.5 px-2 rounded-lg ${isToday ? 'bg-blue-50' : ''}`}>
                  <span className={`w-20 shrink-0 font-mono ${isToday ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
                    {date.slice(5)}
                    {isToday && <span className="ml-1 text-blue-500">*</span>}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div className="bg-emerald-500" style={{ width: `${(done / total) * 100}%` }} />
                      <div className="bg-red-400" style={{ width: `${(fail / total) * 100}%` }} />
                    </div>
                  </div>
                  <span className={`w-12 text-right shrink-0 ${isPast && done === total ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {done}/{total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Domain List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Domains ({filteredDomains.length})</h3>
            <div className="flex gap-1">
              {['all', 'completed', 'pending', 'failed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
          {filteredDomains.map(domain => (
            <DomainRow key={domain.id} domain={domain} enrichmentType={job.enrichment_type} />
          ))}
          {filteredDomains.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              No domains match this filter
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailStat({ label, value, color, displayValue }: {
  label: string; value: number; color?: string; displayValue?: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  }
  return (
    <div className="p-4 text-center">
      <p className={`text-2xl font-bold ${color ? colorMap[color] || '' : 'text-slate-800'}`}>
        {displayValue ?? value.toLocaleString()}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

function ProgressRow({ label, value, total, color }: {
  label: string; value: number; total: number; color: string
}) {
  const percent = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-slate-500">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="w-8 text-right text-slate-600 font-medium">{value}</span>
    </div>
  )
}

function DomainRow({ domain, enrichmentType }: { domain: DomainRecord; enrichmentType: string }) {
  const [expanded, setExpanded] = useState(false)

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
    processing: 'bg-blue-500 animate-pulse',
    pending: 'bg-slate-300',
  }

  const hasMetrics = enrichmentType === 'webshop'
    ? domain.webshop_metrics && domain.webshop_metrics.length > 0
    : domain.bouwbedrijf_metrics && domain.bouwbedrijf_metrics.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => hasMetrics && setExpanded(!expanded)}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[domain.status] || 'bg-slate-300'}`} />
        <span className="text-sm text-slate-700 flex-1 font-mono">{domain.domain}</span>
        <span className="text-xs text-slate-400">{domain.scheduled_date.slice(5)}</span>
        {domain.error_message && (
          <span className="text-xs text-red-500 max-w-[200px] truncate" title={domain.error_message}>
            {domain.error_message}
          </span>
        )}
        {hasMetrics && (
          <svg className={`w-4 h-4 text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </div>

      {expanded && hasMetrics && (
        <div className="px-5 pb-4 pt-1">
          {enrichmentType === 'webshop' && domain.webshop_metrics?.[0]?.traffic_history && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Monthly Traffic (last 12 months)</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {domain.webshop_metrics[0].traffic_history.slice(-12).map(entry => (
                  <div key={entry.date} className="text-center">
                    <p className="text-xs text-slate-400">{entry.date.slice(2)}</p>
                    <p className="text-xs font-medium text-emerald-600">{entry.organic_traffic.toLocaleString()}</p>
                    <p className="text-xs font-medium text-violet-600">{entry.paid_traffic.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Organic</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />Paid</span>
              </div>
            </div>
          )}
          {enrichmentType === 'bouwbedrijf' && domain.bouwbedrijf_metrics?.[0] && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-400">Keywords</p>
                  <p className="text-sm font-bold text-slate-700">{domain.bouwbedrijf_metrics[0].total_keywords}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Est. Traffic</p>
                  <p className="text-sm font-bold text-slate-700">{domain.bouwbedrijf_metrics[0].total_traffic.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 mb-1">Top Keywords</p>
              <div className="space-y-1">
                {domain.bouwbedrijf_metrics[0].keywords.slice(0, 10).map((kw, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-slate-300 text-right">#{kw.position}</span>
                    <span className="flex-1 text-slate-700">{kw.keyword}</span>
                    <span className="text-slate-400">vol:{kw.volume.toLocaleString()}</span>
                    <span className="text-emerald-600">{kw.traffic.toLocaleString()} visits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
