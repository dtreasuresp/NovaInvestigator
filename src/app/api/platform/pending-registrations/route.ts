import { NextResponse } from 'next/server'
import * as z from 'zod'

import {
  cleanupPendingRegistrations,
  getPendingRegistrationCleanupStatus,
  updatePendingRegistrationRetention
} from '@/features/platform/registration-cleanup'
import { toErrorResponse, readJsonBody } from '@/features/platform/http'

const retentionSchema = z.object({
  retentionDays: z.number().int().min(1).max(3650)
})

const noStore = { headers: { 'Cache-Control': 'private, no-store' } }

export async function GET() {
  try {
    const status = await getPendingRegistrationCleanupStatus()

    return NextResponse.json({ status }, noStore)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJsonBody(request, retentionSchema)
    const status = await updatePendingRegistrationRetention(body.retentionDays)

    return NextResponse.json({ status }, noStore)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST() {
  try {
    const { result, status } = await cleanupPendingRegistrations()

    return NextResponse.json({ result, status }, noStore)
  } catch (error) {
    return toErrorResponse(error)
  }
}
