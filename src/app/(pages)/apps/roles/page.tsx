import { notFound, redirect } from 'next/navigation'

import { getCurrentPrincipal } from '@/features/access/access-service'
import { UsersError } from '@/features/users/errors'
import { listUnifiedPermissionMatrixForAdmin } from '@/features/users/service'
import RolesView from '@/views/apps/access/roles'

const loadRoles = async () => {
  try {
    return await listUnifiedPermissionMatrixForAdmin()
  } catch (error) {
    if (UsersError.isUsersError(error) && error.code === 'COMMERCIAL_ACCESS_REQUIRED') {
      redirect('/pages/pricing')
    }

    if (UsersError.isUsersError(error)) {
      notFound()
    }

    throw error
  }
}

const RolesPage = async () => {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous) {
    redirect('/pages/auth/login?next=%2Fapps%2Froles')
  }

  const matrix = await loadRoles()

  return <RolesView initialMatrix={matrix} />
}

export default RolesPage
