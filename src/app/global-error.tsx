'use client'

// React Imports
import { useEffect } from 'react'

// Component Imports
import { Button } from '@/components/ui/button'

// SVG Imports
import Icon500 from '@/assets/svg/500'

// Style Imports
import './globals.css'

interface GlobalErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError Boundary Caught]:', error)
  }, [error])

  return (
    <html lang='es' className='flex min-h-full w-full antialiased'>
      <body className='flex min-h-full w-full flex-auto flex-col items-center justify-center p-6 bg-background text-foreground'>
        <div className='flex h-screen w-screen flex-col items-center justify-center gap-9 p-6'>
          <Icon500 className='h-auto w-full sm:h-120 sm:w-146' />
          <div className='flex flex-col items-center gap-4 text-center max-w-lg'>
            <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
              Error crítico en la plataforma
            </h2>
            <p className='text-muted-foreground text-xl sm:text-2xl'>
              Se produjo una interrupción inesperada en el inicio del sistema.
            </p>
            <div className='flex flex-wrap items-center justify-center gap-4 pt-2'>
              <Button className='rounded-full' onClick={() => reset()}>
                Reintentar
              </Button>
              <Button
                variant='outline'
                className='rounded-full'
                onClick={() => {
                  window.location.href = '/'
                }}
              >
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
      </body>
    </html>
  )
}
