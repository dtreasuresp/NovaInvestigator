import { notFound, redirect } from 'next/navigation'

import { getCurrentPrincipal, getPlatformCapabilities } from '@/features/access/access-service'
import { isPlatformCapabilityKey } from '@/features/access/capabilityManifest'
import { PENDING_REGISTRATION_CLEANUP_CAPABILITY } from '@/features/platform/registration-cleanup'
import RegistrationCleanup from '@/views/apps/platform/registration-cleanup'

const RegistrationCleanupPage = async () => {
  const principal = await getCurrentPrincipal()

  if (!principal) {
    redirect('/pages/auth/login')
  }

  const capabilities = await getPlatformCapabilities()

  if (!Array.from(capabilities).some(capability => isPlatformCapabilityKey(capability) && capability === PENDING_REGISTRATION_CLEANUP_CAPABILITY)) {
    notFound()
  }

  return <RegistrationCleanup />
}

export default RegistrationCleanupPage
