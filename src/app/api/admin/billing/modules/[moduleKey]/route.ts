import { NextResponse } from 'next/server'

import { updateAdminPlatformModule } from '@/features/billing/admin-service'
import { readJsonBody, toErrorResponse } from '@/features/billing/http'
import { adminPlatformModuleKeySchema, adminPlatformModuleUpdateSchema } from '@/features/billing/schema'

export const runtime = 'nodejs'

export async function PATCH(request: Request, { params }: { params: Promise<{ moduleKey: string }> }) {
  try {
    const { moduleKey } = await params
    const normalizedModuleKey = adminPlatformModuleKeySchema.parse(moduleKey)
    const body = await readJsonBody(request, adminPlatformModuleUpdateSchema)
    const updatedModule = await updateAdminPlatformModule(normalizedModuleKey, body)

    return NextResponse.json({ module: updatedModule }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
