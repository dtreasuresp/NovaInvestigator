'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Third-party Imports
import { LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Hook Imports
import { useCurrentUser } from '@/hooks/use-current-user'
import { useI18n } from '@/hooks/use-i18n'

const ProfileDropdown = () => {
  const router = useRouter()
  const { t } = useI18n()
  const { user, loading, error: sessionError } = useCurrentUser()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const fullName = user?.fullName ?? (loading ? t('common.loading') : t('userMenu.guestSession'))
  const email = user?.email ?? (user?.isAnonymous ? t('userMenu.anonymousAccess') : sessionError ? t('userMenu.sessionUnavailable') : t('userMenu.notSignedIn'))

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleSignOut = async () => {
    setSignOutError(null)

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })

      if (!response.ok) {
        setSignOutError('auth.logoutFailed')

        return
      }

      router.replace('/pages/auth/login')
      router.refresh()
    } catch (requestError) {
      setSignOutError(requestError instanceof Error ? requestError.message : 'auth.networkError')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' size='icon' className='relative rounded-full hover:bg-transparent' />}
      >
        <Avatar>
          {user?.avatar ? <AvatarImage src={user.avatar} alt={fullName} /> : null}
          <AvatarFallback>{initials || 'GU'}</AvatarFallback>
        </Avatar>
        <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex items-center gap-4 px-2 py-2.5 font-normal'>
            <div className='relative'>
              <Avatar className='size-10'>
                {user?.avatar ? <AvatarImage src={user.avatar} alt={fullName} /> : null}
                <AvatarFallback>{initials || 'GU'}</AvatarFallback>
              </Avatar>
              <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
            </div>
            <div className='flex flex-1 flex-col items-start'>
              <span className='text-foreground text-base font-semibold'>{fullName}</span>
              <span className='text-muted-foreground text-sm'>{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href='/pages/user-profile?view=profile' />}>
            <UserIcon />
            <span>{t('userMenu.myAccount')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href='/pages/user-settings?setting=general' />}>
            <SettingsIcon />
            <span>{t('userMenu.settings')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {user ? (
            <DropdownMenuItem variant='destructive' onClick={() => void handleSignOut()}>
              <LogOutIcon />
              <span>{t('userMenu.logout')}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem render={<Link href='/pages/auth/login' />}>
              <LogOutIcon />
              <span>{t('auth.login')}</span>
            </DropdownMenuItem>
          )}
          {signOutError ? (
            <p className='text-destructive px-2 py-1 text-xs' role='alert'>
              {signOutError}
            </p>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
