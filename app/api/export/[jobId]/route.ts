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

    // Get job info including enrichment type
    const { data: job, error: jobError } = await supabase
      .from('scan_jobs')
      .select('name, enrichment_type')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const enrichmentType = job.enrichment_type || 'webshop'
    const completedOnly = request.nextUrl.searchParams.get('completed_only') === 'true'

    if (enrichmentType === 'bouwbedrijf') {
      return exportBouwbedrijf(supabase, jobId, job.name, completedOnly)
    }
    return exportWebshop(supabase, jobId, job.name, completedOnly)
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportWebshop(supabase: any, jobId: string, jobName: string, completedOnly: boolean) {
  let query = supabase
    .from('domains')
    .select(`
      domain,
      status,
      webshop_metrics (
        organic_keywords_current,
        organic_keywords_3m,
        organic_keywords_6m,
        organic_keywords_12m,
        organic_keywords_24m,
        organic_traffic_current,
        organic_traffic_3m,
        organic_traffic_6m,
        organic_traffic_12m,
        organic_traffic_24m,
        paid_keywords_current,
        paid_keywords_3m,
        paid_keywords_6m,
        paid_keywords_12m,
        paid_keywords_24m,
        paid_traffic_current,
        paid_traffic_3m,
        paid_traffic_6m,
        paid_traffic_12m,
        paid_traffic_24m
      )
    `)
    .eq('job_id', jobId)
  if (completedOnly) {
    query = query.eq('status', 'completed')
  }
  const { data: domains, error: domainsError } = await query
    .order('scheduled_date', { ascending: true })

  if (domainsError) {
    console.error('Failed to fetch domains:', domainsError)
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    )
  }

  const columns = [
    'domain', 'status',
    'organic_keywords_current', 'organic_keywords_3m', 'organic_keywords_6m', 'organic_keywords_12m', 'organic_keywords_24m',
    'organic_traffic_current', 'organic_traffic_3m', 'organic_traffic_6m', 'organic_traffic_12m', 'organic_traffic_24m',
    'paid_keywords_current', 'paid_keywords_3m', 'paid_keywords_6m', 'paid_keywords_12m', 'paid_keywords_24m',
    'paid_traffic_current', 'paid_traffic_3m', 'paid_traffic_6m', 'paid_traffic_12m', 'paid_traffic_24m',
  ]

  const csvData = (domains || []).map((domain: Record<string, unknown>) => {
    const metricsArray = domain.webshop_metrics as Array<Record<string, unknown>> | null
    const metrics = metricsArray?.[0] || {}
    return {
      domain: domain.domain,
      status: domain.status,
      organic_keywords_current: metrics.organic_keywords_current ?? '',
      organic_keywords_3m: metrics.organic_keywords_3m ?? '',
      organic_keywords_6m: metrics.organic_keywords_6m ?? '',
      organic_keywords_12m: metrics.organic_keywords_12m ?? '',
      organic_keywords_24m: metrics.organic_keywords_24m ?? '',
      organic_traffic_current: metrics.organic_traffic_current ?? '',
      organic_traffic_3m: metrics.organic_traffic_3m ?? '',
      organic_traffic_6m: metrics.organic_traffic_6m ?? '',
      organic_traffic_12m: metrics.organic_traffic_12m ?? '',
      organic_traffic_24m: metrics.organic_traffic_24m ?? '',
      paid_keywords_current: metrics.paid_keywords_current ?? '',
      paid_keywords_3m: metrics.paid_keywords_3m ?? '',
      paid_keywords_6m: metrics.paid_keywords_6m ?? '',
      paid_keywords_12m: metrics.paid_keywords_12m ?? '',
      paid_keywords_24m: metrics.paid_keywords_24m ?? '',
      paid_traffic_current: metrics.paid_traffic_current ?? '',
      paid_traffic_3m: metrics.paid_traffic_3m ?? '',
      paid_traffic_6m: metrics.paid_traffic_6m ?? '',
      paid_traffic_12m: metrics.paid_traffic_12m ?? '',
      paid_traffic_24m: metrics.paid_traffic_24m ?? '',
    }
  })

  const csv = Papa.unparse(csvData, { header: true, columns })

  const safeName = String(jobName).replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const filename = `${safeName}_webshop_export_${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exportBouwbedrijf(supabase: any, jobId: string, jobName: string, completedOnly: boolean) {
  let query = supabase
    .from('domains')
    .select(`
      domain,
      status,
      bouwbedrijf_metrics (
        top_competitor,
        top_competitor_traffic,
        top_competitor_ads_keywords,
        achievable_traffic,
        content_gap_count,
        content_gap_keywords
      )
    `)
    .eq('job_id', jobId)
  if (completedOnly) {
    query = query.eq('status', 'completed')
  }
  const { data: domains, error: domainsError } = await query
    .order('scheduled_date', { ascending: true })

  if (domainsError) {
    console.error('Failed to fetch domains:', domainsError)
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    )
  }

  const columns = [
    'domain', 'status',
    'top_competitor', 'top_competitor_traffic', 'top_competitor_ads_keywords',
    'achievable_traffic', 'content_gap_count', 'content_gap_keywords',
  ]

  const csvData = (domains || []).map((domain: Record<string, unknown>) => {
    const metricsArray = domain.bouwbedrijf_metrics as Array<Record<string, unknown>> | null
    const metrics = metricsArray?.[0] || {}
    const keywords = metrics.content_gap_keywords as Array<{ keyword: string; volume: number; difficulty: number; competitor_position: number }> | null
    const keywordNames = keywords?.map(k => k.keyword).join(', ') ?? ''
    return {
      domain: domain.domain,
      status: domain.status,
      top_competitor: metrics.top_competitor ?? '',
      top_competitor_traffic: metrics.top_competitor_traffic ?? '',
      top_competitor_ads_keywords: metrics.top_competitor_ads_keywords ?? '',
      achievable_traffic: metrics.achievable_traffic ?? '',
      content_gap_count: metrics.content_gap_count ?? '',
      content_gap_keywords: keywordNames,
    }
  })

  const csv = Papa.unparse(csvData, { header: true, columns })

  const safeName = String(jobName).replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const filename = `${safeName}_bouwbedrijf_export_${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
