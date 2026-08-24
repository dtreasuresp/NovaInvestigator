import { NextResponse } from 'next/server'

import { listUnifiedPermissionMatrixForAdmin } from '@/features/users/service'
import { toErrorResponse } from '@/features/users/http'

export async function GET() {
  try {
    const matrix = await listUnifiedPermissionMatrixForAdmin()

    return NextResponse.json(matrix)
  } catch (error) {
    return toErrorResponse(error)
  }
}
