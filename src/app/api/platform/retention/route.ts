import { NextResponse } from 'next/server'

import { executePlatformRetentionRun } from '@/features/platform/retention-service'
import { toErrorResponse } from '@/features/platform/http'

export const runtime = 'nodejs'
const noStore = { headers: { 'Cache-Control': 'private, no-store' } }

export async function POST() {
  try {
    const result = await executePlatformRetentionRun()

    return NextResponse.json({ result }, noStore)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function GET() {
  try {
    const result = await executePlatformRetentionRun()

    return NextResponse.json({ result }, noStore)
  } catch (error) {
    return toErrorResponse(error)
  }
}
