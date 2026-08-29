// Adapter Kanban → NovAi (prepara prompt para futuras consultas sobre Proyectos/Kanban)
// Hoy reutiliza el sistema de Investigador como fallback; se expandirá cuando Kanban tenga métricas propias.

export interface KanbanContextPayload {
  boardId?: string
  boardName?: string
  columns?: Array<{ id: string; title: string; taskCount: number }>
  tasks?: Array<{ id: string; title: string; status: string; assignee?: string }>
  stats?: { totalTasks: number; doneTasks: number; pendingTasks: number }
}

export function buildKanbanSystemPrompt(payload: KanbanContextPayload | null, locale: string = 'es'): string {
  const langInstruction =
    locale === 'en'
      ? 'You MUST answer strictly in English.'
      : locale === 'de'
        ? 'Antworten Sie UNBEDINGT auf Deutsch.'
        : locale === 'ko'
          ? '반드시 한국어로만 답변하십시오.'
          : locale === 'pt'
            ? 'Responda OBRIGATORIAMENTE em Português.'
            : 'Responde OBLIGATORIAMENTE en Español.'

  if (!payload || (!payload.boardName && !payload.columns?.length && !payload.tasks?.length)) {
    return `Eres NovAi, asistente para gestión de proyectos Kanban integrado en NovaResearch.
${langInstruction}
Aún no hay contexto de tablero cargado. Ofrece ayuda general sobre metodologías ágiles, priorización, WIP limits y cómo estructurar columnas/tareas.`
  }

  const boardLine = payload.boardName ? `Tablero: ${payload.boardName} (${payload.boardId ?? 'sin id'})` : 'Tablero Kanban activo'

  const columnsLine =
    payload.columns?.map(c => `- ${c.title}: ${c.taskCount} tareas`).join('\n') || 'Sin columnas registradas.'

  const tasksLine =
    payload.tasks?.slice(0, 10).map(t => `- [${t.status}] ${t.title} ${t.assignee ? `(@${t.assignee})` : ''}`).join('\n') ||
    'Sin tareas registradas.'

  const statsLine = payload.stats
    ? `Total: ${payload.stats.totalTasks}, Completadas: ${payload.stats.doneTasks}, Pendientes: ${payload.stats.pendingTasks}`
    : ''

  return `Eres NovAi, asistente para gestión de proyectos Kanban integrado en NovaResearch.
${langInstruction}

Contexto activo:
${boardLine}
${statsLine}

Columnas:
${columnsLine}

Tareas (muestra):
${tasksLine}

Normas: Fundamenta respuestas en este contexto, sugiere priorización, cuellos de botella y WIP limits. Cita ids de tareas/columnas cuando aportes recomendaciones.`
}
