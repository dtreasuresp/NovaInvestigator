'use client'

// React Imports
import { Suspense } from 'react'

// Third-party Imports
import { BriefcaseBusinessIcon, CalendarDaysIcon, MapPinIcon, UserRoundCheckIcon } from 'lucide-react'
import { format } from 'date-fns'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BackgroundRippleEffect } from '@/components/ui/background-ripple'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import UserProfileTabs from '@/views/pages/user-profile/user-profile-tabs'
import { UserProfileProvider, useUserProfileData } from './use-user-profile-data'

function UserProfileHeader() {
  const { data, loading } = useUserProfileData()

  if (loading || !data) {
    return (
      <div className='mb-4 md:mb-6 lg:mb-10'>
        <Card className='py-0 pb-6'>
          <Skeleton className='h-44 w-full rounded-t-lg rounded-b-none' />
          <CardContent>
            <div className='flex items-end gap-4 pb-1 max-md:flex-col max-md:items-center md:flex-nowrap md:gap-6'>
              <Skeleton className='-mt-12 size-28 rounded-md ring-4 ring-card md:-mt-14 shrink-0' />
              <div className='min-w-0 flex-1 space-y-2 text-center md:text-left'>
                <Skeleton className='h-7 w-48 max-md:mx-auto' />
                <div className='flex flex-wrap items-center gap-x-6 gap-y-2 max-md:justify-center'>
                  <Skeleton className='h-4 w-28' />
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-4 w-32' />
                </div>
              </div>
              <Skeleton className='h-10 w-28 md:ml-auto md:self-end' />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profile = data.profile
  const displayName = profile.displayName || profile.email?.split('@')[0] || 'Usuario'
  const role = profile.institutionalRole || profile.role || 'Miembro'
  const country = profile.country || 'No especificado'
  const joinedDate = profile.createdAt
    ? format(new Date(profile.createdAt), 'MMMM yyyy')
    : 'Reciente'
  const avatarUrl = profile.avatarUrl || undefined
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className='mb-4 md:mb-6 lg:mb-10'>
      <Card className='py-0 pb-6'>
        <div className='bg-muted relative h-44 overflow-hidden'>
          <div className='absolute inset-0'>
            <BackgroundRippleEffect cellSize={45} rows={8} activeSquares={18} cols={45} />
          </div>
        </div>

        <CardContent>
          <div className='flex items-end gap-4 pb-1 max-md:flex-col max-md:items-center md:flex-nowrap md:gap-6'>
            <Avatar className='ring-card z-3 -mt-12 size-28 rounded-md ring-4 after:rounded-[inherit] md:-mt-14'>
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className='rounded-[inherit]' /> : null}
              <AvatarFallback className='text-2xl font-medium rounded-[inherit]'>{initials || 'US'}</AvatarFallback>
            </Avatar>

            <div className='min-w-0 flex-1 space-y-2 text-center md:text-left'>
              <h2 className='text-2xl font-medium'>{displayName}</h2>
              <div className='text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 max-md:justify-center'>
                <span className='inline-flex items-center gap-2'>
                  <BriefcaseBusinessIcon className='size-4.5' />
                  {role}
                </span>
                <span className='inline-flex items-center gap-2'>
                  <MapPinIcon className='size-4.5' />
                  {country}
                </span>
                <span className='inline-flex items-center gap-2'>
                  <CalendarDaysIcon className='size-4.5' />
                  {joinedDate}
                </span>
              </div>
            </div>

            <Button className='md:ml-auto md:self-end'>
              <UserRoundCheckIcon className='size-4' />
              Connected
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const UserProfile = () => {
  return (
    <UserProfileProvider>
      <div>
        <UserProfileHeader />
        <Suspense>
          <UserProfileTabs />
        </Suspense>
      </div>
    </UserProfileProvider>
  )
}

export default UserProfile
