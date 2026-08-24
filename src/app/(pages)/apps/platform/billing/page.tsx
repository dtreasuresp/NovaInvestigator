import { notFound, redirect } from 'next/navigation'

import { getCurrentPrincipal, getPlatformCapabilities } from '@/features/access/access-service'
import { isPlatformCapabilityKey } from '@/features/access/capabilityManifest'
import PlatformBillingView from '@/views/apps/platform/platform-billing'

const PlatformBillingPage = async () => {
  const principal = await getCurrentPrincipal()

  if (!principal) {
    redirect('/pages/auth/login')
  }

  const capabilities = await getPlatformCapabilities()

  if (
    !Array.from(capabilities).some(
      capability => isPlatformCapabilityKey(capability) && (capability === 'platform.billing.manage' || capability === 'billing.plans.manage')
    )
  ) {
    notFound()
  }

  return <PlatformBillingView />
}

export default PlatformBillingPage
