// Investigation-scoped capability keys, re-exported with a narrower type
// from the canonical manifest at `src/features/access/capabilityManifest.ts`
// (the single source of truth per plan section 16: "No se crearán
// manifiestos de permisos paralelos."). The `satisfies` constraint below
// means this file cannot drift from the manifest without a compile error.
import type { CapabilityKey } from '@/features/access/capabilityManifest'

export const INVESTIGATIONS_CAPABILITIES = {
  read: 'investigations.read',
  create: 'investigations.create',
  update: 'investigations.update',
  archive: 'investigations.archive',
  restore: 'investigations.restore',
  close: 'investigations.close',
  export: 'investigations.export'
} satisfies Record<string, CapabilityKey>

export type InvestigationsCapability = (typeof INVESTIGATIONS_CAPABILITIES)[keyof typeof INVESTIGATIONS_CAPABILITIES]
