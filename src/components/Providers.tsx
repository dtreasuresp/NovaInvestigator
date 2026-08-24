// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { ThemeProvider } from './ThemeProvider'
import { SidebarProvider } from './ui/sidebar'
import { TooltipProvider } from './ui/tooltip'

// Hook Imports
import { PermProvider } from '@/hooks/use-permissions'
import { CurrencyProvider } from '@/hooks/use-currency'
import { I18nProvider } from '@/hooks/use-i18n'

import { AppInitializerGate } from './layout/AppInitializerGate'

type Props = {
  children: ReactNode
  sidebarDefaultOpen?: boolean
}

const Providers = ({ children, sidebarDefaultOpen }: Props) => {
  return (
    <ThemeProvider attribute='class' defaultTheme='system' enableSystem={true}>
      <I18nProvider>
        <PermProvider>
          <AppInitializerGate>
            <CurrencyProvider>
              <TooltipProvider>
                <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
              </TooltipProvider>
            </CurrencyProvider>
          </AppInitializerGate>
        </PermProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default Providers
