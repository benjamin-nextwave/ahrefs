import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCSV } from '@/lib/utils'
import { scheduleDomains, calculateEndDate, formatDate, addDays } from '@/lib/scheduler'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const jobName = formData.get('name') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!jobName) {
      return NextResponse.json(
        { error: 'Job name is required' },
        { status: 400 }
      )
    }

    const csvContent = await file.text()
    const { domains, errors } = parseCSV(csvContent)

    if (domains.length === 0) {
      return NextResponse.json(
        { error: 'No valid domains found in CSV', details: errors },
        { status: 400 }
      )
    }

    // Start scheduling from tomorrow
    const startDate = addDays(new Date(), 1)
    const endDate = calculateEndDate(domains, startDate)
    const scheduledDomains = scheduleDomains(domains, startDate)

    const supabase = createAdminClient()

    // Create the scan job
    const { data: job, error: jobError } = await supabase
      .from('scan_jobs')
      .insert({
        name: jobName,
        total_domains: domains.length,
        status: 'pending',
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create scan job' },
        { status: 500 }
      )
    }

    // Insert all domains
    const domainRecords = scheduledDomains.map(({ domain, scheduledDate }) => ({
      job_id: job.id,
      domain,
      scheduled_date: formatDate(scheduledDate),
      status: 'pending',
    }))

    const { error: domainsError } = await supabase
      .from('domains')
      .insert(domainRecords)

    if (domainsError) {
      console.error('Failed to insert domains:', domainsError)
      // Clean up the job
      await supabase.from('scan_jobs').delete().eq('id', job.id)
      return NextResponse.json(
        { error: 'Failed to save domains' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalDomains: domains.length,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      warnings: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
