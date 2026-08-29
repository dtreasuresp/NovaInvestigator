'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import LogoSvg from '@/assets/svg/logo'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { usePermissions } from '@/hooks/use-permissions'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'

interface AppInitializerGateProps {
  children: ReactNode
}

export function AppInitializerGate({ children }: AppInitializerGateProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const { loading: permissionsLoading, refetch: refetchPermissions } = usePermissions()
  const { loading: userLoading, refetch: refetchUser, user } = useCurrentUser()

  const isAuthPage = pathname.startsWith('/pages/auth')
  const prevPathnameRef = useRef(pathname)
  const prevUserIdRef = useRef(user?.id)
  const hasInitializedRef = useRef(false)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [isFading, setIsFading] = useState(false)

  // Detect transition from auth page (login) to a protected app page
  useEffect(() => {
    const wasAuthPage = prevPathnameRef.current.startsWith('/pages/auth')
    const isNowProtected = !pathname.startsWith('/pages/auth')

    if (wasAuthPage && isNowProtected) {
      hasInitializedRef.current = false
      setIsRefreshing(true)
      setShowOverlay(true)
      setIsFading(false)
      void Promise.all([refetchPermissions(), refetchUser()]).finally(() => {
        setIsRefreshing(false)
      })
    }

    prevPathnameRef.current = pathname
  }, [pathname, refetchPermissions, refetchUser])

  // Detect user state change (e.g. from guest/null to logged-in user)
  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    const currentUserId = user?.id

    if (!prevUserId && currentUserId && !isAuthPage) {
      setIsRefreshing(true)
      setShowOverlay(true)
      setIsFading(false)
      void refetchPermissions().finally(() => {
        setIsRefreshing(false)
      })
    }

    prevUserIdRef.current = currentUserId
  }, [user?.id, isAuthPage, refetchPermissions])

  const isLoading = (permissionsLoading || userLoading || isRefreshing) && !isAuthPage

  useEffect(() => {
    if (!isLoading) {
      hasInitializedRef.current = true
      setIsFading(true)
      const timer = setTimeout(() => {
        setShowOverlay(false)
        setIsFading(false)
      }, 300)

      return () => clearTimeout(timer)
    } else if (!isAuthPage && !hasInitializedRef.current) {
      setShowOverlay(true)
      setIsFading(false)
    } else {
      setShowOverlay(false)
    }
  }, [isLoading, isAuthPage])

  return (
    <>
      {children}

      {!isAuthPage && showOverlay && (
        <div
          data-slot='app-initializer-gate'
          aria-label={t('common.loading')}
          className={cn(
            'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-300',
            isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <div className='flex flex-col items-center gap-6 p-8 max-w-sm text-center rounded-2xl bg-card border shadow-xl'>
            <div className='relative flex items-center justify-center size-16 rounded-2xl bg-primary/10 p-3'>
              <LogoSvg className='size-10 animate-pulse' />
            </div>

            <div className='flex flex-col items-center gap-1.5'>
              <h2 className='text-xl font-bold tracking-tight text-foreground'>NovaResearch</h2>
              <p className='text-xs text-muted-foreground'>{t('common.loading')}</p>
            </div>

            <div className='w-48 mt-1'>
              <Progress value={null} className='w-full'>
                <ProgressTrack className='h-1.5 bg-muted/60 overflow-hidden'>
                  <ProgressIndicator className='h-full bg-primary animate-pulse' />
                </ProgressTrack>
              </Progress>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AppInitializerGate
