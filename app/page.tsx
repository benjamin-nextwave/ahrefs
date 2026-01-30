'use client'

import { useState } from 'react'
import UploadForm from './components/UploadForm'
import JobsList from './components/JobsList'

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <UploadForm onUploadSuccess={handleUploadSuccess} />
        </div>
        <div className="lg:col-span-2">
          <JobsList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  )
}
