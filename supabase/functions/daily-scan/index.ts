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

// Random delay between 45 seconds and 2 minutes
function randomDelay(): number {
  const minMs = 45 * 1000   // 45 seconds
  const maxMs = 120 * 1000  // 2 minutes
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

// Check if today is a working day (Mon-Fri) in Amsterdam timezone
function isWorkingDay(): boolean {
  const now = new Date()
  // Get Amsterdam day of week using Intl
  const amsterdamDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'short',
  }).format(now)
  return !['Sat', 'Sun'].includes(amsterdamDay)
}

// ─── Constants ──

const MAX_CONCURRENT_JOBS = 2
const DAILY_SCRAPE_LIMIT = 50
const BATCH_SIZE = 4 // Domains per invocation (keeps runtime under edge function timeout)

// ─── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Only run on working days (Mon-Fri Amsterdam time)
    if (!isWorkingDay()) {
      console.log('Skipping scan: not a working day in Amsterdam')
      return new Response(
        JSON.stringify({ message: 'Skipped: not a working day', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const todayStart = `${today}T00:00:00.000Z`
    console.log(`Starting batch scan for ${today}`)

    // Count how many domains have already been scraped today (across all jobs)
    // by checking metrics tables for entries created today
    const { count: webshopToday } = await supabase
      .from('webshop_metrics')
      .select('id', { count: 'exact', head: true })
      .gte('checked_at', todayStart)

    const { count: bouwbedrijfToday } = await supabase
      .from('bouwbedrijf_metrics')
      .select('id', { count: 'exact', head: true })
      .gte('checked_at', todayStart)

    const scrapedToday = (webshopToday || 0) + (bouwbedrijfToday || 0)
    const remainingBudget = DAILY_SCRAPE_LIMIT - scrapedToday

    console.log(`Scraped today: ${scrapedToday}/${DAILY_SCRAPE_LIMIT}, remaining budget: ${remainingBudget}`)

    if (remainingBudget <= 0) {
      console.log('Daily scrape limit reached')
      return new Response(
        JSON.stringify({ message: 'Daily limit reached', scrapedToday, limit: DAILY_SCRAPE_LIMIT }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const batchSize = Math.min(BATCH_SIZE, remainingBudget)

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

    // Get active jobs (pending or running) - max 2 at a time
    const { data: activeJobs } = await supabase
      .from('scan_jobs')
      .select('id, enrichment_type, status')
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: true })
      .limit(MAX_CONCURRENT_JOBS)

    if (!activeJobs || activeJobs.length === 0) {
      console.log('No active jobs found')

      // Check if there are queued jobs to promote
      await promoteQueuedJobs(supabase)

      return new Response(
        JSON.stringify({ message: 'No active jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const activeJobIds = activeJobs.map(j => j.id)
    console.log(`Active jobs: ${activeJobIds.length}, batch size: ${batchSize}`)

    // Build enrichment map
    const jobEnrichmentMap: Record<string, string> = {}
    for (const job of activeJobs) {
      jobEnrichmentMap[job.id] = job.enrichment_type || 'webshop'
    }

    // Count remaining pending domains per active job (any scheduled_date <= today)
    const remainingPerJob: Record<string, number> = {}
    for (const jobId of activeJobIds) {
      const { count } = await supabase
        .from('domains')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .lte('scheduled_date', today)

      remainingPerJob[jobId] = count || 0
    }

    console.log(`Remaining domains per job: ${JSON.stringify(remainingPerJob)}`)

    // Dynamic quota allocation: split this batch's budget between active jobs
    const quotaPerJob = allocateQuotas(activeJobIds, remainingPerJob, batchSize)
    console.log(`Batch quota allocation: ${JSON.stringify(quotaPerJob)}`)

    // Fetch domains for each job up to its quota
    interface DomainRecord {
      id: string
      domain: string
      job_id: string
      retry_count: number
    }
    const domainsToProcess: DomainRecord[] = []

    for (const jobId of activeJobIds) {
      const quota = quotaPerJob[jobId]
      if (quota <= 0) continue

      const { data: jobDomains, error: fetchError } = await supabase
        .from('domains')
        .select('id, domain, job_id, retry_count')
        .eq('job_id', jobId)
        .eq('status', 'pending')
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(quota)

      if (fetchError) {
        console.error(`Failed to fetch domains for job ${jobId}: ${fetchError.message}`)
        continue
      }

      if (jobDomains && jobDomains.length > 0) {
        domainsToProcess.push(...jobDomains)
      }
    }

    if (domainsToProcess.length === 0) {
      console.log('No domains to process in this batch')

      // Check for job completion and promote queued jobs
      await checkJobCompletionAndPromote(supabase, activeJobIds)

      return new Response(
        JSON.stringify({ message: 'No domains to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing batch of ${domainsToProcess.length} domains across ${activeJobIds.length} jobs`)

    // Update active job statuses to running
    await supabase
      .from('scan_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .in('id', activeJobIds)

    let processed = 0
    let failed = 0
    const maxRetries = 3

    for (let i = 0; i < domainsToProcess.length; i++) {
      const domain = domainsToProcess[i]

      try {
        // Mark as processing
        await supabase
          .from('domains')
          .update({ status: 'processing' })
          .eq('id', domain.id)

        console.log(`Processing: ${domain.domain}`)

        const enrichmentType = jobEnrichmentMap[domain.job_id] || 'webshop'

        if (enrichmentType === 'webshop') {
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

      // Random delay between scrapes (45s - 2min) to appear natural
      if (i < domainsToProcess.length - 1) {
        const delay = randomDelay()
        console.log(`  Waiting ${Math.round(delay / 1000)}s before next scrape...`)
        await sleep(delay)
      }
    }

    // Check job completion and promote queued jobs
    await checkJobCompletionAndPromote(supabase, activeJobIds)

    console.log(`Daily scan complete. Processed: ${processed}, Failed: ${failed}`)

    return new Response(
      JSON.stringify({
        message: 'Daily scan complete',
        date: today,
        processed,
        failed,
        total: domainsToProcess.length
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

// ─── Quota allocation ──
// Dynamically splits DAILY_SCRAPE_LIMIT between active jobs.
// If one job has fewer remaining domains than its equal share,
// the surplus goes to the other job.

function allocateQuotas(
  jobIds: string[],
  remainingPerJob: Record<string, number>,
  totalLimit: number
): Record<string, number> {
  const quotas: Record<string, number> = {}

  if (jobIds.length === 0) return quotas
  if (jobIds.length === 1) {
    quotas[jobIds[0]] = Math.min(remainingPerJob[jobIds[0]] || 0, totalLimit)
    return quotas
  }

  // Start with equal split
  const equalShare = Math.floor(totalLimit / jobIds.length)
  let surplus = 0

  // First pass: assign equal share or remaining count (whichever is smaller)
  for (const jobId of jobIds) {
    const remaining = remainingPerJob[jobId] || 0
    if (remaining < equalShare) {
      quotas[jobId] = remaining
      surplus += equalShare - remaining
    } else {
      quotas[jobId] = equalShare
    }
  }

  // Second pass: distribute surplus to jobs that can use more
  if (surplus > 0) {
    for (const jobId of jobIds) {
      const remaining = remainingPerJob[jobId] || 0
      const currentQuota = quotas[jobId]
      const canTakeMore = remaining - currentQuota
      if (canTakeMore > 0) {
        const extra = Math.min(canTakeMore, surplus)
        quotas[jobId] += extra
        surplus -= extra
      }
    }
  }

  return quotas
}

// ─── Job completion check and queue promotion ──

async function checkJobCompletionAndPromote(
  supabase: ReturnType<typeof createClient>,
  activeJobIds: string[]
) {
  for (const jobId of activeJobIds) {
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

        console.log(`Job ${jobId} completed. Checking queue...`)
      }
    }
  }

  // Promote queued jobs if there are now open slots
  await promoteQueuedJobs(supabase)
}

async function promoteQueuedJobs(supabase: ReturnType<typeof createClient>) {
  // Count currently active jobs
  const { data: currentActive } = await supabase
    .from('scan_jobs')
    .select('id')
    .in('status', ['pending', 'running'])

  const activeCount = currentActive?.length || 0
  const slotsAvailable = MAX_CONCURRENT_JOBS - activeCount

  if (slotsAvailable <= 0) return

  // Get oldest queued jobs to promote
  const { data: queuedJobs } = await supabase
    .from('scan_jobs')
    .select('id, name')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(slotsAvailable)

  if (!queuedJobs || queuedJobs.length === 0) return

  for (const job of queuedJobs) {
    await supabase
      .from('scan_jobs')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`Promoted queued job "${job.name}" (${job.id}) to pending`)
  }
}
