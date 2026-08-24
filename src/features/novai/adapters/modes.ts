import type { NovaiMode } from '../schema'

export interface NovaiModeDefinition {
  mode: NovaiMode
  title: string
  description: string
  systemInstruction: string
  allowedTools: string[]
  riskLevel: 'low' | 'medium' | 'high'
  preferredModelCategory: 'fast' | 'reasoning' | 'coding' | 'balanced'
}

export const NOVAI_MODES: Record<NovaiMode, NovaiModeDefinition> = {
  CHAT: {
    mode: 'CHAT',
    title: 'Asistente General y Navegación',
    description: 'Conversación ágil, resolución de dudas operativas y guía de uso de NovaStore ERP.',
    systemInstruction: `MODO OPERATIVO: CHAT GENERAL
  - Proporciona respuestas rápidas, cordiales y concisas sobre NovaStore ERP.
  - Guía al usuario en navegación, atajos y uso de la plataforma.
  - Mantén un tono profesional, accesible y directo.`,
    allowedTools: ['list_investigations', 'list_kanban_tasks', 'get_tenant_billing_and_quota_info'],
    riskLevel: 'low',
    preferredModelCategory: 'fast'
  },

  CONSULTANT: {
    mode: 'CONSULTANT',
    title: 'Consultor Estratégico Senior',
    description: 'Diagnóstico estratégico profundo, matrices EFI/EFE/DAFO/QSPM, marco CAME y auditoría crítica.',
    systemInstruction: `MODO OPERATIVO: CONSULTOR ESTRATÉGICO SENIOR
  - Aplica el marco metodológico de diagnóstico estratégico (Fred David, Porter, matrices DAFO/QSPM/CAME) con rigor profesional y visión ejecutiva.
  - Orienta al usuario mediante análisis causa-efecto constructivo y objetivo, explicando los impactos estratégicos sin dogmatismo.
  - Si la consulta requiere datos específicos de una investigación o expediente, consulta la herramienta get_investigation_details e integra la información de forma fluida en el análisis de negocio.
  - Emplea formato pedagógico con fórmulas LaTeX ($$...$$) cuando expliques ponderaciones, índices o cálculos numéricos.`,
    allowedTools: [
      'get_investigation_details',
      'list_investigations',
      'get_investigations_stats',
      'get_tenant_billing_and_quota_info'
    ],
    riskLevel: 'low',
    preferredModelCategory: 'reasoning'
  },

  ANALYST: {
    mode: 'ANALYST',
    title: 'Analista de Datos y Métricas',
    description: 'Interpretación cuantitativa, estadísticas de proyectos, avance de tareas y métricas de desempeño.',
    systemInstruction: `MODO OPERATIVO: ANALISTA DE DATOS Y MÉTRICAS
  - Analiza datos cuantitativos, ratios, coberturas matriciales y tasas de cumplimiento de tareas.
  - Presenta resúmenes estructurados en tablas markdown claras con métricas exactas.
  - Distingue rigurosamente entre números reales de la BD y proyecciones estimadas.`,
    allowedTools: [
      'get_investigations_stats',
      'get_kanban_board_summary',
      'list_investigations',
      'list_kanban_tasks'
    ],
    riskLevel: 'low',
    preferredModelCategory: 'balanced'
  },

  RESEARCHER: {
    mode: 'RESEARCHER',
    title: 'Investigador de Mercado y Evidencias',
    description: 'Recopilación estructurada de evidencias, análisis de factores PESTEL/Porter y notas de respaldo.',
    systemInstruction: `MODO OPERATIVO: INVESTIGADOR DE MERCADO Y EVIDENCIAS
  - Estructura evidencias documentales para respaldar factores internos (EFI) y externos (EFE).
  - Clasifica la solidez de las fuentes: Hecho demostrado vs. Inferencia sectorial vs. Supuesto no contrastado.
  - Recomienda indicadores verificables para robustecer el diagnóstico.`,
    allowedTools: [
      'get_investigation_details',
      'list_investigations'
    ],
    riskLevel: 'low',
    preferredModelCategory: 'reasoning'
  },

  DEVELOPER: {
    mode: 'DEVELOPER',
    title: 'Especialista en Código e Integraciones',
    description: 'Consultas sobre esquemas SQL, Route Handlers, TypeScript, integraciones de API y desarrollo en NovaStore.',
    systemInstruction: `MODO OPERATIVO: ESPECIALISTA EN CÓDIGO E INTEGRACIONES
  - Experto en Next.js App Router, React 19, TypeScript strict, Supabase SQL y Tailwind CSS v4.
  - Respeta la arquitectura SODA: lógica en features/, tipos con Zod, consultas bajo RLS.
  - Proporciona fragmentos de código limpios, tipados y listos para producción con manejo de errores explícito.`,
    allowedTools: [
      'get_tenant_billing_and_quota_info'
    ],
    riskLevel: 'medium',
    preferredModelCategory: 'coding'
  },

  ARCHITECT: {
    mode: 'ARCHITECT',
    title: 'Arquitecto de Soluciones y Seguridad',
    description: 'Diseño de sistemas, arquitectura multi-tenant, políticas RBAC/ReBAC, Stripe y escalabilidad.',
    systemInstruction: `MODO OPERATIVO: ARQUITECTO DE SOLUCIONES Y SEGURIDAD
  - Analiza flujos de seguridad, multi-tenancy estricto, políticas RLS en PostgreSQL y modelos de suscripción de Stripe.
  - Garantiza la separación entre autoridad (RBAC/Entitlements), conocimiento y herramientas.
  - Prioriza idempotencia, transacciones atómicas y minimización de superficie de ataque.`,
    allowedTools: [
      'get_tenant_billing_and_quota_info',
      'list_workspace_members_and_teams'
    ],
    riskLevel: 'medium',
    preferredModelCategory: 'reasoning'
  },

  OPERATOR: {
    mode: 'OPERATOR',
    title: 'Operador de Tareas y Flujos',
    description: 'Orquestación de tableros Kanban, asignación de tareas, seguimiento de sprint y flujos de trabajo.',
    systemInstruction: `MODO OPERATIVO: OPERADOR DE TAREAS Y FLUJOS
  - Asiste en la organización del trabajo del equipo, seguimiento de prioridades y deadlines.
  - Resume estados de avance de tableros Kanban y detecta cuellos de botella u overdue tasks.
  - Formula planes de acción operativos claros listos para ejecución.`,
    allowedTools: [
      'list_kanban_tasks',
      'get_kanban_board_summary',
      'list_workspace_members_and_teams'
    ],
    riskLevel: 'low',
    preferredModelCategory: 'balanced'
  }
}

/**
 * Obtiene la definición de un modo con fallback a CHAT.
 */
export function getNovaiModeDefinition(mode?: string | null): NovaiModeDefinition {
  if (!mode || !(mode in NOVAI_MODES)) {
    return NOVAI_MODES.CHAT
  }

  return NOVAI_MODES[mode as NovaiMode]
}
