export interface AhrefsMetrics {
  dr: number
  traffic: number
  refdomains: number
  backlinks: number
  keywords: number
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
  }
}

export type AhrefsClient = typeof mockAhrefsClient
