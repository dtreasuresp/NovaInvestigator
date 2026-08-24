import { NextResponse } from 'next/server'
import * as z from 'zod'

import { getCurrentPrincipal } from '@/features/access/access-service'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { handleRouteError, parseWithSchema, readJsonBody, AuthError } from '../../_lib/http'
import { hashInvitationToken } from '../../_lib/invitation'

const acceptInvitationSchema = z.union([
  z.object({
    token: z.string().trim().min(1).max(256)
  }),
  z.object({
    invitationId: z.string().uuid()
  })
])

export async function POST(request: Request) {
  try {
    const body = parseWithSchema(acceptInvitationSchema, await readJsonBody(request))
    const principal = await getCurrentPrincipal()

    if (!principal || principal.isAnonymous) {
      throw AuthError.authRequired()
    }

    if (principal.profileStatus === 'suspended' || principal.profileStatus === 'deleted') {
      throw AuthError.accountSuspended()
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } =
      'token' in body
        ? await supabase.rpc('accept_invitation', {
            p_token_hash: hashInvitationToken(body.token)
          })
        : await supabase.rpc('accept_invitation_by_id', {
            p_invitation_id: body.invitationId
          })

    if (error || !data || data.length === 0) {
      throw AuthError.validation('La invitación no es válida, ha expirado o no corresponde a esta cuenta.')
    }

    const invitation = data[0]

    return NextResponse.json({
      ok: true,
      invitationId: invitation.invitation_id,
      tenantId: invitation.tenant_id,
      workspaceId: invitation.workspace_id
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
