'use client'

// React Imports
import Link from 'next/link'

// Component Imports
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'

const NotFound = () => {
  const { t } = useI18n()

  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center gap-9 p-6'>
      <h1 className='text-9xl font-bold'>404</h1>
      <div className='flex flex-col items-center gap-4 text-center'>
        <p className='text-muted-foreground text-xl sm:text-2xl'>{t('common.notFound') || 'No pudimos encontrar la página que buscas'}</p>
        <Button className='rounded-full' render={<Link href='/' />} nativeButton={false}>
          {t('common.back') || 'Volver al inicio'}
        </Button>
      </div>
    </div>
  )
}

export default NotFound
