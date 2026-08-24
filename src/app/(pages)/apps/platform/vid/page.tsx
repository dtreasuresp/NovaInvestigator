import { notFound, redirect } from 'next/navigation'

import { getCurrentPrincipal, getPlatformCapabilities } from '@/features/access/access-service'
import { isPlatformCapabilityKey } from '@/features/access/capabilityManifest'
import VidReview from '@/views/apps/platform/vid'

const VID_READ_CAPABILITY = 'platform.vid.read' as const

const VidPage = async () => {
  const principal = await getCurrentPrincipal()

  if (!principal) {
    redirect('/pages/auth/login')
  }

  const capabilities = await getPlatformCapabilities()

  if (!Array.from(capabilities).some(capability => isPlatformCapabilityKey(capability) && capability === VID_READ_CAPABILITY)) {
    notFound()
  }

  return <VidReview />
}

export default VidPage
