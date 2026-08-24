// Component Imports
import { Separator } from '@/components/ui/separator'

import EmailPass from '@/views/pages/user-settings/security/email-password'
import TwoFactor from '@/views/pages/user-settings/security/two-factor'

const UserSecurity = () => {
  return (
    <section className='py-3'>
      <EmailPass />
      <Separator className='my-10' />
      <TwoFactor />
    </section>
  )
}

export default UserSecurity
