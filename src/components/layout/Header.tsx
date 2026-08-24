'use client'

// Next Imports
import { Fragment } from 'react'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

// Third-party Imports
import { LanguagesIcon } from 'lucide-react'

// Component Imports
import LanguageDropdown from '@/components/shared/LanguageDropdown'
import ModeToggle from '@/components/layout/ModeToggle'
import ProfileDropdown from '@/components/shared/ProfileDropdown'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useI18n } from '@/hooks/use-i18n'

const Header = () => {
  const pathname = usePathname()
  const { currentLanguage } = useI18n()

  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className='bg-card sticky top-0 z-50 border-b'>
      <div className='mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6'>
        <div className='flex items-center gap-4'>
          <SidebarTrigger className='[&_svg]:size-5!' />
          <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />
          <Breadcrumb className='hidden sm:block'>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1
                const href = `/${segments.slice(0, index + 1).join('/')}`

                return (
                  <Fragment key={segment}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className='capitalize'>{segment}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={href} className='capitalize'>
                          {segment}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-1.5'>
          <ModeToggle />
          <LanguageDropdown
            trigger={
              <Button variant='ghost' size='icon-lg' title={currentLanguage.nativeName} aria-label={currentLanguage.nativeName} className='gap-1 px-2'>
                <span className='text-sm leading-none'>{currentLanguage.flag}</span>
                <LanguagesIcon className='size-4 text-muted-foreground' />
              </Button>
            }
          />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
