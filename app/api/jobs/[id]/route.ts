import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

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

    const enrichmentType = job.enrichment_type || 'webshop'

    // Fetch domains with the correct metrics join
    let selectQuery = '*, domain_metrics (*)'
    if (enrichmentType === 'webshop') {
      selectQuery = '*, webshop_metrics (traffic_history)'
    } else if (enrichmentType === 'bouwbedrijf') {
      selectQuery = '*, bouwbedrijf_metrics (keywords, total_keywords, total_traffic)'
    }

    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select(selectQuery)
      .eq('job_id', id)
      .order('scheduled_date', { ascending: true })

    if (domainsError) {
      console.error('Failed to fetch domains:', domainsError)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domainList: any[] = domains || []

    const stats = {
      completed: domainList.filter((d: { status: string }) => d.status === 'completed').length,
      failed: domainList.filter((d: { status: string }) => d.status === 'failed').length,
      processing: domainList.filter((d: { status: string }) => d.status === 'processing').length,
      pending: domainList.filter((d: { status: string }) => d.status === 'pending').length,
      total: job.total_domains,
    }

    // Group domains by scheduled date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byDate: Record<string, any[]> = {}
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
