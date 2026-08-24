import { NextResponse } from 'next/server'

import { listReceivedTenantInvitations } from '@/features/users/service'
import { toErrorResponse } from '@/features/users/http'

export async function GET() {
  try {
    const result = await listReceivedTenantInvitations()

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}
