import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AHREFS_API_BASE = 'https://api.ahrefs.com/v3'

// ─── Ahrefs API helpers ──────────────────────────────────────────────

async function ahrefsGet(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = Deno.env.get('AHREFS_API_KEY')
  if (!apiKey) {
    throw new Error('AHREFS_API_KEY is not set. Add it as a Supabase secret: supabase secrets set AHREFS_API_KEY=<your-key>')
  }

  const url = new URL(`${AHREFS_API_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  console.log(`Ahrefs API call: GET ${path} target=${params.target || 'N/A'}`)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Ahrefs API error: ${response.status} ${response.statusText}`)
    console.error(`Response body: ${body}`)

    if (response.status === 429) {
      throw new Error(`Ahrefs rate limited (429). Try again later.`)
    }
    if (response.status === 401) {
      throw new Error(`Ahrefs authentication failed (401). Check your API key.`)
    }
    if (response.status === 403) {
      throw new Error(`Ahrefs access denied (403). Your plan may not support this endpoint.`)
    }

    throw new Error(`Ahrefs API error: ${response.status} - ${body}`)
  }

  const data = await response.json()
  return data
}

// ─── Webshop: Get monthly organic + paid traffic for the last 12 months ──

interface TrafficHistoryEntry {
  date: string
  organic_traffic: number
  paid_traffic: number
}

async function getWebshopTrafficHistory(domain: string): Promise<TrafficHistoryEntry[]> {
  // Calculate date range: 12 months ago to today
  const today = new Date()
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const dateFrom = twelveMonthsAgo.toISOString().split('T')[0]
  const dateTo = today.toISOString().split('T')[0]

  console.log(`  Fetching traffic history for ${domain} from ${dateFrom} to ${dateTo}`)

  const data = await ahrefsGet('site-explorer/metrics-history', {
    target: domain,
    mode: 'domain',
    date_from: dateFrom,
    date_to: dateTo,
    history_grouping: 'monthly',
    output: 'json',
  }) as Record<string, unknown>

  console.log(`  Ahrefs metrics-history response keys: ${Object.keys(data).join(', ')}`)

  // The response format may vary. Handle multiple possible structures:
  // Option 1: { metrics: [{date, org_traffic, paid_traffic}, ...] }
  // Option 2: { rows: [{date, org_traffic, paid_traffic}, ...] }
  // Option 3: Direct array

  let rows: Array<Record<string, unknown>> = []

  if (Array.isArray(data)) {
    rows = data as Array<Record<string, unknown>>
  } else if (data.metrics && Array.isArray(data.metrics)) {
    rows = data.metrics as Array<Record<string, unknown>>
  } else if (data.rows && Array.isArray(data.rows)) {
    rows = data.rows as Array<Record<string, unknown>>
  } else {
    // Log the entire response to help debug
    console.error(`  Unexpected response structure: ${JSON.stringify(data).substring(0, 500)}`)
    throw new Error(`Unexpected metrics-history response format. Keys: ${Object.keys(data).join(', ')}`)
  }

  console.log(`  Got ${rows.length} monthly data points`)

  // Map to our format, handling different possible field names
  const history: TrafficHistoryEntry[] = rows.map((row: Record<string, unknown>) => {
    const date = String(row.date || row.month || '')
    // Ahrefs uses org_traffic / paid_traffic or organic_traffic / paid_traffic
    const organicTraffic = Number(row.org_traffic ?? row.organic_traffic ?? 0)
    const paidTraffic = Number(row.paid_traffic ?? 0)

    return {
      date: date.substring(0, 7), // Normalize to YYYY-MM format
      organic_traffic: organicTraffic,
      paid_traffic: paidTraffic,
    }
  })

  return history
}

// ─── Bouwbedrijf: Get organic keywords the domain ranks for ──

interface OrganicKeyword {
  keyword: string
  volume: number
  traffic: number
  position: number
  difficulty: number
}

async function getBouwbedrijfKeywords(domain: string): Promise<{
  keywords: OrganicKeyword[]
  totalKeywords: number
  totalTraffic: number
}> {
  console.log(`  Fetching organic keywords for ${domain}`)

  const data = await ahrefsGet('site-explorer/organic-keywords', {
    target: domain,
    mode: 'domain',
    country: 'nl',
    select: 'keyword,volume,traffic,position,difficulty',
    limit: '1000',
    order_by: 'traffic:desc',
    output: 'json',
  }) as Record<string, unknown>

  console.log(`  Ahrefs organic-keywords response keys: ${Object.keys(data).join(', ')}`)

  // Handle multiple possible response structures
  let rows: Array<Record<string, unknown>> = []

  if (Array.isArray(data)) {
    rows = data as Array<Record<string, unknown>>
  } else if (data.keywords && Array.isArray(data.keywords)) {
    rows = data.keywords as Array<Record<string, unknown>>
  } else if (data.rows && Array.isArray(data.rows)) {
    rows = data.rows as Array<Record<string, unknown>>
  } else {
    console.error(`  Unexpected response structure: ${JSON.stringify(data).substring(0, 500)}`)
    throw new Error(`Unexpected organic-keywords response format. Keys: ${Object.keys(data).join(', ')}`)
  }

  console.log(`  Got ${rows.length} keywords`)

  const keywords: OrganicKeyword[] = rows.map((row: Record<string, unknown>) => ({
    keyword: String(row.keyword || ''),
    volume: Number(row.volume ?? 0),
    traffic: Number(row.traffic ?? 0),
    position: Number(row.position ?? 0),
    difficulty: Number(row.difficulty ?? 0),
  }))

  const totalTraffic = keywords.reduce((sum, kw) => sum + kw.traffic, 0)

  return {
    keywords,
    totalKeywords: keywords.length,
    totalTraffic,
  }
}

