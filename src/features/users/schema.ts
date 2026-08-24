// Zod schemas validating everything that crosses the
// src/app/api/admin/users/** boundary: list-query params, invitation
// requests, role/status transitions and capability overrides. Nothing
// reaches src/features/users/service.ts without passing through here first.
import * as z from 'zod'

export const MAX_REASON_LENGTH = 500

export const idParamSchema = z.string().uuid()

// ─── Listado ─────────────────────────────────────────────────────────────

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['pending', 'active', 'suspended', 'revoked']).optional(),
  role: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().max(200).optional()
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export const listInvitationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional()
})

export type ListInvitationsQuery = z.infer<typeof listInvitationsQuerySchema>

export const patchInvitationRequestSchema = z.object({
  updatedAt: z.string().min(1),
  email: z.string().trim().min(1).max(320).email('Introduce un correo válido.'),
  roleKey: z.string().trim().min(1).max(100),
  workspaceId: z.string().uuid()
})

export type PatchInvitationRequest = z.infer<typeof patchInvitationRequestSchema>

export const invitationMutationRequestSchema = z.object({
  updatedAt: z.string().min(1)
})

export type InvitationMutationRequest = z.infer<typeof invitationMutationRequestSchema>

// ─── Invitación (creación) ───────────────────────────────────────────────

export const inviteUserRequestSchema = z.object({
  email: z.string().trim().min(1).max(320).email('Introduce un correo válido.'),
  roleKey: z.string().trim().min(1).max(100),
  workspaceId: z.string().uuid()
})

export type InviteUserRequest = z.infer<typeof inviteUserRequestSchema>

// ─── Actualización de rol (PATCH) ────────────────────────────────────────

export const patchUserRequestSchema = z.object({
  // Optimistic-locking token: the `updatedAt` the client last read. The
  // memberships table has no dedicated `version` column, so `updated_at` is
  // used as the compare-and-swap token instead (see repository.ts).
  updatedAt: z.string().min(1),
  roleKey: z.string().trim().min(1).max(100)
})

export type PatchUserRequest = z.infer<typeof patchUserRequestSchema>

// ─── Disable / enable ────────────────────────────────────────────────────

export const disableEnableRequestSchema = z.object({
  updatedAt: z.string().min(1),
  reason: z.string().trim().max(MAX_REASON_LENGTH).optional()
})

export type DisableEnableRequest = z.infer<typeof disableEnableRequestSchema>

// ─── Capacidades ─────────────────────────────────────────────────────────

const capabilityOverrideInputSchema = z.object({
  capabilityKey: z.string().trim().min(1).max(150),

  // `null` clears any existing override for this capability, falling back to
  // the role's default grant.
  effect: z.enum(['allow', 'deny']).nullable(),
  reason: z.string().trim().max(MAX_REASON_LENGTH).optional()
})

export const patchCapabilitiesRequestSchema = z.object({
  overrides: z.array(capabilityOverrideInputSchema).min(1).max(100)
})

export type PatchCapabilitiesRequest = z.infer<typeof patchCapabilitiesRequestSchema>
export type CapabilityOverrideInput = z.infer<typeof capabilityOverrideInputSchema>

// ─── Tenant roles and role capabilities ────────────────────────────────────

const roleKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'La clave del rol solo puede contener minúsculas, números, guion y guion bajo.')

export const createRoleRequestSchema = z.object({
  key: roleKeySchema,
  name: z.string().trim().min(2).max(100)
})

export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>

export const patchRoleRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  updatedAt: z.string().min(1)
}).refine(input => input.name !== undefined || input.isActive !== undefined, {
  message: 'Debe indicar al menos un cambio para el rol.'
})

export type PatchRoleRequest = z.infer<typeof patchRoleRequestSchema>

export const replaceRolePermissionsRequestSchema = z.object({
  capabilityKeys: z.array(z.string().trim().min(1).max(150)).max(100),
  updatedAt: z.string().min(1)
})

export type ReplaceRolePermissionsRequest = z.infer<typeof replaceRolePermissionsRequestSchema>

// ─── Centro único de acceso ────────────────────────────────────────────────

export const accessRoleScopeSchema = z.enum(['platform', 'global_tenant', 'tenant'])

export const createUnifiedRoleRequestSchema = z
  .object({
    scope: accessRoleScopeSchema,
    tenantId: z.string().uuid().nullable().optional(),
    key: roleKeySchema,
    name: z.string().trim().min(2).max(100)
  })
  .superRefine((input, context) => {
    if (input.scope === 'tenant' && !input.tenantId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tenantId'],
        message: 'El tenant es obligatorio para un rol tenant.'
      })
    }

    if (input.scope !== 'tenant' && input.tenantId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tenantId'],
        message: 'Este ámbito no admite un tenant específico.'
      })
    }
  })

export type CreateUnifiedRoleRequest = z.infer<typeof createUnifiedRoleRequestSchema>

export const patchUnifiedRoleRequestSchema = z.object({
  scope: accessRoleScopeSchema,
  name: z.string().trim().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  updatedAt: z.string().min(1)
}).refine(input => input.name !== undefined || input.isActive !== undefined, {
  message: 'Debe indicar al menos un cambio para el rol.'
})

export type PatchUnifiedRoleRequest = z.infer<typeof patchUnifiedRoleRequestSchema>

export const replaceUnifiedRolePermissionsRequestSchema = z.object({
  scope: accessRoleScopeSchema,
  capabilityKeys: z.array(z.string().trim().min(1).max(150)).max(150),
  updatedAt: z.string().min(1)
})

export type ReplaceUnifiedRolePermissionsRequest = z.infer<typeof replaceUnifiedRolePermissionsRequestSchema>
