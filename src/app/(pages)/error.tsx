'use client'

// React Imports
import { useEffect } from 'react'
import Link from 'next/link'

// Component Imports
import { Button } from '@/components/ui/button'

// SVG Imports
import Icon500 from '@/assets/svg/500'

interface PagesErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

export default function PagesError({ error, reset }: PagesErrorProps) {
  useEffect(() => {
    // Log error to console/diagnostics in dev
    console.error('[PagesError Boundary Caught]:', error)
  }, [error])

  return (
    <div className='flex min-h-[calc(100vh-12rem)] w-full flex-col items-center justify-center gap-9 p-6'>
      <Icon500 className='h-auto w-full max-w-sm sm:h-100 sm:w-120' />
      <div className='flex flex-col items-center gap-4 text-center max-w-lg'>
        <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
          Error en el servidor o problemas de conexión
        </h2>
        <p className='text-muted-foreground text-base sm:text-xl'>
          No pudimos conectar con los servicios de datos o se produjo un problema inesperado al cargar el recurso.
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
