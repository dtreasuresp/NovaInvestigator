'use client'

// React Imports
import Link from 'next/link'

// Component Imports
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'

// SVG Imports
import Icon500 from '@/assets/svg/500'

const ErrorPage = () => {
  const { t } = useI18n()

  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center gap-9 p-6'>
      <Icon500 className='h-auto w-full sm:h-120 sm:w-146' />
      <div className='flex flex-col items-center gap-4 text-center max-w-lg'>
        <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
          Error en el servidor o problemas de conexión
        </h2>
        <p className='text-muted-foreground text-xl sm:text-2xl'>
          {t('common.error') || 'No pudimos conectar con los servicios de la plataforma o se produjo un problema inesperado.'}
        </p>
        <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
          <Button
            className='rounded-full'
            onClick={() => {
              window.location.reload()
            }}
          >
            Reintentar
          </Button>
          <Button variant='outline' className='rounded-full' render={<Link href='/' />} nativeButton={false}>
            {t('common.back') || 'Volver al inicio'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