// ─── Utilities ──

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const today = new Date().toISOString().split('T')[0]
    console.log(`Starting daily Ahrefs scan for ${today}`)

    // Reset any domains stuck in 'processing' from a previous timed-out run
    const { data: stuckDomains } = await supabase
      .from('domains')
      .select('id, domain')
      .eq('status', 'processing')

    if (stuckDomains && stuckDomains.length > 0) {
      console.log(`Resetting ${stuckDomains.length} stuck 'processing' domains back to 'pending'`)
      await supabase
        .from('domains')
        .update({ status: 'pending' })
        .eq('status', 'processing')
    }

    // Get all pending domains scheduled for today
    const { data: domains, error: fetchError } = await supabase
      .from('domains')
      .select('id, domain, job_id, retry_count')
      .eq('scheduled_date', today)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch domains: ${fetchError.message}`)
    }

    if (!domains || domains.length === 0) {
      console.log('No domains to process today')
      return new Response(
        JSON.stringify({ message: 'No domains to process today', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${domains.length} domains to process`)

    // Get enrichment types for all jobs involved
    const jobIds = [...new Set(domains.map((d: { job_id: string }) => d.job_id))]

    const { data: jobs } = await supabase
      .from('scan_jobs')
      .select('id, enrichment_type')
      .in('id', jobIds)

    const jobEnrichmentMap: Record<string, string> = {}
    for (const job of (jobs || [])) {
      jobEnrichmentMap[job.id] = job.enrichment_type || 'webshop'
    }

    // Update job status to running
    await supabase
      .from('scan_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .in('id', jobIds)

    let processed = 0
    let failed = 0
    const maxRetries = 3
    const rateLimitDelay = 2000 // 2 seconds between API calls

    for (const domain of domains) {
      try {
        // Mark as processing
        await supabase
          .from('domains')
          .update({ status: 'processing' })
          .eq('id', domain.id)

        console.log(`Processing: ${domain.domain}`)

        const enrichmentType = jobEnrichmentMap[domain.job_id] || 'webshop'

        if (enrichmentType === 'webshop') {
          // Webshop: get monthly organic + paid traffic history
          const trafficHistory = await getWebshopTrafficHistory(domain.domain)

          const { error: metricsError } = await supabase
            .from('webshop_metrics')
            .insert({
              domain_id: domain.id,
              traffic_history: trafficHistory,
            })

          if (metricsError) {
            throw new Error(`Failed to save webshop metrics: ${metricsError.message}`)
          }

          console.log(`  Saved ${trafficHistory.length} months of traffic data`)

        } else if (enrichmentType === 'bouwbedrijf') {
          // Bouwbedrijf: get organic keywords
          const keywordData = await getBouwbedrijfKeywords(domain.domain)

          const { error: metricsError } = await supabase
            .from('bouwbedrijf_metrics')
            .insert({
              domain_id: domain.id,
              keywords: keywordData.keywords,
              total_keywords: keywordData.totalKeywords,
              total_traffic: keywordData.totalTraffic,
            })

          if (metricsError) {
            throw new Error(`Failed to save bouwbedrijf metrics: ${metricsError.message}`)
          }

          console.log(`  Saved ${keywordData.totalKeywords} keywords (total traffic: ${keywordData.totalTraffic})`)
        }

        // Mark as completed
        await supabase
          .from('domains')
          .update({ status: 'completed' })
          .eq('id', domain.id)

        processed++
        console.log(`Completed: ${domain.domain}`)

      } catch (error) {
        console.error(`Error processing ${domain.domain}:`, error)

        const newRetryCount = (domain.retry_count || 0) + 1

        if (newRetryCount >= maxRetries) {
          await supabase
            .from('domains')
            .update({
              status: 'failed',
              retry_count: newRetryCount,
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', domain.id)
          failed++
        } else {
          await supabase
            .from('domains')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', domain.id)
        }
      }

      // Rate limiting between API calls
      if (domains.indexOf(domain) < domains.length - 1) {
        await sleep(rateLimitDelay)
      }
    }

    // Check if all domains in each job are done
    for (const jobId of jobIds) {
      const { data: jobDomains } = await supabase
        .from('domains')
        .select('status')
        .eq('job_id', jobId)

      if (jobDomains) {
        const allDone = jobDomains.every((d: { status: string }) =>
          d.status === 'completed' || d.status === 'failed'
        )

        if (allDone) {
          await supabase
            .from('scan_jobs')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
        }
      }
    }

    console.log(`Daily scan complete. Processed: ${processed}, Failed: ${failed}`)

    return new Response(
      JSON.stringify({
        message: 'Daily scan complete',
        date: today,
        processed,
        failed,
        total: domains.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Daily scan error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
