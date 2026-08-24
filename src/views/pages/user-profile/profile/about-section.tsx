'use client'

// Third-party Imports
import {
  CheckCheckIcon,
  CheckIcon,
  FlagIcon,
  LanguagesIcon,
  LayoutGridIcon,
  type LucideIcon,
  MailIcon,
  MessagesSquareIcon,
  PhoneIcon,
  StarIcon,
  UserIcon
} from 'lucide-react'

// Components Imports
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserProfileData } from '../use-user-profile-data'
import { useI18n } from '@/hooks/use-i18n'

type AboutItem = {
  label: string
  value: string
  icon?: LucideIcon
}

type SectionData = {
  title: string
  items: AboutItem[]
}

function AboutSection() {
  const { t } = useI18n()
  const { data, loading } = useUserProfileData()

  if (loading || !data) {
    return (
      <div className='space-y-6'>
        <Card>
          <CardContent className='space-y-5'>
            <div className='space-y-2'>
              <Skeleton className='h-3 w-16' />
              <div className='space-y-3'>
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-4 w-36' />
                <Skeleton className='h-4 w-28' />
              </div>
            </div>
            <div className='space-y-2'>
              <Skeleton className='h-3 w-16' />
              <div className='space-y-3'>
                <Skeleton className='h-4 w-44' />
                <Skeleton className='h-4 w-36' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='space-y-5'>
            <div className='space-y-2'>
              <Skeleton className='h-3 w-16' />
              <div className='space-y-3'>
                <Skeleton className='h-4 w-36' />
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-4 w-40' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profile = data.profile
  const metrics = data.metrics
  const teams = data.teams || []

  const profileSections: SectionData[] = [
    {
      title: t('userProfile.aboutTitle'),
      items: [
        { icon: UserIcon, label: t('userSettings.firstName'), value: profile.displayName || profile.email?.split('@')[0] || 'Usuario' },
        { icon: CheckCheckIcon, label: t('roles.colStatus'), value: profile.status ? (profile.status.charAt(0).toUpperCase() + profile.status.slice(1)) : 'Active' },
        { icon: StarIcon, label: t('roles.colRole'), value: profile.institutionalRole || profile.role || 'Miembro' },
        { icon: FlagIcon, label: t('userSettings.country'), value: profile.country || 'No especificado' },
        { icon: LanguagesIcon, label: 'Languages', value: profile.languages || 'Español' }
      ]
    },
    {
      title: t('userProfile.contact'),
      items: [
        { icon: PhoneIcon, label: t('userSettings.mobile'), value: profile.mobile || 'No registrado' },
        { icon: MessagesSquareIcon, label: 'Skype', value: profile.skype || 'No registrado' },
        { icon: MailIcon, label: 'Email', value: profile.email || 'No registrado' }
      ]
    },
    {
      title: t('userProfile.tabTeams'),
      items: teams.length > 0
        ? teams.slice(0, 3).map(t => ({
            label: t.name,
            value: `(${t.totalMembers})`
          }))
        : [
            { label: t('userProfile.tabTeams'), value: 'Sin equipos asignados' }
          ]
    }
  ]

  const overviewSections: SectionData[] = [
    {
      title: t('userProfile.overviewTitle'),
      items: [
        { icon: CheckIcon, label: 'Task Compiled', value: `${metrics.tasksCompiled}` },
        { icon: UserIcon, label: t('userProfile.tabConnections'), value: `${metrics.totalConnections}` },
        { icon: LayoutGridIcon, label: 'Projects Compiled', value: `${metrics.projectsCompiled}` }
      ]
    }
  ]

  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-5'>
          {profileSections.map(section => (
            <div className='space-y-2' key={section.title}>
              <p className='text-muted-foreground text-xs font-medium uppercase'>{section.title}</p>
              <ul className='space-y-3'>
                {section.items.map(item => {
                  const Icon = item.icon

                  return (
                    <li className='flex items-center gap-2' key={item.label}>
                      {Icon ? <Icon className='size-4' /> : null}
                      <span className='text-sm font-medium'>{item.label}:</span>
                      <span className='text-sm'>{item.value}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className='space-y-5'>
          {overviewSections.map(section => (
            <div className='space-y-2' key={section.title}>
              <p className='text-muted-foreground text-xs font-medium uppercase'>{section.title}</p>
              <ul className='space-y-3'>
                {section.items.map(item => {
                  const Icon = item.icon

                  return (
                    <li className='flex items-center gap-2' key={item.label}>
                      {Icon ? <Icon className='size-4' /> : null}
                      <span className='text-sm font-medium'>{item.label}:</span>
                      <span className='text-sm'>{item.value}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutSection
