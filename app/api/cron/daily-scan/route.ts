import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes (Vercel Pro limit)

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron call from Vercel
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    console.log('Vercel Cron: triggering daily-scan edge function')

    const response = await fetch(`${supabaseUrl}/functions/v1/daily-scan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('Edge function response:', data)

    return NextResponse.json({
      triggered: true,
      edgeFunctionStatus: response.status,
      result: data,
    })
  } catch (error) {
    console.error('Cron trigger error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
