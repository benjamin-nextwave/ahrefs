'use client'

import { useState, useCallback } from 'react'

interface UploadFormProps {
  onUploadSuccess: () => void
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [jobName, setJobName] = useState('')
  const [enrichmentType, setEnrichmentType] = useState<'webshop' | 'bouwbedrijf'>('webshop')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile)
      if (!jobName) {
        setJobName(droppedFile.name.replace('.csv', ''))
      }
    } else {
      setError('Please upload a CSV file')
    }
  }, [jobName])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!jobName) {
        setJobName(selectedFile.name.replace('.csv', ''))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !jobName.trim()) return

    setIsUploading(true)
    setError(null)
    setWarnings([])

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', jobName.trim())
      formData.append('enrichment_type', enrichmentType)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Upload failed')
        if (data.details) {
          setWarnings(data.details)
        }
        return
      }

      if (data.warnings) {
        setWarnings(data.warnings)
      }

      setFile(null)
      setJobName('')
      setEnrichmentType('webshop')
      onUploadSuccess()
    } catch {
      setError('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-800">New Scan</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="jobName" className="block text-sm font-medium text-slate-700 mb-1">
            Job Name
          </label>
          <input
            type="text"
            id="jobName"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="e.g., Q1 2026 Prospects"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Analysis Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className={`
              flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-center
              ${enrichmentType === 'webshop'
                ? 'border-violet-400 bg-violet-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}>
              <input
                type="radio"
                name="enrichmentType"
                value="webshop"
                checked={enrichmentType === 'webshop'}
                onChange={() => setEnrichmentType('webshop')}
                className="sr-only"
              />
              <svg className={`w-5 h-5 ${enrichmentType === 'webshop' ? 'text-violet-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
              <span className={`text-sm font-medium ${enrichmentType === 'webshop' ? 'text-violet-700' : 'text-slate-600'}`}>Webshop</span>
              <span className="text-xs text-slate-400">Traffic history</span>
            </label>
            <label className={`
              flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-center
              ${enrichmentType === 'bouwbedrijf'
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}>
              <input
                type="radio"
                name="enrichmentType"
                value="bouwbedrijf"
                checked={enrichmentType === 'bouwbedrijf'}
                onChange={() => setEnrichmentType('bouwbedrijf')}
                className="sr-only"
              />
              <svg className={`w-5 h-5 ${enrichmentType === 'bouwbedrijf' ? 'text-orange-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className={`text-sm font-medium ${enrichmentType === 'bouwbedrijf' ? 'text-orange-700' : 'text-slate-600'}`}>Bouwbedrijf</span>
              <span className="text-xs text-slate-400">Keyword research</span>
            </label>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center transition-all
            ${isDragging ? 'border-teal-400 bg-teal-50 scale-[1.02]' : 'border-slate-200 hover:border-slate-300'}
            ${file ? 'bg-emerald-50 border-emerald-300' : ''}
          `}
        >
          {file ? (
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div className="text-sm font-medium text-emerald-700">{file.name}</div>
              <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-red-500 hover:text-red-600 font-medium mt-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">
                Drop CSV here or{' '}
                <label className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-slate-400">Must have a &quot;domain&quot; column</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800 mb-1">Warnings:</p>
            <ul className="text-sm text-amber-700 list-disc list-inside">
              {warnings.slice(0, 5).map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
              {warnings.length > 5 && (
                <li>...and {warnings.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || !jobName.trim() || isUploading}
          className={`
            w-full py-2.5 px-4 rounded-xl font-medium transition-all text-sm
            ${!file || !jobName.trim() || isUploading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'gradient-brand text-white hover:opacity-90 shadow-sm hover:shadow-md'
            }
          `}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
          ) : 'Create Scan Job'}
        </button>
      </form>
    </div>
  )
}
