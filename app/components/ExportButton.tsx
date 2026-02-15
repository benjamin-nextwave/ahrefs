'use client'

import { useState } from 'react'

interface ExportButtonProps {
  jobId: string
  disabled?: boolean
}

export default function ExportButton({ jobId, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [completedOnly, setCompletedOnly] = useState(true)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const url = completedOnly
        ? `/api/export/${jobId}?completed_only=true`
        : `/api/export/${jobId}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'export.csv'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      const blob = await response.blob()
      const url2 = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url2
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url2)
      document.body.removeChild(a)
    } catch {
      alert('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={disabled || isExporting}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
          ${disabled || isExporting
            ? 'text-slate-300 border-slate-100 cursor-not-allowed'
            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
          }
        `}
        title={disabled ? 'No completed scans to export' : 'Export results as CSV'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {isExporting ? 'Exporting...' : 'CSV'}
      </button>
      <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={completedOnly}
          onChange={(e) => setCompletedOnly(e.target.checked)}
          className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
        />
        Completed only
      </label>
    </div>
  )
}
