// Next Imports
import Link from 'next/link'

const Footer = () => {
  return (
    <footer>
      <div className='text-muted-foreground mx-auto flex size-full max-w-360 items-center justify-between gap-3 px-4 py-3 max-sm:flex-col sm:gap-6 sm:px-6'>
        <p className='text-sm text-balance max-sm:text-center'>
          {`©${new Date().getFullYear()}`}{' '}
          <Link href='https://shadcnstudio.com' target='_blank' className='text-primary hover:underline'>
            DGTECNOVA SRL
          </Link>
          , Donde la innovación se convierte en acción
        </p>
        <div className='flex items-center gap-5 max-sm:hidden'>
          <Link
            href='https://www.dgtecnova.com'
            target='_blank'
            className='text-muted-foreground hover:text-foreground text-sm transition duration-300'
          >
            Web
          </Link>
          <Link
            href='https://www.dgtecnova.com/novastore/documents'
            target='_blank'
            className='text-muted-foreground hover:text-foreground text-sm transition duration-300'
          >
            Documentation
          </Link>
          <Link
            href='https://www.dgtecnova.com/support'
            target='_blank'
            className='text-muted-foreground hover:text-foreground text-sm transition duration-300'
          >
            Support
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
