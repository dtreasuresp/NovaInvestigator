'use client'

// Third-party Imports
import { useTheme } from 'next-themes'
import { MoonStarIcon, SunIcon } from 'lucide-react'

// Component Imports
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'

const ModeToggle = () => {
  const { t } = useI18n()
  const { setTheme, resolvedTheme } = useTheme()

  const handleModeChange = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button variant='ghost' size='icon' className='relative' onClick={handleModeChange}>
      <MoonStarIcon className='scale-100 dark:scale-0' />
      <SunIcon className='absolute scale-0 dark:scale-100' />
      <span className='sr-only'>{t('nav.themeToggle') || 'Cambiar tema'}</span>
    </Button>
  )
}

export default ModeToggle
