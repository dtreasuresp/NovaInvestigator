'use client'

import { useEffect } from 'react'
import { parseAsString, useQueryState } from 'nuqs'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConnectionsCard from '@/views/pages/user-profile/connections'
import Profile from '@/views/pages/user-profile/profile'
import TeamsTab from '@/views/pages/user-profile/teams'
import ProjectsTab from '@/views/pages/user-profile/projects'
import { useI18n } from '@/hooks/use-i18n'

const UserProfileTabs = () => {
  const { t } = useI18n()
  const [activeView, setActiveView] = useQueryState(
    'view',
    parseAsString.withDefault('profile').withOptions({
      history: 'push',
      shallow: true,
      clearOnDefault: false
    })
  )

  useEffect(() => {
    setActiveView(activeView)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabs = [
    {
      name: t('userProfile.tabProfile'),
      value: 'profile',
      content: <Profile />
    },
    {
      name: t('userProfile.tabTeams'),
      value: 'teams',
      content: <TeamsTab />
    },
    {
      name: t('userProfile.tabProjects'),
      value: 'projects',
      content: <ProjectsTab />
    },
    {
      name: t('userProfile.tabConnections'),
      value: 'connections',
      content: <ConnectionsCard />
    }
  ]

  return (
    <div className='w-full'>
      <Tabs
        className='gap-4'
        value={activeView}
        onValueChange={value => {
          setActiveView(value)
        }}
      >
        <TabsList className='max-sm:w-full'>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className='mt-6'>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default UserProfileTabs
