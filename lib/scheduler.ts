export interface ScheduledDomain {
  domain: string
  scheduledDate: Date
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function scheduleDomains(domains: string[], startDate: Date): ScheduledDomain[] {
  const MAX_PER_DAY = 100
  const DAYS = 14

  if (domains.length === 0) {
    return []
  }

  // Calculate how many domains per day, respecting the max
  const domainsPerDay = Math.min(
    Math.ceil(domains.length / DAYS),
    MAX_PER_DAY
  )

  return domains.map((domain, index) => {
    const dayOffset = Math.floor(index / domainsPerDay)
    const scheduledDate = addDays(startDate, dayOffset)
    return { domain, scheduledDate }
  })
}

export function calculateEndDate(domains: string[], startDate: Date): Date {
  const MAX_PER_DAY = 100
  const DAYS = 14

  if (domains.length === 0) {
    return startDate
  }

  const domainsPerDay = Math.min(
    Math.ceil(domains.length / DAYS),
    MAX_PER_DAY
  )

  const totalDays = Math.ceil(domains.length / domainsPerDay)
  return addDays(startDate, totalDays - 1)
}
