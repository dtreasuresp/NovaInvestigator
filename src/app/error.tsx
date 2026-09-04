'use client'

// React Imports
import { useEffect } from 'react'
import Link from 'next/link'

// Component Imports
import { Button } from '@/components/ui/button'

// SVG Imports
import Icon500 from '@/assets/svg/500'

interface AppErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error('[AppError Boundary Caught]:', error)
  }, [error])

  return (
    <div className='flex h-screen w-screen flex-col items-center justify-center gap-9 p-6'>
      <Icon500 className='h-auto w-full sm:h-120 sm:w-146' />
      <div className='flex flex-col items-center gap-4 text-center max-w-lg'>
        <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
          Error en el servidor o problemas de conexión
        </h2>
        <p className='text-muted-foreground text-xl sm:text-2xl'>
          No pudimos conectar con los servicios de la plataforma o se produjo un problema inesperado.
        </p>
        <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
          <Button className='rounded-full' onClick={() => reset()}>
            Reintentar
          </Button>
          <Button variant='outline' className='rounded-full' render={<Link href='/' />} nativeButton={false}>
            Volver al inicio
          </Button>
        </div>
        {error.digest && (
          <p className='text-xs text-muted-foreground/60 font-mono pt-4'>
            Código de referencia: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
