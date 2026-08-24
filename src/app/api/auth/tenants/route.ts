import { NextResponse } from 'next/server'
import * as z from 'zod'

import { listPrimaryTenantOptions, setPrimaryTenant } from '@/features/access'

import { handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'

const setPrimaryTenantSchema = z.object({
  tenantId: z.string().uuid()
})

export async function GET() {
  try {
    const selection = await listPrimaryTenantOptions()

    return NextResponse.json(selection)
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = parseWithSchema(setPrimaryTenantSchema, await readJsonBody(request))
    const selection = await setPrimaryTenant(body.tenantId)

    return NextResponse.json(selection)
  } catch (error) {
    return handleRouteError(error)
  }
}
