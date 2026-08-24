'use client'

// React Imports
import { useState, type ComponentType, type SVGAttributes } from 'react'

// Third-party Imports
import { LinkIcon, PaletteIcon, Trash2Icon } from 'lucide-react'

// Type Imports
import type { AppUser, SocialPlatform } from '@/types/apps/user-types'

// Component Imports
import FacebookIcon from '@/assets/svg/facebook-icon'
import GithubIcon from '@/assets/svg/github-icon'
import LinkedinIcon from '@/assets/svg/linkedin-icon'
import TwitterIcon from '@/assets/svg/twitter-icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { cn } from '@/lib/utils'

interface BrandItem {
  image?: string
  icon?: string
}

interface ConnectedIntegration extends BrandItem {
  id: string
  name: string
  description: string
  enabled?: boolean
}

interface SocialAccount extends BrandItem {
  platform: SocialPlatform
  label: string
}

const ICONS: Record<string, ComponentType<SVGAttributes<SVGElement>>> = {
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  linkedin: LinkedinIcon,
  github: GithubIcon,
  dribbble: PaletteIcon,
  mailchimp: PaletteIcon
}

const CONNECTED_INTEGRATIONS: ConnectedIntegration[] = [
  {
    id: 'google',
    name: 'Google',
    description: 'Calendario y contactos',
    image: '/images/logos/google.png'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Canales y alertas',
    image: '/images/logos/slack.png'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repositorios y proyectos',
    icon: 'github'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Campañas de correo',
    image: '/images/logos/mailchimp.png'
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Gestión de proyectos',
    image: '/images/logos/asana.png'
  }
]

const SOCIAL_ACCOUNTS: SocialAccount[] = [
  { platform: 'facebook', label: 'Facebook', icon: 'facebook' },
  { platform: 'twitter', label: 'Twitter', icon: 'twitter' },
  { platform: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { platform: 'dribbble', label: 'Dribbble', icon: 'dribbble' },
  { platform: 'github', label: 'GitHub', icon: 'github' }
]

const BrandAvatar = ({ item, alt }: { item: BrandItem; alt: string }) => {
  if (item.image) {
    return (
      <Avatar className='size-9 shrink-0 rounded-lg'>
        <AvatarImage src={item.image} alt={alt} />
        <AvatarFallback className='rounded-lg text-xs'>{alt.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
    )
  }

  const IconComponent = item.icon ? ICONS[item.icon] : null

  return (
    <div className='bg-muted/40 flex size-9 shrink-0 items-center justify-center rounded-lg border'>
      {IconComponent ? <IconComponent className='size-5' /> : null}
    </div>
  )
}

const getSocialHandle = (url: string) => {
  try {
    const parsed = new URL(url)

    return `@${parsed.pathname.replace(/^\/+/, '').split('/')[0] || parsed.hostname}`
  } catch {
    return url
  }
}

export interface ConnectionsTabProps {
  user: AppUser
}

export function ConnectionsTab({ user }: ConnectionsTabProps) {
  const { t } = useI18n()
  const [integrationToggles, setIntegrationToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONNECTED_INTEGRATIONS.map(item => [item.id, item.enabled ?? false]))
  )

  const socialLinks = user.socialLinks ?? []

  return (
    <div className='space-y-6'>
      <Card className='gap-0 py-0'>
        <CardHeader className='border-b px-6 py-4!'>
          <CardTitle className='text-base'>{t('userSettings.connectAccountsTitle') || 'Cuentas Conectadas'}</CardTitle>
          <p className='text-muted-foreground text-sm'>{t('userSettings.connectAccountsHelp') || 'Sincroniza e integra servicios externos con tu cuenta'}</p>
        </CardHeader>
        <CardContent className='px-0 pb-0'>
          <div className='divide-y'>
            {CONNECTED_INTEGRATIONS.map(integration => (
              <div key={integration.id} className='flex flex-wrap items-center justify-between gap-4 px-6 py-4'>
                <div className='flex min-w-0 flex-1 items-center gap-4'>
                  <BrandAvatar item={integration} alt={integration.name} />
                  <div className='min-w-0'>
                    <p className='font-medium'>{integration.name}</p>
                    <p className='text-muted-foreground text-sm'>{integration.description}</p>
                  </div>
                </div>
                <Switch
                  checked={integrationToggles[integration.id] ?? false}
                  onCheckedChange={value => setIntegrationToggles(prev => ({ ...prev, [integration.id]: value }))}
                  aria-label={integration.name}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className='gap-0 py-0'>
        <CardHeader className='border-b px-6 py-4!'>
          <CardTitle className='text-base'>{t('userProfile.socialProfiles') || 'Redes Sociales y Perfiles'}</CardTitle>
          <p className='text-muted-foreground text-sm'>{t('userProfile.socialProfilesDesc') || 'Vincula tus perfiles públicos para mostrarlos en el espacio de trabajo'}</p>
        </CardHeader>
        <CardContent className='px-0 pb-0'>
          <div className='divide-y'>
            {SOCIAL_ACCOUNTS.map(account => {
              const linkedAccount = socialLinks.find(link => link.platform === account.platform)
              const isConnected = Boolean(linkedAccount)

              return (
                <div key={account.platform} className='flex flex-wrap items-center justify-between gap-4 px-6 py-4'>
                  <div className='flex min-w-0 flex-1 items-center gap-4'>
                    <BrandAvatar item={account} alt={account.label} />
                    <div className='min-w-0'>
                      <p className='font-medium'>{account.label}</p>
                      {isConnected && linkedAccount ? (
                        <a
                          href={linkedAccount.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-primary text-sm hover:underline'
                        >
                          {getSocialHandle(linkedAccount.url)}
                        </a>
                      ) : (
                        <p className='text-muted-foreground text-sm'>{t('common.status') || 'No conectado'}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={cn(
                      'size-9 shrink-0 rounded-lg',
                      isConnected
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    )}
                    aria-label={account.label}
                  >
                    {isConnected ? <Trash2Icon className='size-4' /> : <LinkIcon className='size-4' />}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
