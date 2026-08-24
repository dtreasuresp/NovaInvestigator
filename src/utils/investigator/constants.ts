// Type Imports
import type { FactorType, StageKey } from '@/types/apps/investigator-types'

export interface NavItem {
  id: string
  label: string
  detail: string
  href?: string
}

export interface RatingOption {
  value: number
  label: string
  description: string
}

export const INVESTIGATOR_BASE_PATH = '/apps/investigator'

export const NAV_ITEMS: NavItem[] = [
  { id: 'gestor', label: 'Gestor', detail: 'Investigaciones', href: `${INVESTIGATOR_BASE_PATH}/investigations` },
  { id: 'context', label: 'Contexto', detail: 'Expediente del análisis' },
  { id: 'summary', label: 'Resumen', detail: 'Lectura ejecutiva' },
  { id: 'efi', label: 'EFI', detail: 'Factores internos' },
  { id: 'efe', label: 'EFE', detail: 'Entorno estratégico' },
  { id: 'dafo', label: 'DAFO', detail: 'Cruces y relaciones' },
  { id: 'qspm', label: 'QSPM', detail: 'Selección estratégica' },
  { id: 'came', label: 'CAME', detail: 'Plan de acción' }
]

export const STAGE_ROUTES: Record<StageKey, string> = {
  context: `${INVESTIGATOR_BASE_PATH}/context`,
  summary: `${INVESTIGATOR_BASE_PATH}/summary`,
  efi: `${INVESTIGATOR_BASE_PATH}/efi`,
  efe: `${INVESTIGATOR_BASE_PATH}/efe`,
  dafo: `${INVESTIGATOR_BASE_PATH}/dafo`,
  qspm: `${INVESTIGATOR_BASE_PATH}/qspm`,
  came: `${INVESTIGATOR_BASE_PATH}/came`
}

export const TYPE_LABELS: Record<FactorType, string> = {
  F: 'Fortaleza',
  D: 'Debilidad',
  O: 'Oportunidad',
  A: 'Amenaza'
}

export const CAME_LABELS: Record<string, string> = {
  C: 'Corregir',
  A: 'Afrontar',
  M: 'Mantener',
  E: 'Explotar'
}

export const RATING_SCALE: Record<'internal' | 'external', RatingOption[]> = {
  internal: [
    { value: 1, label: '1 — Débil', description: 'Capacidad interna muy limitada o ausente' },
    { value: 2, label: '2 — Aceptable', description: 'Funciona pero con limitaciones claras' },
    { value: 3, label: '3 — Sólido', description: 'Buen nivel, cumple expectativas' },
    { value: 4, label: '4 — Excelente', description: 'Fortaleza diferenciadora y documentada' }
  ],
  external: [
    { value: 1, label: '1 — Muy pobre', description: 'La organización no responde ante este factor' },
    { value: 2, label: '2 — Moderada', description: 'Respuesta parcial, requiere mejora' },
    { value: 3, label: '3 — Buena', description: 'Respuesta efectiva y documentada' },
    { value: 4, label: '4 — Muy eficaz', description: 'Respuesta sobresaliente ante el entorno' }
  ]
}