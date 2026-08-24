import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  alt?: string
}

const Logo = ({ className, alt = 'NovaStore', ...props }: LogoProps) => {
  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)} {...props}>
      {/* Light Mode: Colorful Logo */}
      <img
        src='/images/brands/novastore_icon_logo_color.png'
        alt={alt}
        className='block dark:hidden max-h-full max-w-full object-contain'
      />
      {/* Dark Mode: Monochromatic Gray Logo */}
      <img
        src='/images/brands/novastore_icon_logo_gray.png'
        alt={alt}
        className='hidden dark:block max-h-full max-w-full object-contain'
      />
    </div>
  )
}

export default Logo
