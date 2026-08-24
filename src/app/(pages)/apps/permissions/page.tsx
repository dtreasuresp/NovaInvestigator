import { notFound, redirect } from 'next/navigation'

import { getCurrentPrincipal } from '@/features/access/access-service'
import { UsersError } from '@/features/users/errors'
import { listUnifiedPermissionMatrixForAdmin } from '@/features/users/service'
import PermissionsView from '@/views/apps/access/permissions'

const loadPermissionMatrix = async () => {
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

const PermissionsPage = async () => {
  const principal = await getCurrentPrincipal()

  if (!principal || principal.isAnonymous) {
    redirect('/pages/auth/login?next=%2Fapps%2Fpermissions')
  }

  const matrix = await loadPermissionMatrix()

  return <PermissionsView initialMatrix={matrix} />
}

export default PermissionsPage
