// GET /api/admin/workspaces — active workspaces available for tenant invites.
import { NextResponse } from 'next/server'

import { listTenantInviteWorkspaces } from '@/features/users/service'
import { toErrorResponse } from '@/features/users/http'

export async function GET() {
  try {
    const items = await listTenantInviteWorkspaces()

    return NextResponse.json({ items })
  } catch (error) {
    return toErrorResponse(error)
  }
}
