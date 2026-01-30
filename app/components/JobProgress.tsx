'use client'

interface JobProgressProps {
  stats: {
    completed: number
    failed: number
    processing: number
    pending: number
    total: number
  }
}

export default function JobProgress({ stats }: JobProgressProps) {
  const { completed, failed, processing, total } = stats

  const completedPercent = total > 0 ? (completed / total) * 100 : 0
  const failedPercent = total > 0 ? (failed / total) * 100 : 0
  const processingPercent = total > 0 ? (processing / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {completed} of {total} completed
          {failed > 0 && <span className="text-red-600 ml-2">({failed} failed)</span>}
        </span>
        <span className="font-medium">{completedPercent.toFixed(0)}%</span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${completedPercent}%` }}
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${failedPercent}%` }}
          />
          <div
            className="bg-blue-500 animate-pulse transition-all duration-300"
            style={{ width: `${processingPercent}%` }}
          />
        </div>
      </div>

      {processing > 0 && (
        <div className="text-xs text-blue-600">
          {processing} domain{processing > 1 ? 's' : ''} currently processing...
        </div>
      )}
    </div>
  )
}
