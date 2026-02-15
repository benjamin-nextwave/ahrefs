import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Papa from 'papaparse'

interface TrafficHistoryEntry {
  date: string
  organic_traffic: number
  paid_traffic: number
}

interface OrganicKeyword {
  keyword: string
  volume: number
  traffic: number
  position: number
  difficulty: number
}

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
        traffic_history
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

  // Collect all unique months across all domains to build dynamic columns
  const allMonths = new Set<string>()
  for (const domain of (domains || [])) {
    const metricsArray = domain.webshop_metrics as Array<{ traffic_history: TrafficHistoryEntry[] }> | null
    const metrics = metricsArray?.[0]
    if (metrics?.traffic_history) {
      for (const entry of metrics.traffic_history) {
        allMonths.add(entry.date)
      }
    }
  }

  // Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort()

  // Build columns: domain, status, then organic_traffic_YYYY-MM and paid_traffic_YYYY-MM for each month
  const columns = [
    'domain', 'status',
    ...sortedMonths.map(m => `organic_traffic_${m}`),
    ...sortedMonths.map(m => `paid_traffic_${m}`),
  ]

  const csvData = (domains || []).map((domain: Record<string, unknown>) => {
    const metricsArray = domain.webshop_metrics as Array<{ traffic_history: TrafficHistoryEntry[] }> | null
    const metrics = metricsArray?.[0]

    // Build a lookup from date to traffic values
    const trafficByMonth: Record<string, TrafficHistoryEntry> = {}
    if (metrics?.traffic_history) {
      for (const entry of metrics.traffic_history) {
        trafficByMonth[entry.date] = entry
      }
    }

    const row: Record<string, unknown> = {
      domain: domain.domain,
      status: domain.status,
    }

    // Add organic traffic columns
    for (const month of sortedMonths) {
      row[`organic_traffic_${month}`] = trafficByMonth[month]?.organic_traffic ?? ''
    }

    // Add paid traffic columns
    for (const month of sortedMonths) {
      row[`paid_traffic_${month}`] = trafficByMonth[month]?.paid_traffic ?? ''
    }

    return row
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
        keywords,
        total_keywords,
        total_traffic
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
    'domain', 'status', 'total_keywords', 'total_traffic',
    'top_keywords',
  ]

  const csvData = (domains || []).map((domain: Record<string, unknown>) => {
    const metricsArray = domain.bouwbedrijf_metrics as Array<{
      keywords: OrganicKeyword[]
      total_keywords: number
      total_traffic: number
    }> | null
    const metrics = metricsArray?.[0]

    // Format top keywords as readable string: "keyword (vol:X, pos:Y)"
    const keywordsList = metrics?.keywords || []
    const topKeywords = keywordsList
      .slice(0, 20)
      .map((k: OrganicKeyword) => `${k.keyword} (vol:${k.volume}, pos:${k.position})`)
      .join('; ')

    return {
      domain: domain.domain,
      status: domain.status,
      total_keywords: metrics?.total_keywords ?? '',
      total_traffic: metrics?.total_traffic ?? '',
      top_keywords: topKeywords,
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
