'use client'

// React Imports
import { useEffect } from 'react'

// Third-party Imports
import { parseAsString, useQueryState } from 'nuqs'

// Component Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VidVerification from '@/views/pages/user-settings/vid'
import UserGeneral from '@/views/pages/user-settings/general'
import Workspace from '@/views/pages/user-settings/workspace'
import UserBillingSettings from '@/views/pages/user-settings/billing'
import WorkspaceMembersSettings from '@/views/pages/user-settings/members'
import UserSecurity from '@/views/pages/user-settings/security'
import { useI18n } from '@/hooks/use-i18n'

const UserSettingsTabs = () => {
  const { t } = useI18n()

  const tabs = [
    {
      name: t('userSettings.tabGeneral'),
      value: 'general',
      content: <UserGeneral />
    },
    {
      name: t('userSettings.tabWorkspace'),
      value: 'workspace',
      content: <Workspace />
    },
    {
      name: t('userSettings.tabMembers'),
      value: 'members',
      content: <WorkspaceMembersSettings />
    },
    {
      name: t('userSettings.tabSecurity'),
      value: 'security',
      content: <UserSecurity />
    },
    {
      name: t('userSettings.tabVid'),
      value: 'vid',
      content: <VidVerification />
    },
    {
      name: t('userSettings.tabBilling'),
      value: 'billing',
      content: <UserBillingSettings />
    }
  ]

  const [activeSetting, setActiveSetting] = useQueryState(
    'setting',
    parseAsString.withDefault('general').withOptions({
      history: 'push',
      shallow: true,
      clearOnDefault: false
    })
  )

  useEffect(() => {
    setActiveSetting(activeSetting)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='w-full'>
      <Tabs
        value={activeSetting}
        onValueChange={value => {
          setActiveSetting(value)
        }}
      >
        <div className='overflow-x-auto sm:overflow-visible'>
          <TabsList
            variant='line'
            className='h-fit! w-max min-w-full flex-nowrap justify-start gap-0 rounded-none border-b p-0 sm:w-full sm:flex-wrap'
          >
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className='not-data-active:hover:group-data-horizontal/tabs:after:bg-muted-foreground/30 shrink-0 border-0 group-data-horizontal/tabs:after:bottom-[-0.5px] not-data-active:hover:group-data-horizontal/tabs:after:opacity-100 sm:flex-0'
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default UserSettingsTabs
