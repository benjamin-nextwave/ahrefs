import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get all domains with their metrics
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select(`
        *,
        domain_metrics (*)
      `)
      .eq('job_id', id)
      .order('scheduled_date', { ascending: true })

    if (domainsError) {
      console.error('Failed to fetch domains:', domainsError)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    const domainList = domains || []

    // Calculate stats
    const stats = {
      completed: domainList.filter(d => d.status === 'completed').length,
      failed: domainList.filter(d => d.status === 'failed').length,
      processing: domainList.filter(d => d.status === 'processing').length,
      pending: domainList.filter(d => d.status === 'pending').length,
      total: job.total_domains,
    }

    // Group domains by scheduled date
    type DomainRecord = typeof domainList[number]
    const byDate: Record<string, DomainRecord[]> = {}
    domainList.forEach(domain => {
      const date = domain.scheduled_date
      if (!byDate[date]) {
        byDate[date] = []
      }
      byDate[date].push(domain)
    })

    return NextResponse.json({
      job,
      stats,
      domains: domainList,
      byDate,
    })
  } catch (error) {
    console.error('Job fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('scan_jobs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete job:', error)
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Job delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
