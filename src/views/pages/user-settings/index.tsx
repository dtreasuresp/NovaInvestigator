'use client'

import { Suspense } from 'react'

import UserSettingsTabs from '@/views/pages/user-settings/user-settings-tabs'
import { useI18n } from '@/hooks/use-i18n'

const UserSettings = () => {
  const { t } = useI18n()

  return (
    <div>
      <div className='mb-4 md:mb-6 lg:mb-10'>
        <h1 className='text-xl font-bold'>{t('userSettings.accountManagementTitle')}</h1>
        <p className='text-muted-foreground'>{t('userSettings.accountManagementDesc')}</p>
      </div>
      <Suspense>
        <UserSettingsTabs />
      </Suspense>
    </div>
  )
}

export default UserSettings
