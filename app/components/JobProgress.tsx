'use client'

interface TodayStats {
  scheduled: number
  completed: number
  processing: number
}

interface JobProgressProps {
  stats: {
    completed: number
    failed: number
    processing: number
    pending: number
    total: number
  }
  todayStats?: TodayStats
}

export default function JobProgress({ stats }: JobProgressProps) {
  const { completed, failed, processing, total } = stats

  const completedPercent = total > 0 ? (completed / total) * 100 : 0
  const failedPercent = total > 0 ? (failed / total) * 100 : 0
  const processingPercent = total > 0 ? (processing / total) * 100 : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-500">{completed} done</span>
          </span>
          {failed > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              <span className="text-slate-500">{failed} failed</span>
            </span>
          )}
          {processing > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block"></span>
              <span className="text-slate-500">{processing} scanning</span>
            </span>
          )}
        </div>
        <span className="font-semibold text-slate-700">{completedPercent.toFixed(0)}%</span>
      </div>

      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${completedPercent}%` }}
          />
          <div
            className="bg-red-400 transition-all duration-500 ease-out"
            style={{ width: `${failedPercent}%` }}
          />
          <div
            className="bg-blue-400 animate-progress-pulse transition-all duration-500 ease-out"
            style={{ width: `${processingPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
