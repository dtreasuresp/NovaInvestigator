import { redirect } from 'next/navigation'

import { getSupabaseIdentity } from '@/lib/auth/principal'

const HomePage = async () => {
  const identity = await getSupabaseIdentity()

  redirect(identity ? '/dashboard/investigations' : '/pages/auth/login')
}

export default HomePage
