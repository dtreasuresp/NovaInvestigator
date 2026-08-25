'use client'

// Next Imports
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Component Imports
import { Button } from '@/components/ui/button'

const BuyNowButton = () => {
  const pathname = usePathname()

  // Do not render floating button on full-bleed apps like NovAi chat or auth pages
  if (pathname?.startsWith('/apps/novai') || pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
    return null
  }

  return (
    <Button
      render={<Link href='/pages/billing/upgrade' />}
      className='animate-heartbeat fixed right-15 bottom-8 z-50 hidden md:inline-flex'
      nativeButton={false}
    >
      Upgrade your plan
    </Button>
  )
}

export default BuyNowButton
