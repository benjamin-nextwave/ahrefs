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

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'export.csv'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      // Create blob and download
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
          px-3 py-1.5 text-sm rounded-md border transition-colors
          ${disabled || isExporting
            ? 'text-gray-400 border-gray-200 cursor-not-allowed'
            : 'text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700'
          }
        `}
        title={disabled ? 'No completed scans to export' : 'Export results as CSV'}
      >
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>
      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={completedOnly}
          onChange={(e) => setCompletedOnly(e.target.checked)}
          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        Completed only
      </label>
    </div>
  )
}
