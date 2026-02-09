import Papa from 'papaparse'

export interface ParsedCSV {
  domains: string[]
  errors: string[]
}

export function parseCSV(csvContent: string): ParsedCSV {
  const domains: string[] = []
  const errors: string[] = []

  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
    transformHeader: (header) => header.toLowerCase().trim(),
  })

  if (result.errors.length > 0) {
    result.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`)
    })
  }

  const data = result.data as Record<string, string>[]

  // Find the domain column (could be 'domain', 'domains', 'url', 'website')
  const domainKeys = ['domain', 'domains', 'url', 'website', 'site']
  let domainColumn: string | null = null

  if (data.length > 0) {
    const firstRow = data[0]
    for (const key of domainKeys) {
      if (key in firstRow) {
        domainColumn = key
        break
      }
    }
  }

  if (!domainColumn) {
    errors.push('No domain column found. Expected columns: domain, domains, url, website, or site')
    return { domains, errors }
  }

  data.forEach((row, index) => {
    const domain = row[domainColumn!]?.trim()
    if (domain) {
      // Clean the domain (remove protocol, trailing slashes)
      const cleanedDomain = cleanDomain(domain)
      if (isValidDomain(cleanedDomain)) {
        domains.push(cleanedDomain)
      } else {
        errors.push(`Row ${index + 2}: Invalid domain "${domain}"`)
      }
    }
  })

  return { domains, errors }
}

export function cleanDomain(domain: string): string {
  let cleaned = domain.toLowerCase().trim()

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '')

  // Remove www.
  cleaned = cleaned.replace(/^www\./, '')

  // Remove trailing slash and path
  cleaned = cleaned.split('/')[0]

  // Remove port
  cleaned = cleaned.split(':')[0]

  return cleaned
}

export function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i
  return domainRegex.test(domain)
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
