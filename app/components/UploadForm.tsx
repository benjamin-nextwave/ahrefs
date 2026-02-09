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

      // Reset form and notify parent
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Upload Domains</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 mb-1">
            Job Name
          </label>
          <input
            type="text"
            id="jobName"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="e.g., Q1 2024 Prospects"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enrichment Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="enrichmentType"
                value="webshop"
                checked={enrichmentType === 'webshop'}
                onChange={() => setEnrichmentType('webshop')}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Webshops</div>
                <div className="text-xs text-gray-500">Traffic & keyword decline analysis</div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="enrichmentType"
                value="bouwbedrijf"
                checked={enrichmentType === 'bouwbedrijf'}
                onChange={() => setEnrichmentType('bouwbedrijf')}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">Bouwbedrijven</div>
                <div className="text-xs text-gray-500">Competitor & content gap analysis</div>
              </div>
            </label>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${file ? 'bg-green-50 border-green-300' : ''}
          `}
        >
          {file ? (
            <div className="space-y-2">
              <div className="text-green-600 font-medium">{file.name}</div>
              <div className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-gray-600">
                Drag and drop a CSV file here, or
              </div>
              <label className="inline-block cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  browse
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-gray-400 mt-2">
                CSV must have a &quot;domain&quot; column
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
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
            w-full py-2 px-4 rounded-md font-medium transition-colors
            ${!file || !jobName.trim() || isUploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isUploading ? 'Uploading...' : 'Create Scan Job'}
        </button>
      </form>
    </div>
  )
}
