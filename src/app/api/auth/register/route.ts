// POST /api/auth/register
//
// Creates a brand-new registered account via Supabase Auth. Registration only
// stores the minimum pending setup; the profile and any personal tenant are
// finalized after email confirmation.
//
// This is a fresh sign-up. Existing sessions, including legacy anonymous
// sessions, must sign out before creating a registered account; there is no
// anonymous-to-registered conversion flow.
import { NextResponse } from 'next/server'
import * as z from 'zod'

import { getSupabaseIdentity } from '@/lib/auth/principal'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

import { AuthError, handleRouteError, parseWithSchema, readJsonBody } from '../_lib/http'
import { buildEmailConfirmationRedirect } from '../_lib/email-confirmation'
import { enforceAuthRateLimit } from '../_lib/rate-limit'
import { mapSupabaseAuthError } from '../_lib/supabase-auth-errors'
import { assertPendingInvitation } from '../_lib/invitation'
import { completePendingRegistration, queuePendingRegistration } from '../_lib/registration'

const registerRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    companyName: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().min(1).max(320).email(),
    password: z.string().min(8).max(200),
    invitationToken: z.string().trim().min(1).max(256).optional()
  })
  .superRefine((value, context) => {
    if (!value.invitationToken && !value.companyName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'El nombre de la empresa es obligatorio.'
      })
    }
  })

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(registerRequestSchema, await readJsonBody(request))

    await enforceAuthRateLimit(request, 'register', body.email.toLowerCase())

    const existingIdentity = await getSupabaseIdentity()

    if (existingIdentity) {
      throw AuthError.alreadyAuthenticated()
    }

    const admin = createSupabaseAdminClient()
    const { error: adminAccessError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })

    if (adminAccessError) {
      throw AuthError.internal('La configuración administrativa de Supabase no está disponible.')
    }

    if (body.invitationToken) {
      await assertPendingInvitation(admin, body.invitationToken, body.email)
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: { full_name: body.name },
        emailRedirectTo: buildEmailConfirmationRedirect(body.invitationToken)
      }
    })

    if (error || !data.user) {
      throw error ? mapSupabaseAuthError(error) : AuthError.internal('No se pudo crear la cuenta.')
    }

    const newUserId = data.user.id
    const emailConfirmationRequired = !data.user.email_confirmed_at

    try {
      await queuePendingRegistration(
        admin,
        newUserId,
        body.name,
        body.invitationToken ? null : (body.companyName ?? null)
      )

      if (emailConfirmationRequired && data.session) {
        const { error: signOutError } = await supabase.auth.signOut()

        if (signOutError) {
          throw mapSupabaseAuthError(signOutError)
        }
      } else if (!emailConfirmationRequired && data.session) {
        await completePendingRegistration(supabase, newUserId)
      }
    } catch (registrationSetupError) {
      // A pending setup without its Auth user cannot ever be completed.
      await admin.auth.admin.deleteUser(newUserId).catch(() => undefined)
      throw registrationSetupError
    }

    return NextResponse.json({
      ok: true,
      user: { id: newUserId, email: data.user.email ?? null },
      emailConfirmationRequired
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
