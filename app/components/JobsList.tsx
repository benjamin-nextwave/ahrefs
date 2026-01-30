'use client'

import { useEffect, useState } from 'react'
import JobProgress from './JobProgress'
import ExportButton from './ExportButton'

interface ScanJob {
  id: string
  name: string
  total_domains: number
  status: string
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
}

interface JobsListProps {
  refreshTrigger: number
}

export default function JobsList({ refreshTrigger }: JobsListProps) {
  const [jobs, setJobs] = useState<JobWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data)
      setError(null)
    } catch {
      setError('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [refreshTrigger])

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      setJobs(jobs.filter(j => j.id !== jobId))
    } catch {
      alert('Failed to delete job')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchJobs}
          className="mt-2 text-blue-600 hover:text-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No scan jobs yet. Upload a CSV to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Scan Jobs</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {jobs.map((job) => (
          <div key={job.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900">{job.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  {job.total_domains} domains &middot; {job.start_date} to {job.end_date}
                </div>

                <div className="mt-3">
                  <JobProgress stats={job.stats} />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <ExportButton jobId={job.id} disabled={job.stats.completed === 0} />
                <button
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {expandedJob === job.id ? 'Hide' : 'Details'}
                </button>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-md hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {expandedJob === job.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Pending:</span>
                    <span className="ml-2 font-medium">{job.stats.pending}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Processing:</span>
                    <span className="ml-2 font-medium">{job.stats.processing}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Completed:</span>
                    <span className="ml-2 font-medium text-green-600">{job.stats.completed}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Failed:</span>
                    <span className="ml-2 font-medium text-red-600">{job.stats.failed}</span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  Created: {new Date(job.created_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
