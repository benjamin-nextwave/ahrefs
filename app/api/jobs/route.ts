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

    // Get completion stats for each job
    const jobsWithStats = await Promise.all(
      (jobs || []).map(async (job) => {
        const { data: domains } = await supabase
          .from('domains')
          .select('status')
          .eq('job_id', job.id)

        const domainList = domains || []
        const completed = domainList.filter(d => d.status === 'completed').length
        const failed = domainList.filter(d => d.status === 'failed').length
        const processing = domainList.filter(d => d.status === 'processing').length
        const pending = domainList.filter(d => d.status === 'pending').length

        return {
          ...job,
          stats: {
            completed,
            failed,
            processing,
            pending,
            total: job.total_domains,
          }
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
