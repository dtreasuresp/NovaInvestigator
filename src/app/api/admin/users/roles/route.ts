import { NextResponse } from 'next/server'

import { listTenantInviteRoles } from '@/features/users/service'
import { toErrorResponse } from '@/features/users/http'

export async function GET() {
  try {
    const items = await listTenantInviteRoles()

    return NextResponse.json({ items })
  } catch (error) {
    return toErrorResponse(error)
  }
}
