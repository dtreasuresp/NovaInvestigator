// GET / PATCH /api/user/profile
//
// Manages the authenticated user's profile details.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { requireAuthenticatedUser } from '@/features/access'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '@/app/api/auth/_lib/http'

const updateProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  mobile: z.string().trim().max(50).optional(),
  country: z.string().trim().max(100).optional(),
  line1: z.string().trim().max(200).optional(),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(50).optional(),
  gender: z.string().trim().max(50).optional(),
  role: z.string().trim().max(100).optional(),
  socialUrls: z.array(z.string().trim().max(500)).optional()
})

export async function GET() {
  try {
    const principal = await requireAuthenticatedUser()
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, locale, timezone, status')
      .eq('id', principal.userId)
      .maybeSingle()

    const displayName = profile?.display_name ?? ''
    const parts = displayName.split(' ')
    const firstName = parts[0] ?? ''
    const lastName = parts.slice(1).join(' ')

    const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>

    return NextResponse.json({
      ok: true,
      profile: {
        id: principal.userId,
        email: principal.email,
        displayName: displayName || principal.email?.split('@')[0] || 'User',
        firstName: (userMetadata.firstName as string) || firstName,
        lastName: (userMetadata.lastName as string) || lastName,
        avatarUrl: profile?.avatar_url ?? null,
        mobile: (userMetadata.mobile as string) || '',
        country: (userMetadata.country as string) || 'US',
        line1: (userMetadata.line1 as string) || '',
        line2: (userMetadata.line2 as string) || '',
        city: (userMetadata.city as string) || '',
        state: (userMetadata.state as string) || '',
        postalCode: (userMetadata.postalCode as string) || '',
        gender: (userMetadata.gender as string) || '',
        role: (userMetadata.role as string) || 'user',
        socialUrls: (userMetadata.socialUrls as string[]) || ['', '', '']
      }
    })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const principal = await requireAuthenticatedUser()
    const body = parseWithSchema(updateProfileSchema, await readJsonBody(request))
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const nextFirstName = body.firstName !== undefined ? body.firstName : (currentMetadata.firstName as string) || ''
    const nextLastName = body.lastName !== undefined ? body.lastName : (currentMetadata.lastName as string) || ''
    const nextDisplayName = `${nextFirstName} ${nextLastName}`.trim() || principal.email?.split('@')[0] || 'User'

    // 1. Update profiles table display_name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: nextDisplayName,
        updated_at: new Date().toISOString()
      })
      .eq('id', principal.userId)

    if (profileError) {
      logger.error('No se pudo actualizar el perfil de usuario', {
        action: 'api.user.profile.update',
        details: { errorType: profileError.name ?? 'supabase_error', message: profileError.message }
      })
    }

    // 2. Update Supabase Auth user metadata
    const updatedMetadata = {
      ...currentMetadata,
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
      ...(body.mobile !== undefined ? { mobile: body.mobile } : {}),
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.line1 !== undefined ? { line1: body.line1 } : {}),
      ...(body.line2 !== undefined ? { line2: body.line2 } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.state !== undefined ? { state: body.state } : {}),
      ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
      ...(body.gender !== undefined ? { gender: body.gender } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.socialUrls !== undefined ? { socialUrls: body.socialUrls } : {})
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: updatedMetadata
    })

    if (authError) {
      logger.error('No se pudo actualizar la metadata de autenticación', {
        action: 'api.user.profile.auth_update',
        details: { errorType: authError.name ?? 'supabase_error' }
      })
    }

    return NextResponse.json({ ok: true, displayName: nextDisplayName })
  } catch (error) {
    return handleRouteError(error)
  }
}
