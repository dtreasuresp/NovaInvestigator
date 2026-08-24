'use client'

import type { ReactElement } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/hooks/use-i18n'

type Props = {
  trigger: ReactElement
  defaultOpen?: boolean
  align?: 'start' | 'center' | 'end'
}

const LanguageDropdown = ({ defaultOpen, align, trigger }: Props) => {
  const { locale, setLocale, languages } = useI18n()

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent className='w-52' align={align || 'end'}>
        <DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
          {languages.map(lang => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code} className='cursor-pointer flex items-center justify-between gap-2 py-2'>
              <div className='flex items-center gap-2.5'>
                <span className='text-base leading-none'>{lang.flag}</span>
                <span className='font-medium text-sm'>{lang.nativeName}</span>
              </div>
              <span className='text-muted-foreground text-xs font-mono uppercase tracking-wider'>{lang.code}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageDropdown
