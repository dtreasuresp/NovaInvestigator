'use client'

// Third-party Imports
import { ChartNoAxesColumnIncreasingIcon, FileIcon, FileSpreadsheetIcon, FileTextIcon, ImageIcon } from 'lucide-react'

// Type Imports
import type { ActivityFileType, UserActivityItem } from '@/types/pages/user-profile-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine
} from '@/components/ui/timeline'

// Util Imports
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

const ATTACHMENT_FILE_ICONS: Record<ActivityFileType, typeof FileTextIcon> = {
  pdf: FileTextIcon,
  image: ImageIcon,
  doc: FileIcon,
  excel: FileSpreadsheetIcon
}

const ATTACHMENT_BADGE_STYLES: Record<ActivityFileType, string> = {
  pdf: 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400',
  image: 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400',
  doc: 'border-primary text-primary',
  excel: 'border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'
}

function ActivityAttachmentItem({ attachment }: { attachment: NonNullable<UserActivityItem['attachment']> }) {
  const fileType = attachment.fileType || 'doc'
  const Icon = ATTACHMENT_FILE_ICONS[fileType] || FileTextIcon

  return (
    <div className='flex items-center gap-2 rounded-md border p-2 bg-muted/30'>
      <div className={cn('p-1 rounded border', ATTACHMENT_BADGE_STYLES[fileType])}>
        <Icon className='size-4' />
      </div>
      <div className='flex flex-col min-w-0'>
        <span className='text-xs font-medium truncate'>{attachment.name}</span>
      </div>
    </div>
  )
}

function ActivityPersonCard({ person }: { person: NonNullable<UserActivityItem['person']> }) {
  return (
    <div className='bg-muted/50 flex w-fit max-w-sm items-center gap-3 rounded-md border px-3 py-2.5'>
      <Avatar className='size-8'>
        {person.avatar ? <AvatarImage src={person.avatar} alt={person.name} /> : null}
        <AvatarFallback className='text-xs'>{person.initials}</AvatarFallback>
      </Avatar>
      <div className='min-w-0'>
        <p className='truncate text-sm font-semibold'>{person.name}</p>
        {person.role ? <p className='text-muted-foreground truncate text-xs'>{person.role}</p> : null}
      </div>
    </div>
  )
}

function ActivityTeamAvatars({ teamMembers, teamExtraCount }: { teamMembers: NonNullable<UserActivityItem['teamMembers']>; teamExtraCount?: number }) {
  const visibleMembers = teamMembers.slice(0, 3)
  const extraCount = teamExtraCount ?? Math.max(0, teamMembers.length - 3)

  return (
    <AvatarGroup>
      {visibleMembers.map((member, index) => (
        <Avatar key={`${member.name}-${index}`} className='ring-background ring-2' size='sm'>
          {member.avatar ? <AvatarImage src={member.avatar} alt={member.name} /> : null}
          <AvatarFallback className='text-[10px]'>{member.initials}</AvatarFallback>
        </Avatar>
      ))}
      {extraCount > 0 ? <AvatarGroupCount>+{extraCount}</AvatarGroupCount> : null}
    </AvatarGroup>
  )
}

export interface ActivityTimelineProps {
  activityLog: UserActivityItem[]
  loading?: boolean
  className?: string
}

export const ActivityTimeline = ({ activityLog, loading, className }: ActivityTimelineProps) => {
  const { t } = useI18n()

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-2.5', className)}>
        <Card>
          <CardHeader className='flex items-center gap-2'>
            <Skeleton className='size-5 rounded' />
            <Skeleton className='h-5 w-36' />
          </CardHeader>
          <CardContent className='space-y-6 pt-2'>
            {[1, 2, 3].map(i => (
              <div key={i} className='flex items-start gap-4'>
                <Skeleton className='size-3.5 rounded-full mt-1 shrink-0' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-4 w-48' />
                  <Skeleton className='h-3 w-32' />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <Card>
        <CardHeader className='flex items-center gap-2'>
          <ChartNoAxesColumnIncreasingIcon />
          <h2 className='text-lg font-medium'>{t('userProfile.activityTimelineTitle')}</h2>
        </CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              No hay actividad reciente registrada en este espacio de trabajo.
            </div>
          ) : (
            <Timeline>
              {activityLog.map((item, index) => {
                const isLast = index === activityLog.length - 1

                return (
                  <TimelineItem key={item.id} status='done' className='gap-x-0'>
                    <TimelineDot
                      status='custom'
                      className='bg-primary/20 flex size-4.5 shrink-0 items-center justify-center rounded-full'
                    >
                      <span className='bg-primary size-3 rounded-full' />
                    </TimelineDot>
                    {!isLast && <TimelineLine done className='bg-muted min-h-10' />}
                    <TimelineHeading className='text-foreground flex w-full items-center justify-between pt-2.5 pb-2 pl-4 text-base font-medium text-wrap'>
                      {item.description}
                      <span className='text-muted-foreground text-xs font-normal text-nowrap md:text-sm'>
                        {item.timestamp}
                      </span>
                    </TimelineHeading>
                    {item.detail || item.attachment || item.person || (item.teamMembers && item.teamMembers.length) ? (
                      <TimelineContent className='flex flex-col gap-2 pb-3 pl-4'>
                        {item.detail ? <span className='text-muted-foreground text-sm'>{item.detail}</span> : null}
                        {item.attachment ? <ActivityAttachmentItem attachment={item.attachment} /> : null}
                        {item.person ? <ActivityPersonCard person={item.person} /> : null}
                        {item.teamMembers?.length ? (
                          <ActivityTeamAvatars teamMembers={item.teamMembers} teamExtraCount={item.teamExtraCount} />
                        ) : null}
                      </TimelineContent>
                    ) : null}
                  </TimelineItem>
                )
              })}
            </Timeline>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ActivityTimeline
