import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AhrefsMetrics {
  dr: number
  traffic: number
  refdomains: number
  backlinks: number
  keywords: number
}

interface WebshopMetrics {
  organic_keywords_current: number
  organic_keywords_3m: number
  organic_keywords_6m: number
  organic_keywords_12m: number
  organic_keywords_24m: number
  organic_traffic_current: number
  organic_traffic_3m: number
  organic_traffic_6m: number
  organic_traffic_12m: number
  organic_traffic_24m: number
  paid_keywords_current: number
  paid_keywords_3m: number
  paid_keywords_6m: number
  paid_keywords_12m: number
  paid_keywords_24m: number
  paid_traffic_current: number
  paid_traffic_3m: number
  paid_traffic_6m: number
  paid_traffic_12m: number
  paid_traffic_24m: number
}

interface BouwbedrijfMetrics {
  top_competitor: string
  top_competitor_traffic: number
  top_competitor_ads_keywords: number
  achievable_traffic: number
  content_gap_count: number
  content_gap_keywords: Array<{
    keyword: string
    volume: number
    difficulty: number
    competitor_position: number
  }>
}

// Mock Ahrefs client for development
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return () => {
    hash = Math.sin(hash) * 10000
    return hash - Math.floor(hash)
  }
}

async function getAhrefsMetrics(domain: string): Promise<AhrefsMetrics> {
  const useMock = Deno.env.get('USE_MOCK_AHREFS') !== 'false'

  if (useMock) {
    const random = seededRandom(domain)
    const dr = Math.floor(random() * 100)
    const trafficMultiplier = dr > 50 ? 10 : 1

    return {
      dr,
      traffic: Math.floor(random() * 100000 * trafficMultiplier),
      refdomains: Math.floor(random() * 5000 * (dr / 50)),
      backlinks: Math.floor(random() * 50000 * (dr / 30)),
      keywords: Math.floor(random() * 10000 * (dr / 40)),
    }
  }

  throw new Error('MCP integration not configured. Set USE_MOCK_AHREFS=true for development.')
}

const COMPETITOR_DOMAINS = [
  'competitor-a.nl', 'competitor-b.nl', 'branche-leider.nl',
  'top-concurrent.nl', 'marktleider.nl', 'grotespeler.nl',
  'bekende-naam.nl', 'sector-top.nl',
]

const GAP_KEYWORDS = [
  'dakkapel plaatsen', 'verbouwing kosten', 'aannemer bij mij in de buurt',
  'kozijnen vervangen', 'badkamer renovatie', 'keuken verbouwen',
  'uitbouw kosten', 'fundering herstellen', 'isolatie muur',
  'zonnepanelen installatie', 'vloerverwarming aanleggen', 'dak renovatie',
  'gevelbekleding', 'tuinhuis bouwen', 'garage bouwen kosten',
]

async function getWebshopMetrics(domain: string): Promise<WebshopMetrics> {
  const useMock = Deno.env.get('USE_MOCK_AHREFS') !== 'false'

  if (useMock) {
    const random = seededRandom(domain)
    const organicKeywordsCurrent = Math.floor(random() * 5000) + 100
    const organicTrafficCurrent = Math.floor(random() * 50000) + 500
    const paidKeywordsCurrent = Math.floor(random() * 500) + 10
    const paidTrafficCurrent = Math.floor(random() * 20000) + 100

    const declineFactor = () => 1 + random() * 0.4

    return {
      organic_keywords_current: organicKeywordsCurrent,
      organic_keywords_3m: Math.floor(organicKeywordsCurrent * declineFactor()),
      organic_keywords_6m: Math.floor(organicKeywordsCurrent * declineFactor() * declineFactor()),
      organic_keywords_12m: Math.floor(organicKeywordsCurrent * declineFactor() * declineFactor()),
      organic_keywords_24m: Math.floor(organicKeywordsCurrent * declineFactor() * declineFactor() * declineFactor()),
      organic_traffic_current: organicTrafficCurrent,
      organic_traffic_3m: Math.floor(organicTrafficCurrent * declineFactor()),
      organic_traffic_6m: Math.floor(organicTrafficCurrent * declineFactor() * declineFactor()),
      organic_traffic_12m: Math.floor(organicTrafficCurrent * declineFactor() * declineFactor()),
      organic_traffic_24m: Math.floor(organicTrafficCurrent * declineFactor() * declineFactor() * declineFactor()),
      paid_keywords_current: paidKeywordsCurrent,
      paid_keywords_3m: Math.floor(paidKeywordsCurrent * declineFactor()),
      paid_keywords_6m: Math.floor(paidKeywordsCurrent * declineFactor() * declineFactor()),
      paid_keywords_12m: Math.floor(paidKeywordsCurrent * declineFactor() * declineFactor()),
      paid_keywords_24m: Math.floor(paidKeywordsCurrent * declineFactor() * declineFactor() * declineFactor()),
      paid_traffic_current: paidTrafficCurrent,
      paid_traffic_3m: Math.floor(paidTrafficCurrent * declineFactor()),
      paid_traffic_6m: Math.floor(paidTrafficCurrent * declineFactor() * declineFactor()),
      paid_traffic_12m: Math.floor(paidTrafficCurrent * declineFactor() * declineFactor()),
      paid_traffic_24m: Math.floor(paidTrafficCurrent * declineFactor() * declineFactor() * declineFactor()),
    }
  }

  throw new Error('MCP integration not configured. Set USE_MOCK_AHREFS=true for development.')
}

