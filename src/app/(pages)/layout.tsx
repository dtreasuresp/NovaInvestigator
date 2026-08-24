'use client'

// React Imports
import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// Component Imports
import Footer from '@/components/layout/Footer'
import CommercialAccessGate from '@/components/layout/CommercialAccessGate'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import GlobalAiCopilot from '@/components/shared/GlobalAiCopilot'
import { SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

const PagesLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  const pathname = usePathname()
  const isFullBleedApp = pathname?.startsWith('/apps/novai')

  return (
    <div className='flex h-full w-full min-w-0'>
      <Suspense>
        <Sidebar />
      </Suspense>
      <SidebarInset className={`flex flex-1 flex-col ${isFullBleedApp ? 'h-screen max-h-screen overflow-hidden' : ''}`}>
        <Header />
        <Suspense fallback={null}>
          <CommercialAccessGate>
            <main className={isFullBleedApp ? 'flex-1 min-h-0 w-full overflow-hidden' : 'mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'}>
              {children}
            </main>
          </CommercialAccessGate>

        </Suspense>
        <Toaster />
        <GlobalAiCopilot />
        {!isFullBleedApp && <Footer />}
      </SidebarInset>
    </div>
  )
}

export default PagesLayout
