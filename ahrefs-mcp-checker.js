// ahrefs-mcp-checker.js
// Ahrefs scanner using REST API v3

const SUPABASE_URL = 'https://tqkplmbseqwlpmcueubp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa3BsbWJzZXF3bHBtY3VldWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTQ1NjMsImV4cCI6MjA4NTM5MDU2M30._Sbu-rS2WDvwcseZR92-RVUM8ZaJVctaEasLc0KBkJY'

const AHREFS_API_KEY = process.env.AHREFS_API_KEY
const AHREFS_API_URL = 'https://api.ahrefs.com/v3/site-explorer/metrics'
const RATE_LIMIT_MS = 90000 // 90 seconds between API calls

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase error: ${response.status} - ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

// Fetch metrics from Ahrefs REST API v3
async function fetchAhrefsMetrics(domain) {
  if (!AHREFS_API_KEY) {
    throw new Error('AHREFS_API_KEY environment variable is not set')
  }

  const response = await fetch(AHREFS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AHREFS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target: domain,
      mode: 'domain',
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ahrefs API error: ${response.status} - ${text}`)
  }

  const data = await response.json()

  // Map API v3 response fields to our database fields
  return {
    domain_rating: data.domain_rating ?? 0,
    ahrefs_rank: data.ahrefs_rank ?? 0,
    organic_traffic: data.organic_traffic ?? 0,
    referring_domains: data.referring_domains_total ?? 0,
    backlinks: data.backlinks_total ?? 0,
    traffic_value: data.traffic_value ?? 0
  }
}

async function checkDomainsViaMCP(batchSize = 100) {
  console.log('Starting Ahrefs domain check...\n')

  if (!AHREFS_API_KEY) {
    console.error('ERROR: AHREFS_API_KEY environment variable is not set')
    process.exit(1)
  }

  // Get pending domains
  const domains = await supabaseRequest(
    `domains?status=eq.pending&order=created_at.asc&limit=${batchSize}`
  )

  if (!domains || domains.length === 0) {
    console.log('No pending domains to check!')
    return
  }

  console.log(`Found ${domains.length} domains to check\n`)

  let completed = 0
  let failed = 0

  for (const domain of domains) {
    console.log(`[${completed + failed + 1}/${domains.length}] Checking: ${domain.domain}`)

    try {
      // Update status to processing
      await supabaseRequest(`domains?id=eq.${domain.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'processing' })
      })

      // Call Ahrefs API
      console.log('  Calling Ahrefs API...')
      const metrics = await fetchAhrefsMetrics(domain.domain)

      console.log(`  DR: ${metrics.domain_rating}, Traffic: ${(metrics.organic_traffic || 0).toLocaleString()}, Ref Domains: ${(metrics.referring_domains || 0).toLocaleString()}`)

      // Save metrics
      await supabaseRequest('domain_metrics', {
        method: 'POST',
        body: JSON.stringify({
          domain_id: domain.id,
          domain_rating: metrics.domain_rating,
          ahrefs_rank: metrics.ahrefs_rank,
          organic_traffic: metrics.organic_traffic,
          referring_domains: metrics.referring_domains,
          backlinks: metrics.backlinks,
          traffic_value: metrics.traffic_value
        })
      })

      // Update domain status
      await supabaseRequest(`domains?id=eq.${domain.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' })
      })

      // Update job progress
      await updateJobProgress(domain.job_id)

      completed++
      console.log('  Done!')

      // Rate limiting: wait 90 seconds before next API call (skip on last domain)
      if (completed + failed < domains.length) {
        console.log(`  Waiting 90 seconds for rate limiting...`)
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
      }

    } catch (error) {
      console.error(`  Error: ${error.message}`)

      const newRetryCount = (domain.retry_count || 0) + 1

      await supabaseRequest(`domains?id=eq.${domain.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newRetryCount >= 3 ? 'failed' : 'pending',
          retry_count: newRetryCount,
          error_message: error.message
        })
      })

      failed++

      // Also rate limit after errors to avoid hammering the API
      if (completed + failed < domains.length) {
        console.log(`  Waiting 90 seconds for rate limiting...`)
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS))
      }
    }
  }

  console.log(`\n--- SUMMARY ---`)
  console.log(`Completed: ${completed}`)
  console.log(`Failed: ${failed}`)
}

async function updateJobProgress(jobId) {
  // Get completed count for this job
  const completedDomains = await supabaseRequest(
    `domains?job_id=eq.${jobId}&status=eq.completed&select=id`,
    { headers: { 'Prefer': 'count=exact' } }
  )

  const job = await supabaseRequest(`scan_jobs?id=eq.${jobId}`)

  if (job && job[0]) {
    const completedCount = completedDomains ? completedDomains.length : 0
    const newStatus = completedCount >= job[0].total_domains ? 'completed' : 'running'

    await supabaseRequest(`scan_jobs?id=eq.${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
    })
  }
}

// Run it
checkDomainsViaMCP(100).catch(console.error)