async function getBouwbedrijfMetrics(domain: string): Promise<BouwbedrijfMetrics> {
  const useMock = Deno.env.get('USE_MOCK_AHREFS') !== 'false'

  if (useMock) {
    const random = seededRandom(domain)

    const competitorIndex = Math.floor(random() * COMPETITOR_DOMAINS.length)
    const topCompetitor = COMPETITOR_DOMAINS[competitorIndex]
    const competitorTraffic = Math.floor(random() * 100000) + 5000
    const competitorAdsKeywords = Math.floor(random() * 300) + 10
    const achievableTraffic = Math.floor(competitorTraffic * (0.3 + random() * 0.5))

    const gapCount = Math.floor(random() * 12) + 3
    const keywords = []
    const usedIndices = new Set<number>()
    for (let i = 0; i < gapCount; i++) {
      let idx = Math.floor(random() * GAP_KEYWORDS.length)
      while (usedIndices.has(idx)) {
        idx = (idx + 1) % GAP_KEYWORDS.length
      }
      usedIndices.add(idx)
      keywords.push({
        keyword: GAP_KEYWORDS[idx],
        volume: Math.floor(random() * 5000) + 100,
        difficulty: Math.floor(random() * 80) + 10,
        competitor_position: Math.floor(random() * 10) + 1,
      })
    }

    return {
      top_competitor: topCompetitor,
      top_competitor_traffic: competitorTraffic,
      top_competitor_ads_keywords: competitorAdsKeywords,
      achievable_traffic: achievableTraffic,
      content_gap_count: gapCount,
      content_gap_keywords: keywords,
    }
  }

  throw new Error('MCP integration not configured. Set USE_MOCK_AHREFS=true for development.')
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    console.log(`Starting daily scan for ${today}`)

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
    const rateLimitDelay = 5000 // 5 seconds between API calls

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
          // Webshop: get traffic/keyword decline data
          const metrics = await getWebshopMetrics(domain.domain)

          const { error: metricsError } = await supabase
            .from('webshop_metrics')
            .insert({
              domain_id: domain.id,
              ...metrics,
            })

          if (metricsError) {
            throw new Error(`Failed to save webshop metrics: ${metricsError.message}`)
          }
        } else if (enrichmentType === 'bouwbedrijf') {
          // Bouwbedrijf: get competitor + content gap data
          const metrics = await getBouwbedrijfMetrics(domain.domain)

          const { error: metricsError } = await supabase
            .from('bouwbedrijf_metrics')
            .insert({
              domain_id: domain.id,
              top_competitor: metrics.top_competitor,
              top_competitor_traffic: metrics.top_competitor_traffic,
              top_competitor_ads_keywords: metrics.top_competitor_ads_keywords,
              achievable_traffic: metrics.achievable_traffic,
              content_gap_count: metrics.content_gap_count,
              content_gap_keywords: metrics.content_gap_keywords,
            })

          if (metricsError) {
            throw new Error(`Failed to save bouwbedrijf metrics: ${metricsError.message}`)
          }
        } else {
          // Fallback: legacy behavior with domain_metrics
          const metrics = await getAhrefsMetrics(domain.domain)

          const { error: metricsError } = await supabase
            .from('domain_metrics')
            .insert({
              domain_id: domain.id,
              dr: metrics.dr,
              traffic: metrics.traffic,
              refdomains: metrics.refdomains,
              backlinks: metrics.backlinks,
              keywords: metrics.keywords,
            })

          if (metricsError) {
            throw new Error(`Failed to save metrics: ${metricsError.message}`)
          }
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
          // Mark as failed after max retries
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
          // Reset to pending for retry
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

      // Rate limiting - wait between API calls
      if (domains.indexOf(domain) < domains.length - 1) {
        await sleep(rateLimitDelay)
      }
    }

    // Check if all domains in each job are completed
    for (const jobId of jobIds) {
      const { data: jobDomains } = await supabase
        .from('domains')
        .select('status')
        .eq('job_id', jobId)

      if (jobDomains) {
        const allCompleted = jobDomains.every((d: { status: string }) => d.status === 'completed' || d.status === 'failed')
        const anyFailed = jobDomains.some((d: { status: string }) => d.status === 'failed')

        if (allCompleted) {
          await supabase
            .from('scan_jobs')
            .update({
              status: anyFailed ? 'completed' : 'completed',
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
