export interface AhrefsMetrics {
  dr: number
  traffic: number
  refdomains: number
  backlinks: number
  keywords: number
}

export interface WebshopMockMetrics {
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

export interface BouwbedrijfMockMetrics {
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

// Generates consistent-ish random data based on domain name
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

export const mockAhrefsClient = {
  async getMetrics(domain: string): Promise<AhrefsMetrics> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const random = seededRandom(domain)

    // Generate realistic-looking data based on domain
    const dr = Math.floor(random() * 100)
    const trafficMultiplier = dr > 50 ? 10 : 1

    return {
      dr,
      traffic: Math.floor(random() * 100000 * trafficMultiplier),
      refdomains: Math.floor(random() * 5000 * (dr / 50)),
      backlinks: Math.floor(random() * 50000 * (dr / 30)),
      keywords: Math.floor(random() * 10000 * (dr / 40)),
    }
  },

  async getWebshopMetrics(domain: string): Promise<WebshopMockMetrics> {
    await new Promise(resolve => setTimeout(resolve, 100))

    const random = seededRandom(domain)

    // Current values
    const organicKeywordsCurrent = Math.floor(random() * 5000) + 100
    const organicTrafficCurrent = Math.floor(random() * 50000) + 500
    const paidKeywordsCurrent = Math.floor(random() * 500) + 10
    const paidTrafficCurrent = Math.floor(random() * 20000) + 100

    // Simulate decline/stagnation: historical values are higher
    const declineFactor = () => 1 + random() * 0.4 // 1.0 to 1.4x higher in the past

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
  },

  async getBouwbedrijfMetrics(domain: string): Promise<BouwbedrijfMockMetrics> {
    await new Promise(resolve => setTimeout(resolve, 100))

    const random = seededRandom(domain)

    // Pick a competitor
    const competitorIndex = Math.floor(random() * COMPETITOR_DOMAINS.length)
    const topCompetitor = COMPETITOR_DOMAINS[competitorIndex]
    const competitorTraffic = Math.floor(random() * 100000) + 5000
    const competitorAdsKeywords = Math.floor(random() * 300) + 10

    // Achievable traffic is a fraction of competitor traffic
    const achievableTraffic = Math.floor(competitorTraffic * (0.3 + random() * 0.5))

    // Content gap keywords
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
  },
}

export type AhrefsClient = typeof mockAhrefsClient
