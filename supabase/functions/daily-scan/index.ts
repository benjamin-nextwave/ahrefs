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

// Mock Ahrefs client for development
// In production, this will be replaced with MCP integration
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
    // Generate mock data
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

  // Production: MCP integration would go here
  // This is a placeholder - actual MCP calls will be configured separately
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

    // Update job status to running
    const jobIds = [...new Set(domains.map(d => d.job_id))]
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

        // Get Ahrefs metrics
        const metrics = await getAhrefsMetrics(domain.domain)

        // Save metrics
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
        const allCompleted = jobDomains.every(d => d.status === 'completed' || d.status === 'failed')
        const anyFailed = jobDomains.some(d => d.status === 'failed')

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
