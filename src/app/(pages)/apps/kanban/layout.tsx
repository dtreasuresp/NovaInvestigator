import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { requireModuleAccess } from '@/features/access/access-service'
import { AccessError, AuthenticationRequiredError, ModuleAccessRequiredError } from '@/features/access/errors'

const KanbanLayout = async ({ children }: Readonly<{ children: ReactNode }>) => {
  try {
    await requireModuleAccess('kanban')
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect('/pages/auth/login')
    }

    if (error instanceof ModuleAccessRequiredError) {
      redirect('/pages/pricing')
    }

    if (error instanceof AccessError) {
      throw error
    }

    throw error
  }

  return <>{children}</>
}

export default KanbanLayout
