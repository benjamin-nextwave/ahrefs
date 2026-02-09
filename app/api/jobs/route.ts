import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: jobs, error } = await supabase
      .from('scan_jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch jobs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Get completion stats for each job
    const jobsWithStats = await Promise.all(
      (jobs || []).map(async (job) => {
        const { data: domains } = await supabase
          .from('domains')
          .select('status, scheduled_date')
          .eq('job_id', job.id)

        const domainList = domains || []
        const completed = domainList.filter(d => d.status === 'completed').length
        const failed = domainList.filter(d => d.status === 'failed').length
        const processing = domainList.filter(d => d.status === 'processing').length
        const pending = domainList.filter(d => d.status === 'pending').length

        const todayDomains = domainList.filter(d => d.scheduled_date === today)
        const todayStats = {
          scheduled: todayDomains.length,
          completed: todayDomains.filter(d => d.status === 'completed').length,
          processing: todayDomains.filter(d => d.status === 'processing').length,
        }

        return {
          ...job,
          stats: {
            completed,
            failed,
            processing,
            pending,
            total: job.total_domains,
          },
          today_stats: todayStats,
        }
      })
    )

    return NextResponse.json(jobsWithStats)
  } catch (error) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
