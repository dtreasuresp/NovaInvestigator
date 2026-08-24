'use client'

// Type Imports
import type { AppUser } from '@/types/apps/user-types'

// Component Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountTab } from './tabs/account-tab'
import { BillingTab } from './tabs/billing-tab'
import { ConnectionsTab } from './tabs/connections-tab'
import { NotificationsTab } from './tabs/notifications-tab'
import { SecurityTab } from './tabs/security-tab'
import { useI18n } from '@/hooks/use-i18n'

export interface UserViewTabsProps {
  user: AppUser
}

export function UserViewTabs({ user }: UserViewTabsProps) {
  const { t } = useI18n()

  return (
    <Tabs defaultValue='account' className='flex-1 justify-between gap-6'>
      <div className='overflow-x-auto'>
        <TabsList className='w-max min-w-full **:group-data-[orientation=horizontal]/tabs:after:h-0'>
          <TabsTrigger value='account'>{t('userSettings.tabAccount') || 'Cuenta'}</TabsTrigger>
          <TabsTrigger value='security'>{t('userSettings.tabSecurity') || 'Seguridad'}</TabsTrigger>
          <TabsTrigger value='billing'>{t('userSettings.tabBilling') || 'Facturación'}</TabsTrigger>
          <TabsTrigger value='notifications'>{t('notifications.notifications') || 'Notificaciones'}</TabsTrigger>
          <TabsTrigger value='connections'>{t('userSettings.tabConnections') || 'Conexiones'}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value='account'>
        <AccountTab user={user} />
      </TabsContent>
      <TabsContent value='security'>
        <SecurityTab user={user} />
      </TabsContent>
      <TabsContent value='billing'>
        <BillingTab user={user} />
      </TabsContent>
      <TabsContent value='notifications'>
        <NotificationsTab user={user} />
      </TabsContent>
      <TabsContent value='connections'>
        <ConnectionsTab user={user} />
      </TabsContent>
    </Tabs>
  )
}
