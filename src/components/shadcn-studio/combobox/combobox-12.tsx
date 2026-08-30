'use client'

import { useId, useRef, useState } from 'react'

import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/components/ui/combobox'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

const frameworks = ['Next.js', 'SvelteKit', 'Nuxt.js', 'Remix', 'Astro', 'React', 'Vue', 'Angular', 'SolidJS', 'Qwik']

const ComboboxMultipleCountBadgeDemo = () => {
  const id = useId()
  const anchor = useComboboxAnchor()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className='w-full max-w-xs space-y-2'>
      <Label htmlFor={id}>Multiple Count badge</Label>
      <Combobox
        multiple
        autoHighlight
        id={id}
        items={frameworks}
        defaultValue={[frameworks[0], frameworks[1], frameworks[2], frameworks[3], frameworks[4], frameworks[5]]}
        open={open}
        onOpenChange={setOpen}
      >
        <ComboboxChips
          ref={anchor}
          onClick={() => {
            setOpen(true)
            inputRef.current?.focus()
          }}
        >
          <ComboboxValue>
            {(values: string[]) =>
              values.length > 0 ? (
                <>
                  <Badge variant='secondary' className='rounded-md'>
                    {values.length}
                  </Badge>
                  <span className='text-sm'>frameworks selected</span>
                  <ComboboxChipsInput ref={inputRef} />
                </>
              ) : (
                <ComboboxChipsInput ref={inputRef} />
              )
            }
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {item => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

export default ComboboxMultipleCountBadgeDemo
