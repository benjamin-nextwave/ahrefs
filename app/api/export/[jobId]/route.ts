import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Papa from 'papaparse'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = createAdminClient()

    // Get job info
    const { data: job, error: jobError } = await supabase
      .from('scan_jobs')
      .select('name')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get all completed domains with metrics
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select(`
        domain,
        scheduled_date,
        status,
        domain_metrics (
          dr,
          traffic,
          refdomains,
          backlinks,
          keywords,
          checked_at
        )
      `)
      .eq('job_id', jobId)
      .order('scheduled_date', { ascending: true })

    if (domainsError) {
      console.error('Failed to fetch domains:', domainsError)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    // Flatten the data for CSV export
    const csvData = (domains || []).map((domain: Record<string, unknown>) => {
      const metricsArray = domain.domain_metrics as Array<Record<string, unknown>> | null
      const metrics = metricsArray?.[0] || {}
      return {
        domain: domain.domain,
        status: domain.status,
        scheduled_date: domain.scheduled_date,
        dr: metrics.dr ?? '',
        traffic: metrics.traffic ?? '',
        refdomains: metrics.refdomains ?? '',
        backlinks: metrics.backlinks ?? '',
        keywords: metrics.keywords ?? '',
        checked_at: metrics.checked_at ?? '',
      }
    })

    // Generate CSV
    const csv = Papa.unparse(csvData, {
      header: true,
      columns: ['domain', 'status', 'scheduled_date', 'dr', 'traffic', 'refdomains', 'backlinks', 'keywords', 'checked_at']
    })

    // Create filename
    const safeName = String(job.name).replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${safeName}_export_${new Date().toISOString().split('T')[0]}.csv`

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
