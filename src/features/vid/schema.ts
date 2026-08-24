import * as z from 'zod'

export const submitVidRequestSchema = z
  .object({
    verificationMethod: z.enum(['manual', 'provider']).default('manual'),
    providerReference: z.string().trim().min(1).max(255).optional()
  })
  .superRefine((value, context) => {
    if (value.verificationMethod === 'provider' && !value.providerReference) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providerReference'],
        message: 'El proveedor debe aportar una referencia de verificación.'
      })
    }
  })

export const vidReviewRequestSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    action: z.enum(['start_review', 'approve', 'reject', 'request_resubmission', 'reopen']),
    reason: z.string().trim().min(1).max(1000).optional()
  })
  .superRefine((value, context) => {
    if ((value.action === 'reject' || value.action === 'request_resubmission') && !value.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Esta decisión requiere un motivo.'
      })
    }
  })

export const listVidQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'needs_resubmission']).optional()
})

export const vidRequestIdSchema = z.string().uuid()
