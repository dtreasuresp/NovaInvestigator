'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ArrowRightIcon, LogOutIcon, ShieldAlertIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useBilling } from '@/hooks/use-billing'
import { useI18n } from '@/hooks/use-i18n'
import { shouldBlockCommercialAccess } from '@/lib/billing/commercial-access-routes'

const CommercialAccessGate = ({ children }: { children: ReactNode }) => {
  const { t } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { billing, loading, error: billingError, refresh } = useBilling()
  const [guestTrialActive, setGuestTrialActive] = useState(false)
  const [guestTrialLoading, setGuestTrialLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const previousPathname = useRef(pathname)
  const accessRetryScheduled = useRef(false)

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return
    }

    previousPathname.current = pathname
    accessRetryScheduled.current = false
    void refresh()
  }, [pathname, refresh])

  useEffect(() => {
    let mounted = true

    const loadGuestTrial = async () => {
      setGuestTrialLoading(true)

      try {
        const response = await fetch('/api/guest-trial/me', { cache: 'no-store' })

        const payload = (await response.json()) as {
          guestTrial?: { status?: string }
        }

        if (mounted) {
          setGuestTrialActive(response.ok && payload.guestTrial?.status === 'active')
        }
      } catch {
        if (mounted) {
          setGuestTrialActive(false)
        }
      } finally {
        if (mounted) {
          setGuestTrialLoading(false)
        }
      }
    }

    void loadGuestTrial()

    return () => {
      mounted = false
    }
  }, [pathname])

  useEffect(() => {
    if (loading || billing?.commercialAccess.status === 'active' || accessRetryScheduled.current) {
      return
    }

    accessRetryScheduled.current = true

    // Stripe webhooks are asynchronous, so retry once after the first summary.
    let retryPending = true

    const retryId = window.setTimeout(() => {
      retryPending = false

      void refresh()
    }, 2500)

    return () => {
      window.clearTimeout(retryId)

      if (retryPending) {
        accessRetryScheduled.current = false
      }
    }
  }, [billing?.commercialAccess.status, loading, refresh])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refresh])

  const isBlocked =
    !loading &&
    !guestTrialLoading &&
    !billingError &&
    billing !== null &&
    billing.commercialAccess.status !== 'active' &&
    !guestTrialActive &&
    shouldBlockCommercialAccess(pathname, searchParams)

  const handleSignOut = async () => {
    setSignOutError(null)
    setIsSigningOut(true)

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })

      if (!response.ok) {
        setSignOutError('No se pudo cerrar la sesión. Por favor intenta de nuevo.')
        setIsSigningOut(false)

        return
      }

      router.replace('/pages/auth/login')
      router.refresh()
    } catch {
      setSignOutError('No se pudo cerrar la sesión. Por favor intenta de nuevo.')
      setIsSigningOut(false)
    }
  }

  return (
    <>
      {children}
      <Dialog open={isBlocked} onOpenChange={() => undefined} disablePointerDismissal>
        <DialogContent showCloseButton={false} className='sm:max-w-lg'>
          <DialogHeader>
            <div className='bg-destructive/10 text-destructive mb-1 flex size-11 items-center justify-center rounded-full'>
              <ShieldAlertIcon aria-hidden='true' />
            </div>
            <DialogTitle>{t('platform.planAction')}</DialogTitle>
            <DialogDescription>
              Tu prueba o acceso contratado ha finalizado. Elige un plan para reanudar el uso operativo de la plataforma.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='sm:justify-between'>
            <Button variant='ghost' onClick={() => void handleSignOut()} disabled={isSigningOut}>
              <LogOutIcon aria-hidden='true' />
              {isSigningOut ? t('common.loading') : t('nav.logout')}
            </Button>
            <Button render={<Link href='/pages/pricing' />} nativeButton={false}>
              {t('nav.pricing')}
              <ArrowRightIcon aria-hidden='true' />
            </Button>
          </DialogFooter>
          {signOutError ? (
            <p className='text-destructive text-sm' role='alert'>
              {signOutError}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CommercialAccessGate
