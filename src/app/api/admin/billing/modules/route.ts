import { NextResponse } from 'next/server'

import { createAdminPlatformModule, listAdminPlatformModules } from '@/features/billing/admin-service'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'
import { adminPlatformModuleCreateSchema } from '@/features/billing/schema'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const modules = await listAdminPlatformModules()

    return NextResponse.json({ modules }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, adminPlatformModuleCreateSchema)
    const createdModule = await createAdminPlatformModule(body)

    return NextResponse.json(
      { module: createdModule },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
