import { NextResponse } from 'next/server'

import { getCurrentPrincipal, getPlatformCapabilities } from '@/features/access/access-service'
import { isPlatformCapabilityKey } from '@/features/access/capabilityManifest'
import { toErrorResponse } from '@/features/platform/http'

export async function GET() {
  try {
    const principal = await getCurrentPrincipal()

    if (!principal) {
      return NextResponse.json({ capabilities: [] }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const capabilities = await getPlatformCapabilities()

    return NextResponse.json(
      { capabilities: Array.from(capabilities).filter(isPlatformCapabilityKey) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
