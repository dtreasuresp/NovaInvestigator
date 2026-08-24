// GET  /api/admin/users        — paginated tenant member listing (users.read)
// POST /api/admin/users        — create an administrative invitation (users.invite)
//
// Never creates a full auth.users row or password directly: invitations are
// accepted through Supabase Auth's own signup/magic-link flow, per
// doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md section 15.5
// ("No se expondrá un CRUD genérico que permita modificar auth.users o
// contraseñas desde el cliente").
import { NextResponse } from 'next/server'

import { inviteTenantMember, listTenantMembers } from '@/features/users/service'
import { inviteUserRequestSchema, listUsersQuerySchema } from '@/features/users/schema'
import { parseQuery, readJsonBody, toErrorResponse } from '@/features/users/http'

export async function GET(request: Request) {
  try {
    const query = parseQuery(request, listUsersQuerySchema)
    const result = await listTenantMembers(query)

    return NextResponse.json(result)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, inviteUserRequestSchema)
    const result = await inviteTenantMember(body)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
