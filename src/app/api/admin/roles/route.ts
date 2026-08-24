import { NextResponse } from 'next/server'

import {
  createUnifiedAccessRole,
  listUnifiedPermissionMatrixForAdmin
} from '@/features/users/service'
import { createUnifiedRoleRequestSchema } from '@/features/users/schema'
import { readJsonBody, toErrorResponse } from '@/features/users/http'

export async function GET() {
  try {
    const matrix = await listUnifiedPermissionMatrixForAdmin()

    return NextResponse.json({ items: matrix.roles, ...matrix })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, createUnifiedRoleRequestSchema)
    const matrix = await createUnifiedAccessRole(body)

    return NextResponse.json(matrix, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
