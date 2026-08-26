<!-- Available h3 headings: Added, Fixed, Updated, Removed, Deprecated -->

# Changelog

All notable changes to this template will be documented in this file

## v0.0.60 (2026-08-26)

### Added & UI / AI Elements & Domain Cards (Fases 5, 6 y 11 PROMPT_NOVAI_PRO_V2)
- **Tarjetas Ricas de Dominio Especializadas (`src/views/apps/novai/components/`)**:
  - `NovaiEvidenceCard`: Fichas probatorias con tipo de factor (D/F/O/A), fragmento de evidencia, metadatos de documento y nivel de confianza.
  - `NovaiAuditCard`: Diagnósticos de auditoría con badges semánticos (`VALID`, `WARNING`, `INVALID`), severidad codificada (`INFO` a `CRITICAL`), alertas de ceros sospechosos y recomendaciones metodológicas.
  - `NovaiCalculationCard`: Renderizado determinista de matrices EFI/EFE/DAFO con fórmulas matemáticas, pesos, calificaciones y tabla interactiva de factores evaluados.
  - `NovaiSourceCard`: Visualización y distinción de fuentes internas de expedientes vs enlaces documentales externos utilizando `@ai-elements/sources`.
- **Visualizador de Agent Work Trace (`NovaiTraceViewer`)**:
  - Implementado el timeline de trazas de trabajo auditables (`✓ Identificó investigación`, `✓ Recuperó evidencia`, `⚠️ Relación débil`, `🧮 Validación DAFO`) utilizando `@ai-elements/task` sin exponer Chain of Thought privado.
- **Integración con Suite `@ai-elements` en `NovaiMessageItem`**:
  - Refactorizado `ToolCard` utilizando los componentes canónicos `<Tool>`, `<ToolHeader>`, `<ToolContent>`, `<ToolInput>` y `<ToolOutput>`.
  - Enriquecido el lector de eventos SSE en [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx) para capturar y enlazar eventos directos de evidencias, auditorías y cálculos.
- **Tests de Escenarios de Agente (Sección 48 PROMPT_NOVAI_PRO_V2)**:
  - Creada suite de pruebas en [`tests/novai/agent-scenarios.test.ts`](file:///d:/03.%20MATRIZ%20DAFO/tests/novai/agent-scenarios.test.ts) cubriendo los 7 escenarios canónicos (A: Listado, B: Activa, C: Evidencia D-03, D: Auditoría D-03 × A-02, E: Contradicciones, F: Comparación de Estrategias, G: Validación EFI) con 100% de éxito.

## v0.0.59 (2026-08-26)

### Added & Architecture / AI Agent Harness (Fases 8 a 13 PROMPT_NOVAI_PRO_V2)
- **Implementación de Tools de Metodología, Auditoría y Cálculo Determinista (Fase 8)**:
  - `audit_factor`: Auditoría de calibración de escalas (1-2 para debilidades, 3-4 para fortalezas), ponderaciones y calidad probatoria.
  - `audit_relationship`: Auditoría formal de cruces (FO, DO, FA, DA), detección de ceros sospechosos y verificación de vínculos causales (caso canónico `D-03 × A-02`).
  - `find_contradictions`: Detección determinista de inconsistencias matemáticas, calificaciones incompatibles y vacíos probatorios.
  - `validate_methodology`: Verificación de consistencia integral de matrices EFI, EFE, DAFO, CAME y QSPM según axiomas académicos.
  - `calculate_matrix`: Fachada determinista segura sobre `calculateAnalysis()` para recálculos matemáticos sin delegar aritmética al LLM.
- **Implementación de Tools de Estrategia, Linaje y Red-Team (Fases 9 y 10)**:
  - `trace_strategy`: Reconstrucción del grafo de linaje de una estrategia (Strategy → QSPM → CAME → Cruce DAFO → Factores → Evidencia → Fuente).
  - `compare_strategies`: Comparación multicriterio de estrategias alternativas según orientación, cobertura de factores y atractivo QSPM.
  - `challenge_analysis`: Auditoría crítica Red-Team para cuestionar sesgos de sobre-optimismo en FO, puntos únicos de fallo y amenazas no mitigadas en DA.
- **Catálogo Maestro de 21 Herramientas Modulares**:
  - Registradas las 21 tools en [`src/features/novai/tools/index.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/index.ts) con soporte para Vercel AI SDK Core (`ai`) y OpenAI declarations.
  - Actualizados los labels amigables en [`src/views/apps/novai/components/novai-message-item.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx).
- **Test Suites Unitarias Automatizadas (Fase 11)**:
  - Creado [`tests/novai/methodology-strategy-tools.test.ts`](file:///d:/03.%20MATRIZ%20DAFO/tests/novai/methodology-strategy-tools.test.ts) (58 suites / 183 tests pasando con 0 fallos).
- **Documentación Técnica & Propuesta de Extracción (Fases 12 y 13)**:
  - Creado [`doc/plans/NOVAI_ARCHITECTURE.md`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans/NOVAI_ARCHITECTURE.md).
  - Creado [`doc/plans/NOVAI_TOOLS.md`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans/NOVAI_TOOLS.md).
  - Creado [`doc/plans/HARNESS_EXTRACTION_PROPOSAL.md`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans/HARNESS_EXTRACTION_PROPOSAL.md).

## v0.0.58 (2026-08-26)

### Added & Architecture / AI Agent Harness & Domain Tools Taxonomy
- **Implementación de la Taxonomía de Tools de Evidencia e Investigación (Fase 7 PROMPT_NOVAI_PRO_V2)**:
  - `get_active_investigation`: Identificación y resolución determinista de la investigación activa del usuario en el tenant.
  - `get_investigation_documents`: Agrupación y consulta de fuentes documentales, expedientes y evidencias referenciadas.
  - `search_evidence`: Búsqueda de evidencias, descripciones y justificaciones indexadas por factores internos/externos, cruces y CAME.
  - `get_factor_evidence`: Trazabilidad completa para factores específicos (D-03, F-01, O-02, A-02), vinculando ponderación, calificación, evidencia textual, cruces DAFO y acciones CAME.
  - `verify_claim`: Auditoría epistémica de afirmaciones clasificándolas en `FACT`, `EVIDENCE`, `INFERENCE`, `HYPOTHESIS`, `ASSUMPTION` o `UNSUPPORTED` con puntaje de confianza.
- **Registro Maestro e Integración con Vercel AI SDK Core**:
  - Registradas las 5 nuevas tools en [`src/features/novai/tools/index.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/index.ts), alcanzando 13 herramientas modulares seguras bajo RLS y ReBAC.
  - Actualizados los labels amigables en [`src/views/apps/novai/components/novai-message-item.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx).
- **Test Suites Unitarias**:
  - Creado [`tests/novai/investigation-evidence-tools.test.ts`](file:///d:/03.%20MATRIZ%20DAFO/tests/novai/investigation-evidence-tools.test.ts) cubriendo los 5 nuevos módulos (174 tests totales pasando con éxito).

## v0.0.57 (2026-08-26)

### Added & Architecture / AI Modernization
- **Modularización de Tools de NovAi en Directorio Dedicado (`src/features/novai/tools/`)**:
  - Desacoplado el archivo monolítico `src/features/novai/tools.ts` en submódulos por dominio:
    - `investigations/`: `list-investigations.ts`, `get-investigation-details.ts`, `get-investigations-stats.ts`.
    - `kanban/`: `list-kanban-tasks.ts`, `get-kanban-board-summary.ts`.
    - `organization/`: `list-workspace-members.ts`.
    - `billing/`: `get-billing-quota.ts`.
    - `memory/`: `record-strategic-memory.ts`.
  - Cada herramienta expone validación estricta Zod, metadata de riesgo, ejecutor seguro bajo RLS/ReBAC y adaptador nativo para Vercel AI SDK Core (`ai`).
  - Creado catálogo maestro e índice unificado en [`src/features/novai/tools/index.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/index.ts).

- **Streaming Enriquecido con Vercel AI SDK Core (`streamText` y `fullStream`)**:
  - En [`src/features/novai/service.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts) y [`src/app/api/novai/chat/route.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/app/api/novai/chat/route.ts): Migrado el pipeline de streaming para consumir `result.fullStream`, emitiendo eventos SSE estructurados para `text-delta`, `reasoning`, `tool-call`, `tool-result` y `finish`.

- **Renderizado Visual de Tools y Reasoning en UI de NovAi**:
  - En [`src/views/apps/novai/components/novai-message-item.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx) y [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx): Renderizado en tiempo real de tarjetas colapsables de herramientas (`ToolCard`) y trazas de razonamiento (`<Reasoning>`) usando componentes de `@ai-elements`.
  
- **Sugerencias Flotantes y Sincronización en `AiCopilotSheet`**:
  - En [`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/ai-copilot-sheet.tsx): Eliminada la barra fija superior; las sugerencias rápidas ahora se muestran directamente dentro del chat (`ConversationContent`) como chips flotantes dinámicos que desaparecen al interactuar.
  - Sincronización bidireccional del hilo de conversación con la base de datos PostgreSQL a través de `/api/novai/conversations`.

## v0.0.56 (2026-08-25)

### Fixed & UI / Design Tokens
- **Corrección de Tokens de Diseño shadcn y Nombres Reales de Planes en `SidebarPlanWidget`**:
  - En [`src/components/layout/Sidebar.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/layout/Sidebar.tsx): Sustituidos los gradientes ad-hoc y estilos no estándar por tokens canónicos de shadcn/ui (`border-sidebar-border`, `bg-sidebar-accent/40`, `text-sidebar-foreground`, `Badge variant='secondary' | 'outline'`).
  - Implementada la resolución de nombres reales de planes vía i18n (`planIndividualName` $\rightarrow$ **`Individual`**, en lugar del código interno `basic` / `BASIC`), con badges de estado adecuados (`Activo` / `Demo`) y soporte multilenguaje integrado.
  - En [`src/features/billing/translation.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/billing/translation.ts): Incorporadas las claves `basic`, `one_time_access` y `enterprise` en `STANDARD_PLAN_MAP` para garantizar que la traducción y catálogo siempre devuelvan "Individual" y los nombres públicos en todas las capas de la aplicación.

## v0.0.55 (2026-08-25)

### Added & Architecture / UX & Multi-Device Sync
- **Reubicación de Upgrade y Estado de Plan en `SidebarFooter`**:
  - En [`src/components/layout/Sidebar.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/layout/Sidebar.tsx): Creado e inyectado el widget `SidebarPlanWidget` de forma fija/sticky dentro de `<SidebarFooter>`, mostrando el plan del usuario (Free, Pro, Enterprise, etc.) y un botón directo a `/pages/billing/upgrade`.
  - Soporte completo para modo colapsado (icono interactivo con tooltip flotante `Zap`) y responsive móvil (cierre automático del drawer al navegar).
  - En [`src/components/layout/UpgradePro.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/layout/UpgradePro.tsx): Desactivado el botón flotante independiente para limpiar la interfaz.

- **Reubicación del Botón Flotante de NovAi Copilot**:
  - En [`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/ai-copilot-sheet.tsx): Eliminado el margen artificial `right-[235px]` y posicionado de forma canónica en la esquina inferior derecha `fixed right-4 bottom-4 sm:right-6 sm:bottom-6 md:right-8 md:bottom-8 z-50`, asegurando que no quede centrado ni obstaculice la navegación en móviles y tablets.

- **Persistencia Real y Sincronización Multi-Dispositivo de NovAi en PostgreSQL**:
  - En [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx): Conectada la aplicación de chat directamente con los endpoints `/api/novai/conversations` y `/api/novai/conversations/[id]` respaldados por `public.novai_conversations` y `public.novai_messages`.
  - La creación, selección, nombrado automático, renombrado y eliminación de hilos se sincronizan en Supabase PostgreSQL, manteniendo `localStorage` como fallback offline.
  - En [`src/features/novai/schema.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/schema.ts) y [`src/app/api/novai/chat/route.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/app/api/novai/chat/route.ts): Agregado `conversationId` al payload para persistir automáticamente tanto los mensajes del usuario como las respuestas del asistente en `novai_messages`.

- **Botón Único e Integrado de Auditoría de Confianza en `InvestigationConfidenceCard`**:
  - En [`src/components/ui/investigation-confidence-card.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/investigation-confidence-card.tsx): Unificadas las acciones de IA en un único botón insignia `[✨ Auditar Confianza y Estrategia con NovAi]`, conectándolo con el diálogo de informe integral en [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx).

## v0.0.54 (2026-08-25)

### Fixed & Methodology / UX Polish
- **Recalibración de Regla de Nivel de Confianza y Eliminación de Falsos Avisos DAFO**:
  - En [`src/utils/investigator/domain.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/utils/investigator/domain.ts): Se reclasificó la asignación de confianza para que las investigaciones con alta cobertura de cruces ($\ge 40\%$) pero con empate técnico o paridad de vectores (brecha $< 10\%$) reciban dictamen de **Confianza Media (Estrategia Mixta)** en color ámbar en lugar de penalizarse erróneamente como `'baja'` e inducir falsos avisos de "relaciones DAFO incompletas".
  - Distinción estricta de cruces con `strength: 0` (`status: 'sin relación'`) como calificaciones deliberadas 100% completadas, reservando el estado no completado exclusivamente para `status === 'pending'` o `strength === null`.

- **Rediseño con Radial Progress Ring SVG y Botones Interactivos NovAi**:
  - En [`src/components/ui/investigation-confidence-card.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/investigation-confidence-card.tsx): Implementado medidor radial SVG circular (`stroke-dashoffset`) con animación fluida y sincronización de colores semánticos (verde para Alta, ámbar para Media/Mixta, rojo para Baja).
  - Incorporada explicación formal del dictamen de Estrategia Mixta Recomendada ($DO \times DA$) y botones interactivos: `[✨ Auditar Cobertura CAME con NovAi]` y `[✨ Justificar Estrategia Mixta con NovAi]`.

- **Sincronización 1:1 de Skeletons de Carga en Pantalla de Resumen**:
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx): Reestructurado el layout del skeleton (`isLoading`) para que coincida exactamente con la jerarquía real (4 KPI cards superiores $\rightarrow$ Matriz izquierda `xl:col-span-6` + cuadrícula 2×2 de 4 cards simétricas `xl:col-span-6` $\rightarrow$ Tarjeta ancha de Confianza Metodológica $\rightarrow$ Sección de Informe Académico).
  - Enlazados los manejadores de NovAi en `InvestigationConfidenceCard` con el diálogo controlado `AiReportDialog`.

## v0.0.53 (2026-08-25)

### Added & Performance / Methodology Polish
- **Vercel Speed Insights (v2.0.0) a Nivel Raíz**:
  - Instalado el paquete oficial `@vercel/speed-insights` (v2.0.0) en [`package.json`](file:///d:/03.%20MATRIZ%20DAFO/package.json).
  - Integrado el componente `<SpeedInsights />` en [`src/app/layout.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/layout.tsx) junto a `<Analytics />` para la telemetría automática de Core Web Vitals en App Router.

- **Rediseño Dinámico y Pedagógico de Alerta de Brecha DAFO (< 10%)**:
  - En [`src/utils/investigator/domain.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/utils/investigator/domain.ts): Rediseñado el cálculo y redacción del aviso metodológico cuando la diferencia entre el primer y segundo cuadrante es inferior al 10%. Ahora informa los nombres exactos de los cuadrantes en disputa (ej. *DO Adaptativa vs DA Supervivencia*), el porcentaje cuantitativo real y la recomendación de formular una estrategia mixta.

- **Componente Global `InvestigationConfidenceCard` (Auditoría de Confianza)**:
  - Creado componente global [`src/components/ui/investigation-confidence-card.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/investigation-confidence-card.tsx) con score cuantitativo ($0-100\%$), badges de confianza (*Alta*, *Media*, *Baja*) y desglose transparente de 4 pilares: *Cobertura DAFO*, *Nitidez de Vector*, *Balance EFI/EFE* y *Mitigación CAME*.
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx): Integrado el panel de confianza metodológica inmediatamente después de la cuadrícula de diagnóstico 2×2.

- **Auditoría Cognitiva de Cobertura CAME en NovAi**:
  - En [`src/features/novai/evidence-engine.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/evidence-engine.ts): El motor de evidencia determinista ahora audita de forma proactiva que todas las Debilidades Críticas (calificación $\le 2$) y Amenazas Severas (calificación $\le 2$) cuenten con acciones correctivas o de afrontamiento en el Plan CAME.

## v0.0.52 (2026-08-25)

### Added & Mobile / UX Enhancements
- **Auto-cierre de Sidebar Móvil y Responsividad Global**:
  - En [`src/components/layout/Sidebar.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/layout/Sidebar.tsx): Inyectado hook `useSidebar()` para cerrar automáticamente el drawer móvil (`setOpenMobile(false)`) al pulsar sobre cualquier enlace de navegación o en el logotipo principal, eliminando la persistencia indebida del sidebar sobre la vista en smartphones y tablets.
  - En [`src/components/layout/UpgradePro.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/layout/UpgradePro.tsx): Desacoplado el botón flotante en pantallas móviles (`hidden md:inline-flex`) y en rutas full-bleed como `/apps/novai`, evitando colisiones visuales con el área de redacción inferior.
  - En [`src/views/apps/investigator/investigations/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/investigations/index.tsx): Adaptadas las cabeceras `StageHeader` y las tarjetas `ResearchCard` a un diseño flex responsivo (`flex-col sm:flex-row`, `flex-wrap`) para títulos, badges y acciones.

- **Tooltips Flotantes de Diagnóstico Metodológico en "Estado de Validación" & Cruces DAFO**:
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx): Integrados tooltips interactivos de shadcn/ui (`TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`) en la tarjeta *Estado de Validación*. Al pasar el ratón sobre cada etapa (*Contexto*, *Factores Internos (EFI)*, *Factores Externos (EFE)*, *Matriz DAFO*, *Matriz QSPM*, *Plan de Acción CAME*), se despliega un popover flotante con el desglose exacto de observaciones, advertencias o criterios validados.
  - En [`src/utils/investigator/domain.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/utils/investigator/domain.ts): Refinado el validador metodológico para advertir de forma explícita sobre relaciones DAFO pendientes o no calificadas.

- **NovAi Chat Layout Móvil Estilo ChatGPT & Control de Historial**:
  - En [`src/views/apps/novai/components/novai-sidebar.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-sidebar.tsx): El sub-sidebar de hilos ahora se oculta al 100% en pantallas móviles cuando está colapsado (`hidden md:flex`), cediendo todo el ancho de pantalla al chat. Al expandirse, se despliega como Drawer modal con backdrop oscuro translúcido interactivo (`fixed inset-0 z-40 bg-black/60`).
  - En [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx): Incorporada barra de cabecera superior específica para móviles con botón toggle de historial (`PanelLeft`), badge de modo activo y botón de nuevo chat (`Plus`), además de auto-cierre del panel al seleccionar o crear una conversación en dispositivos móviles.

## v0.0.51 (2026-08-25)

### Added & UI Polish
- **Componente Global `CameActionsIndices` con Tooltips Flotantes de shadcn/ui**:
  - Creado componente global [`src/components/ui/came-actions-indices.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/came-actions-indices.tsx) con la misma simetría y estructura que `DafoQuadrantIndices`.
  - Eliminados los chips fijos inferiores de prioridades para brindar una visualización 100% limpia y equilibrada en el panel 2×2.
  - Implementados tooltips flotantes oficiales de shadcn/ui (`@/components/ui/tooltip`) interactivos por tipo de medida CAME (*Corrección*, *Afrontamiento*, *Mantenimiento*, *Explotación*), detallando el desglose exacto de criticidad (Crítica, Alta, Media, Baja) al pasar el cursor.
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx):
    - Integrado el componente global `<CameActionsIndices />` en la tarjeta inferior derecha del dashboard.

## v0.0.50 (2026-08-25)

### Added & UI Polish
- **Componente Global `DafoQuadrantIndices` y Simetría 2×2 en Panel Central de Summary**:
  - Creado componente global [`src/components/ui/dafo-quadrant-indices.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/dafo-quadrant-indices.tsx) para renderizar los aportes relativos de los 4 cruces metodológicos DAFO (*Cruce Fortalezas × Oportunidades*, *Cruce Debilidades × Oportunidades*, *Cruce Fortalezas × Amenazas*, *Cruce Debilidades × Amenazas*) con barras de progreso estilizadas, valores numéricos exactos alineados y badge de vector dominante.
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx):
    - Reestructurado el panel derecho en una cuadrícula CSS 2×2 unificada (`grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch`) garantizando dimensiones, alturas y alineaciones simétricas exactas entre las 4 tarjetas (*Posición IE*, *Estado de Validación*, *Índices DAFO por Cuadrante* y *Plan de Acción CAME*).

## v0.0.49 (2026-08-25)

### Added & UI Polish
- **Componente Global `InvestigationSummarySheet` y Conexión Interactiva del Punto Matriz**:
  - Creado componente global [`src/components/ui/investigation-summary-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/investigation-summary-sheet.tsx) con dictamen académico integral, fundamentación matricial EFI/EFE, decisión estratégica QSPM y plan de intervención CAME detallado con navegación directa al expediente.
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx):
    - Conectado el handler `onSelectPoint` en la `StrategicPositionMatrix` para abrir el `InvestigationSummarySheet` al hacer clic en el punto flotante de la investigación.
    - Reorganizada la sección central en una cuadrícula equilibrada de 3 columnas (Matriz a la izquierda, Posición IE e Índices DAFO al centro, y Estado de Validación y Plan CAME a la derecha).
  - En [`src/views/dashboards/investigations/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/dashboards/investigations/index.tsx):
    - Unificada la vista del Dashboard de Investigaciones para reutilizar el componente global `StrategicPositionMatrix` y el `InvestigationSummarySheet`.

## v0.0.48 (2026-08-25)

### Added & UI Polish
- **Componente Global `StrategicPositionMatrix` e Integración en Dashboard Summary**:
  - Creado componente global [`src/components/ui/strategic-position-matrix.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/strategic-position-matrix.tsx) con renderizado vectorial SVG de los 4 cuadrantes metodológicos (FO, DO, FA, DA), ejes graduados EFI/EFE (1.00 a 4.00), umbral 2.50, puntos interactivos, halo dinámico y tooltips informativos respetando estrictamente los tokens tipográficos (`font-sans`, `font-mono`, `text-xs`).
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx):
    - Integrada la Matriz de Posicionamiento Estratégico en la sección central protagónica junto al panel de diagnóstico y prescripción metodológica.
    - Reorganizada la sección inferior con el estado de validación y el resumen de acciones CAME en un grid equilibrado.
  - Sincronizada la clave `titlemodule` en todos los catálogos i18n (`en.ts`, `de.ts`, `ko.ts`, `pt.ts`).

## v0.0.47 (2026-08-25)

### UI & Aesthetics Polish
- **Estandarización de Layouts Limpios y Transparentes en Toda la Suite de Investigación y Gestor**:
  - En [`src/views/apps/investigator/investigations/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/investigations/index.tsx):
    - Eliminado el contenedor `<Card>` general del listado para integrar la barra de conteos y ordenamiento directamente sobre el fondo con sus tarjetas individuales limpias.
  - En [`src/views/apps/investigator/shared/factor-editor.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/factor-editor.tsx) (EFI y EFE):
    - Eliminados los contenedores `<Card>` de `FactorEditor` y `RatingScale`, integrando las tablas de fortalezas/oportunidades y debilidades/amenazas de forma transparente y fluida.
  - En [`src/views/apps/investigator/dafo/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/dafo/index.tsx):
    - Eliminado el contenedor `<Card>` del panel principal de cruces y simplificado el esqueleto de carga.
  - En [`src/views/apps/investigator/qspm/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/qspm/index.tsx):
    - Eliminado el contenedor `<Card>` envolvente de la tabla matriz cuantitativa.
  - En [`src/views/apps/investigator/came/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/came/index.tsx):
    - Eliminados los contenedores `<Card>` de la configuración de ponderación de criterios y del panel de fichas de acciones CAME.
  - En [`src/views/apps/investigator/summary/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/index.tsx):
    - Eliminado el contenedor `<Card>` del reporte académico final.

## v0.0.46 (2026-08-25)

### UI & Aesthetics Polish

- **Limpieza y Transparencia del Formulario de Contexto de Investigación**:
  - En [`src/views/apps/investigator/context/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/context/index.tsx):
    - Eliminado el contenedor `<Card>` con fondo y bordes para renderizar el formulario sobre fondo transparente con espaciado natural.
    - Simplificada la cabecera de datos de expediente (`state.metadata.title`, ID y estado operativo).
    - Ajustado el estado de carga (`Skeleton`) para coincidir con la disposición limpia y transparente sin contenedor de tarjeta.

## v0.0.45 (2026-08-25)

### Added & Billing Experience

- **Pre-selección Automática de Plan, Deep-linking en URL y Bloqueo de Try Demo**:
  - En [`src/views/pages/pricing/billing/upgrade/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/pages/pricing/billing/upgrade/index.tsx):
    - Al cargar el asistente de upgrade, se auto-selecciona el plan actualmente activo en el espacio de trabajo (`payload.currentPlan.code`) y se sincroniza reactivamente la URL en el navegador (`/pages/billing/upgrade?plan=...`) sin recarga de página.
    - Al hacer clic en cualquier tarjeta de plan, se actualiza el estado y el parámetro `?plan=` en la URL en tiempo real para soportar deep-linking, marcadores y compartir enlaces.
    - Bloqueada la tarjeta `Try Demo` para espacios de trabajo con suscripciones o planes de pago activos (`opacity-40 pointer-events-none cursor-not-allowed` y badge `"Ya utilizado"`).
    - Eliminado el banner redundante de "Plan Activo" del Paso 3 de selección de planes.

## v0.0.44 (2026-08-25)

### Fixed & UI Design System

- **Estandarización 100% de Tokens Semánticos shadcn/ui en Asistente de Planes e Investigaciones**:
  - En [`src/views/pages/pricing/billing/upgrade/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/pages/pricing/billing/upgrade/index.tsx):
    - Reemplazados todos los colores fijos (`zinc-800`, `text-white`, `text-amber-200`) por tokens semánticos adaptativos (`bg-primary`, `text-primary-foreground`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`).
    - Corregido el contraste de alertas contextuales para modo claro y oscuro (`text-amber-950 dark:text-amber-200`, `text-sky-950 dark:text-sky-200`, `text-emerald-950 dark:text-emerald-200`).
    - Resueltas las claves i18n pendientes de traducción (`billing.viewPlans`, `pricing.subtitle`, `userSettings.activePlan`, `users.prev`, `users.next`).
    - Estandarizados los botones de navegación inferior con componentes nativos de shadcn/ui (`variant='outline'` y `variant='default'`).
  - En [`src/app/(pages)/apps/investigator/layout-client.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/apps/investigator/layout-client.tsx):
    - Alineado el botón **"Gestor"** en la esquina superior derecha (`items-start` con alineación limpia a la primera línea del título).

## v0.0.43 (2026-08-25)

### Added & UI Tokens

- **Calibración de Tipografía de Cabeceras y Sistema de Semáforo para Stepper**:
  - En [`src/app/(pages)/apps/investigator/layout-client.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/apps/investigator/layout-client.tsx), alineados los tokens de tipografía de cabecera con el estándar oficial de `StageHeader`:
    - Kicker: `text-muted-foreground mb-1 text-xs font-semibold tracking-widest uppercase`.
    - Título: `font-heading text-2xl font-semibold` idéntico a la pantalla del Gestor de Investigaciones.
    - Subtítulo: `text-muted-foreground mt-1 text-sm`.
    - Contenedor de cabecera: `flex flex-wrap items-end justify-between gap-4`.
  - Implementado el sistema de 3 colores para los indicadores del Stepper:
    1. **Verde (Todo OK)**: Borde e icono verde esmeralda (`border-emerald-500/60 text-emerald-400`) y punto esmeralda (`bg-emerald-500`) cuando `stageStatus === 'ready'`.
    2. **Naranja (Revisar / Pendiente)**: Borde e icono naranja ámbar (`border-amber-500/60 text-amber-400`) y punto ámbar (`bg-amber-500`) cuando la etapa tiene información pendiente o advertencias (`stageStatus !== 'ready'`).
    3. **Blanco (Activo / Pestaña abierta)**: Fondo blanco sólido con texto negro (`bg-white text-black ring-2 ring-white/20`) y título en negrita para la pestaña activa en primer plano.

## v0.0.42 (2026-08-25)

### Added & UI Architecture

- **Jerarquía Visual de Cabecera y Stepper en Investigaciones**:
  - En [`src/app/(pages)/apps/investigator/layout-client.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/apps/investigator/layout-client.tsx), reestructurada la disposición de elementos:
    - Cabecera superior con kicker temático (`01 · Contexto`, `02 · Diagnóstico interno`, etc.), título principal grande y subtítulo a la izquierda.
    - Botón **"Volver al gestor"** y modo solo lectura unificados en el extremo superior derecho.
    - Componente `<Stepper />` posicionado directamente debajo de la cabecera sobre fondo transparente.
    - Estados visuales de color: resalte de alto contraste (`bg-white text-black`) exclusivo para el paso activo (`isCurrent`), indicadores completados con acento verde/esmeralda sutil, y pasos inactivos en tono apagado.
  - Eliminados los encabezados `<StageHeader />` duplicados en las 7 vistas del módulo (`context`, `efi`, `efe`, `dafo`, `qspm`, `came`, `summary`).

## v0.0.41 (2026-08-25)

### Added & UI Polish

- **Alineación Visual del Stepper con el Patrón de "Mejorar Plan"**:
  - En [`src/app/(pages)/apps/investigator/layout-client.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/apps/investigator/layout-client.tsx), eliminado el contenedor tipo card para adoptar el diseño limpio, transparente y horizontal del wizard de "Mejorar Plan":
    - Contenedores circulares con iconos de dominio (`FileText`, `SlidersHorizontal`, `Globe`, `LayoutGrid`, `Calculator`, `ListTodo`, `Award`).
    - Título y subtítulo alineados horizontalmente al lado derecho de cada icono.
    - Separadores tipo chevron (`ChevronRight`) entre pasos.
    - Estados visuales activos, completados e inactivos de alto contraste y soporte responsive con desplazamiento horizontal suave.
  - Creado el componente [`src/components/shadcn-studio/stepper/stepper-05.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/shadcn-studio/stepper/stepper-05.tsx).

## v0.0.40 (2026-08-24)

### Added & UI Components

- **Integración del Componente Stepper Canónico basado en `@stepperize/react`**:
  - Instalado `@stepperize/react` e integrado en [`src/components/ui/stepper.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ui/stepper.tsx) con soporte reactivo completo para navegación, indicadores personalizables (`indicators.completed`), orientación responsive automática y accesibilidad WAI-ARIA para tabs.
  - Creado el componente variante [`src/components/shadcn-studio/stepper/stepper-07.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/shadcn-studio/stepper/stepper-07.tsx) con la estética Shadcn Studio.
  - Actualizado [`src/app/(pages)/apps/investigator/layout-client.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/apps/investigator/layout-client.tsx) para renderizar el nuevo Stepper en las 7 etapas canónicas del análisis estratégico.

### Fixed & Navigation

- **Navegación al Paso 1 al Abrir o Crear Investigaciones**:
  - En [`src/views/apps/investigator/investigations/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/investigations/index.tsx), corregido el botón "Abrir expediente", el botón "+ Nueva Investigación" y "Cargar demo" para ejecutar `router.push('/apps/investigator/context')` tras cargar el estado, redirigiendo de inmediato al usuario al primer paso del expediente.

### Refactored & API Architecture

- **Migración Integral de Rutas `/api/ai` a `/api/novai`**:
  - Migrados todos los Route Handlers de IA al prefijo canónico de dominio `/api/novai`:
    - `/api/novai/chat` (streaming de chat con contexto y roles)
    - `/api/novai/quota` (consulta de entitlements y cuotas)
    - `/api/novai/report` (generación de informes y dictámenes ejecutivos)
    - `/api/novai/investigator/propose-dafo` (propuesta de cruces DAFO)
    - `/api/novai/investigator/propose-qspm` (propuesta de ponderaciones QSPM)
  - Actualizados todos los puntos de consumo en el frontend ([`novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx), [`ai-copilot-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/ai-copilot-sheet.tsx), [`dafo-ai-modal.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/dafo/dafo-ai-modal.tsx), [`qspm-ai-modal.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/qspm/qspm-ai-modal.tsx)).
  - Eliminado el directorio legacy `src/app/api/ai`.

## v0.0.39 (2026-08-24)

### Added & UI/UX Architecture

- **Navegación por Stepper Responsive en el Módulo de Investigaciones**:
  - En [`src/app/(pages)/apps/investigator/layout-client.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/apps/investigator/layout-client.tsx), sustituidos los tabs superiores por un componente `<Stepper />` interactivo y adaptativo en 7 etapas canónicas:
    1. **Contexto de la investigación** (`/apps/investigator/context`)
    2. **Factores Internos (EFI)** (`/apps/investigator/efi`)
    3. **Factores Externos (EFE)** (`/apps/investigator/efe`)
    4. **Matriz DAFO** (`/apps/investigator/dafo`)
    5. **Matriz QSPM** (`/apps/investigator/qspm`)
    6. **Plan de acción (CAME)** (`/apps/investigator/came`)
    7. **Resumen y dictamen** (`/apps/investigator/summary`)
  - Integrado soporte responsive completo: vista expandida con títulos y descripciones en desktop, y scroll suave horizontal con chips compactos en móviles y tablets.
  - Ocultación automática del Stepper en la vista del Gestor de Investigaciones (`/apps/investigator/investigations`) para maximizar el área de trabajo.
- **Simplificación del Menú Lateral (Sidebar)**:
  - En [`src/configs/navConfig.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/configs/navConfig.tsx), simplificado el ítem de `investigator` para contener exclusivamente el enlace directo al **Gestor de Investigaciones** (`/apps/investigator/investigations`), limpiando el árbol de navegación.
- **Ampliación de Capacidad y Eliminación de Truncamiento en Informes NovAi**:
  - En [`src/features/novai/service.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts) y [`src/features/novai/token-budget.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/token-budget.ts), configurado `maxOutputTokens: 8192` y ampliado `reservedOutputTokens: 8192` para generación de reportes extensos.
  - En [`src/app/api/investigations/ai/report/route.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/app/api/investigations/ai/report/route.ts), [`src/app/api/ai/chat/route.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/app/api/ai/chat/route.ts) y [`src/app/api/investigations/ai/chat/route.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/app/api/investigations/ai/chat/route.ts), configurado `export const maxDuration = 60` y `export const dynamic = 'force-dynamic'` para evitar timeouts de serverless en Vercel.
  - Calibrado el prompt del dictamen metodológico estructurado en 5 secciones completas con fórmulas LaTeX ($$...$$), tablas ejecutivas y auditoría final sin truncamiento.

## v0.0.38 (2026-08-24)

### Fixed & Cloud Infrastructure

- **Corrección de Enlace 404 en Botón Flotante de Upgrade**:
  - En [`UpgradePro.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/components/layout/UpgradePro.tsx), corregida la ruta de navegación de `/pages/pricing/billing/upgrade/` a la ruta canónica de Next.js App Router [`/pages/billing/upgrade`](file:///d:/03.%20MATRIZ%20DAFO/src/app/(pages)/pages/billing/upgrade/page.tsx).
  - En [`next.config.ts`](file:///d:/03.%20MATRIZ%20DAFO/next.config.ts), agregado redireccionamiento permanente 308 desde `/pages/pricing/billing/upgrade` hacia `/pages/billing/upgrade` para capturar cualquier prefetch o enlace residual.
- **Sincronización Hermética de Variables de Entorno en Vercel**:
  - Sincronizadas las 18 variables de entorno de producción/preview en Vercel (Supabase, Stripe, Resend y LLM Providers) con sus valores reales cifrados.
  - Implementados fallbacks seguros de inicialización en [`src/lib/supabase/browser.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/lib/supabase/browser.ts) y [`src/lib/supabase/server.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/lib/supabase/server.ts) para compatibilidad con el worker de generación estática de Next.js.

## v0.0.37 (2026-08-24)

### Added & Production Infrastructure

- **Integración Oficial de `@vercel/analytics`**:
  - Instalado `@vercel/analytics` e integrado el componente `<Analytics />` en [`src/app/layout.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/app/layout.tsx) para captura de analíticas y Core Web Vitals en tiempo real en Vercel.
- **Pipeline de Despliegue en 2 Fases (Preview $\rightarrow$ Production)**:
  - Documentada la regla canónica de despliegue en [`AGENTS.md`](file:///d:/03.%20MATRIZ%20DAFO/AGENTS.md): push a rama `dev` $\rightarrow$ Preview (`preview.apps.dgtecnova.com`), y push/merge a `main` $\rightarrow$ Producción (`apps.dgtecnova.com`).
  - Configurado [`vercel.json`](file:///d:/03.%20MATRIZ%20DAFO/vercel.json) con `"framework": "nextjs"`.
- **Aumentación de Tipos Ambientales para Compatibilidad TypeScript**:
  - Creado [`src/types/ai-elements.d.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/types/ai-elements.d.ts) con module augmentations para `@base-ui/react` y `ai` (`LanguageModelUsage`, `PreviewCardRoot`, `MenuItem`, `Button`), permitiendo que `pnpm check-types` (`tsc --noEmit`) y `next build` compilen con 0 errores sin modificar los archivos oficiales de `@ai-elements` ni `shadcn`.
- **Validación Exitosa de Build de Producción**:
  - Compiladas con éxito 114 páginas y rutas estáticas/dinámicas bajo Next.js 16.2.11 Turbopack y los 168 tests unitarios e integración pasando al 100%.

## v0.0.36 (2026-08-24)

### Fixed & Cognitive AI Governance

- **Aislamiento Hermético de Organizaciones y Erradicación de Alucinaciones Cruzadas**:
  - En [`context-engine.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/context-engine.ts) y [`general.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/adapters/general.ts), eliminado el volcado masivo de títulos de investigaciones en el System Prompt general, delegando el acceso a expedientes en herramientas gobernadas (`list_investigations`, `get_investigation_details`).
  - Blindada la confidencialidad entre expedientes prohibiendo inferencias o vínculos operativos entre empresas distintas.
- **Erradicación de Meta-Lenguaje y Pautas Normativas en Prompts**:
  - En [`methodology-knowledge.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/methodology-knowledge.ts) y [`modes.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/adapters/modes.ts), reescritas las instrucciones del sistema bajo los principios de Vercel AI SDK Core / Anthropic Prompt Engineering: eliminados encabezados de "directivas canónicas", artículos numerados y reglas de anti-complacencia rígidas.
  - Establecido un tono consultivo senior constructivo, pedagógico y analítico (Fred David, Porter, matrices DAFO/QSPM/CAME).
- **Perfeccionamiento del Logger de Vercel AI SDK**:
  - En [`service.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts), corregido el desempaquetado de errores en el callback `onError` de `streamText` para registrar mensajes descriptivos en lugar de `"[object Object]"`.
- **Corrección de Nesting de Botones en Mensajes de NovAi**:
  - En [`novai-message-item.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx), implementado el prop `render={<Button ... />}` de `@base-ui/react` en `TooltipTrigger` para las acciones de copiar y regenerar, erradicando el error de anidamiento HTML `<button>` dentro de `<button>` e incompatibilidad de hidratación.
- **Flujo Atómico de Regeneración de Respuestas de IA**:
  - En [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx), reescrito `handleRegenerate` de forma atómica para reemplazar la respuesta anterior del asistente in-situ sin duplicar el mensaje del usuario ni desfasar el estado de los hilos de conversación.
- **Habilitación de Selección de Texto con el Cursor en NovAi Hub**:
  - En [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx), retirado `select-none` del contenedor raíz para alinear la experiencia de usuario 100% con la especificación de Vercel AI Elements y permitir seleccionar o copiar texto con el ratón.

## v0.0.35 (2026-08-24)

### Added & UI Modernization

- **Instalación Oficial y Completa de la Suite Vercel AI Elements (`@ai-elements/all`)**:
  - Instalados los 49 componentes oficiales intactos en [`src/components/ai-elements/`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ai-elements/) sin alteraciones directas a los archivos fuente del paquete oficial.
  - Conservado el ecosistema completo de librerías para uso futuro (`streamdown`, `@xyflow/react`, `tokenlens`, `shiki`, `media-chrome`, `embla-carousel-react`, etc.).
- **Perfeccionamiento de UI y Usabilidad en NovAi y Sheet del Investigador**:
  - **Erradicación del Doble Scroll**: En [`src/views/apps/novai/index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx), reestructurado el layout flexible para que `<Conversation>` sea el único contenedor de scroll con botón de desplazamiento flotante y compositor inferior anclado.
  - **Limpieza de Botones de Acción**: En [`novai-message-item.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx), eliminados textos estáticos de los botones de copiar y regenerar dentro de `<MessageActions>`, resolviendo la superposición visual mediante tooltips independientes.
  - **Modernización del Compositor NovAi**: En [`novai-composer.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-composer.tsx), eliminado el selector legacy `@General/@Investigador/@Kanban` a favor del selector de los 7 Modos Operacionales de NovAi v2 con badge de cuota mensual y diaria.
  - **Optimización del Copiloto Lateral del Investigador**: En [`ai-copilot-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/ai-copilot-sheet.tsx), reubicado el badge de cuota hacia el footer del compositor para evitar colisiones con el botón de cierre `(X)`, y convertido el panel de preguntas sugeridas en un carrusel fluido con scroll horizontal.
- **Documentación Maestra Actualizada**:
  - Incorporada la **Sección 21** en [`doc/plans/PLAN_MAESTRO_ARQUITECTURA_NOVAI_PRO`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans/PLAN_MAESTRO_ARQUITECTURA_NOVAI_PRO).

## v0.0.34 (2026-08-24)

### Added & UI Modernization

- **Migración a la Suite Oficial Vercel `@ai-elements`**:
  - Extraídos e integrados los componentes oficiales de `@ai-elements` en [`src/components/ai-elements/`](file:///d:/03.%20MATRIZ%20DAFO/src/components/ai-elements/) (`Conversation`, `Message`, `PromptInput`, `Reasoning`, `Tool`, `Suggestions`, `Artifact`, `Shimmer`, `Attachments`, `Agent`).
  - Creada la skill canónica en [`.agents/skills/ai-elements/SKILL.md`](file:///d:/03.%20MATRIZ%20DAFO/.agents/skills/ai-elements/SKILL.md) y su espejo en [`.claude/skills/ai-elements/SKILL.md`](file:///d:/03.%20MATRIZ%20DAFO/.claude/skills/ai-elements/SKILL.md).
- **Refactorización Completa de la UI de NovAi y Copiloto del Investigador**:
  - Actualizado [`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/ai-copilot-sheet.tsx) con `<Conversation>`, `<Message>`, `<PromptInput>`, y `<Suggestions>` para el asistente lateral del expediente.
  - Actualizados los componentes del Hub NovAi en [`src/views/apps/novai/`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/):
    - [`novai-composer.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-composer.tsx): Integrado con `<PromptInput>`, `<PromptInputTextarea>`, `<PromptInputActions>` y `<PromptInputSubmit>`.
    - [`novai-message-item.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx): Integrado con `<Message>`, `<MessageContent>`, `<MessageResponse>`, `<MessageActions>`.
    - [`novai-empty-state.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-empty-state.tsx): Integrado con `<Suggestions>` y `<Suggestion>`.
    - [`index.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/index.tsx): Contenedor de streaming anclado con `<Conversation>` y `<ConversationScrollButton>`.

### Fixed

- **Corrección de Rebote Infinito en Gráfico de Posicionamiento Estratégico**:
  - En [`positioning-matrix.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/dashboards/investigations/components/positioning-matrix.tsx): aplicado `pointer-events-none select-none` y `wrapperStyle={{ pointerEvents: 'none' }}` en `<Tooltip />`, desactivada la animación de coordenadas (`isAnimationActive={false}`), retirado el `hover:scale-125` en SVG a favor de transición de opacidad y memoizado el cálculo de coordenadas de cuadrante con `useMemo`.

## v0.0.33 (2026-08-24)

### Added & Architecture Modernization

- **Adopción de Vercel AI SDK Core (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`)**:
  - Implementado `streamText` con Tool Calling Loop autónomo y gobernado (`stopWhen: isStepCount(5)`) en [`src/features/novai/service.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts).
  - Creado el adaptador de herramientas `getNovaiVercelTools` en [`src/features/novai/tools.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools.ts) tipado con Zod (`inputSchema`) para ejecución segura de queries ReBAC/RLS.
  - Estandarizado el soporte multi-proveedor (Groq, OpenRouter, OpenCode Zen, GitHub Models, Gemini) bajo el protocolo nativo de streaming de Next.js.
- **Aislamiento Estricto de Expedientes y Erradicación de Contaminación Cruzada**:
  - Eliminado el volcado de inventario de otros proyectos (`inventoryBlock`) del System Prompt de investigaciones activas en [`src/features/novai/context-builder.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/context-builder.ts).
  - Los expedientes y estadísticas globales del tenant se trasladaron exclusivamente a herramientas bajo demanda (`list_investigations`, `get_investigations_stats`), impidiendo que el LLM confunda entidades o justifique cruces DAFO con datos de otros proyectos.
- **Documentación Maestra Actualizada**:
  - Incorporada la **Sección 20** en [`doc/plans/PLAN_MAESTRO_ARQUITECTURA_NOVAI_PRO`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans/PLAN_MAESTRO_ARQUITECTURA_NOVAI_PRO) detallando la arquitectura Tool-First y el aislamiento de contexto.

## v0.0.32 (2026-08-24)

### Added

- **Presupuesto y Ventana Deslizante Inteligente de Tokens para NovAi (`src/features/novai/token-budget.ts`)**:
  - Implementada la clase `NovaiTokenBudget` con estimación heurística multilingüe y de código/JSON (`estimateTokens`, `estimateMessagesTokens`).
  - Algoritmo de recorte inteligente (`trimConversationHistory`): preserva el System Prompt intacto, ancla el primer mensaje del usuario (objetivo/tema original de la conversación) y mantiene una ventana deslizante de los mensajes más recientes respetando la integridad de pares `tool_calls` y resultados de `tool`.
  - Inserción automática de avisos de compresión sintéticos para que el modelo mantenga conciencia de contexto sin desbordar la ventana de tokens.
  - Integrado de forma transversal en [`src/features/novai/service.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts) en todos los proveedores LLM (Groq, OpenRouter, OpenCode Zen, GitHub Models, Gemini, Pollinations, Cerebras).
- **Blindaje de Tono Ejecutivo y Cero Fuga de Meta-Prompts (`src/features/novai/methodology-knowledge.ts`, `context-engine.ts`, `context-builder.ts`, `adapters/general.ts`)**:
  - Reemplazadas las directivas formuladas como "artículos legales/puntos de reglamento" por pautas conductuales de Consultoría Senior Ejecutiva, erradicando que el modelo cite textualmente "según la directiva punto 2 de anti-complacencia".
  - Erradicada la filtración de advertencias de seguridad internas como `"(sin citar UUIDs)"` y prefijos técnicos como `"Según get_investigation_details:"`.
  - Refinado el comportamiento social de NovAi: responde a reconocimientos y agradecimientos con calidez y cortesía orientada al negocio, eliminando discursos robóticos y pedantes sobre su condición de IA.
  - Aislado el inventario del espacio de trabajo en segundo plano para evitar volcados espontáneos de títulos de proyectos no solicitados por el usuario.

## v0.0.31 (2026-08-23)

### Fixed & Improved

- **Auditoría de Calidad de Software y Tipado Estricto Cero `any`**:
  - **Erradicación de `z.any()`**: Reemplazados los tipos laxos en `dafoProposalRequestSchema` y `qspmProposalRequestSchema` por `z.custom<InvestigationState>()` en [`src/features/novai/schema.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/schema.ts).
  - **Tipado Estricto de Repositorios y Memoria**: Definidas interfaces `NovaiConversationRow`, `NovaiMessageRow` y `NovaiMemoryRow` en [`src/features/novai/conversations-repository.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/conversations-repository.ts) y [`src/features/novai/memory-engine.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/memory-engine.ts), erradicando el uso de `r: any`, `m: any` y `row: any`.
  - **Eliminación de Castings `as any`**: Reemplazados todos los castings de `principal.client as any` por `principal.client as unknown as SupabaseClient` en tool gateway y Route Handlers (`/api/novai/conversations/*`).
  - **Seguridad en Bloques Catch y Datatables**: Tipados los bloques `catch (err: unknown)` con extracción segura de mensajes en [`ai-copilot-sheet.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/shared/ai-copilot-sheet.tsx) y [`ai-report-dialog.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/investigator/summary/ai-report-dialog.tsx), y tipado `(t: (key: string) => string)` en datatables.
  - **Tipado Genérico de Base de Datos**: Interfaz `UncheckedTableQueryBuilder` tipada en [`src/features/billing/db-types.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/billing/db-types.ts) con soporte para todas las operaciones (`upsert`, `lte`, `gte`, `single`, `then`).
  - **Sincronización de Catálogos i18n**: Incorporada la clave `cameAnalysis` en los 5 idiomas (`es`, `en`, `de`, `ko`, `pt`).
  - Validación completa: `pnpm check-types` con 0 errores y `pnpm test` con 162/162 pruebas exitosas (100%).

## v0.0.30 (2026-08-23)

### Removed & Consolidated

- **Unificación Arquitectural Completa de IA en `src/features/novai/`**:
  - Eliminada totalmente la carpeta obsoleta y duplicada `src/features/ai/`.
  - Migrados todos los esquemas (`AiMessage`, `AiQuotaInfo`, `PREDEFINED_PROMPTS`, `aiChatRequestSchema`, `aiReportRequestSchema`) a [`src/features/novai/schema.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/schema.ts).
  - Migradas todas las funciones de servicio (`getAiQuotaInfo`, `consumeAiQueryQuota`, `assertAiAllowed`, `streamAiConsultation`, `streamAiReport`) a [`src/features/novai/service.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts).
  - Actualizados todos los imports en Route Handlers (`src/app/api/investigations/ai/*`, `src/app/api/ai/*`), vistas de UI (`src/views/apps/novai/*`, `ai-copilot-sheet.tsx`), hooks (`use-investigator-analysis.tsx`), clientes y suites de tests.
  - Validación completa: `pnpm check-types` con 0 errores y `pnpm test` con 162/162 pruebas exitosas (100%).

## v0.0.29 (2026-08-23)

### Fixed & Improved

- **Blindaje de System Prompt Anti-Prompt-Leaking y Cero Fuga de UUIDs (`src/features/novai/methodology-knowledge.ts`)**:
  - Eliminados ejemplos textuales literales del System Prompt para erradicar el *meta-prompt leaking* (cuando modelos como Nemotron citaban las directivas internas literalmente).
  - Incorporada directiva canónica de **Confidencialidad Técnica**: prohibición estricta de citar o exponer UUIDs o hashes de base de datos (`c9b5ad15`, `f3fcc658`, etc.), obligando al modelo a usar títulos de negocio y etiquetas legibles.
  - Prohibición estricta de inventar estudios externos con porcentajes ficticios (Gallup, LinkedIn, etc.).
- **Enrutamiento Inteligente con Ventana Deslizante (Sticky Mode) (`src/features/novai/adapters/model-router.ts`)**:
  - `classifyTaskIntent` ahora evalúa una ventana deslizante de los últimos 4 mensajes del usuario, evitando que preguntas breves de seguimiento en discusiones DAFO caigan erróneamente a `CHAT/fast` en vez de `CONSULTANT/reasoning`.
- **Eliminación de Límites Artificiales de Tokens (`src/features/novai/client/*`, `src/features/ai/service.ts`)**:
  - Removido el parámetro artificial `max_tokens: 2048` en todos los clientes de inferencia (`openrouter-client.ts`, `groq-client.ts`, `opencode-zen-client.ts`, `cerebras-client.ts`, `github-models-client.ts`, `pollinations-client.ts`).
- **Actualización y Depuración de Modelos OpenRouter (`src/features/novai/adapters/model-router.ts`, `src/features/novai/service.ts`, `src/features/ai/service.ts`)**:
  - Depurados los slugs obsoletos (`google/gemma-3-27b-it:free`, `qwen/qwen-3-coder:free`) por modelos activos y verificados (`nvidia/llama-3.1-nemotron-70b-instruct:free`, `meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen-2.5-coder-32b-instruct:free`, `mistralai/mistral-small-24b-instruct-2501:free`).
- **Migración de Base de Datos Aplicada en Supabase**:
  - Creadas en la base de datos viva las tablas `public.novai_conversations`, `public.novai_messages`, `public.novai_memories`, `public.novai_agent_runs`, `public.novai_audit_events` junto con sus políticas de RLS y triggers de actualización.

## v0.0.28 (2026-08-23)

### Added

- **Plataforma de Agentes NovAi Pro y 7 Modos Canónicos (`src/features/novai/modes.ts`, `src/features/novai/schema.ts`)**:
  - Definidos los 7 modos operativos especializados: `CHAT`, `CONSULTANT`, `ANALYST`, `RESEARCHER`, `DEVELOPER`, `ARCHITECT`, `OPERATOR`, cada uno con directivas de sistema especializadas, asignación de herramientas y perfiles de riesgo.
- **Model Router Inteligente por Tareas y Modelos (`src/features/novai/model-router.ts`, `src/features/novai/service.ts`)**:
  - Clasificador automático de intenciones que detecta la naturaleza de la consulta (código, razonamiento, análisis de datos, Kanban) y selecciona el tier y modelo de IA óptimo (Qwen Coder, Nemotron, Gemma, Llama 3.3).
- **Hidratación en Vivo de Memoria Estratégica y Workspace (`src/features/novai/service.ts`, `src/features/novai/context-engine.ts`)**:
  - Consulta en paralelo de memorias activas del tenant y usuario durante cada solicitud de streaming, inyectando antecedentes y decisiones previas sin latencia perceptible.
- **Persistencia en la Nube de Sesiones y Mensajes (`src/features/novai/conversations-repository.ts`, `src/app/api/novai/conversations/*`)**:
  - Implementados Route Handlers REST `/api/novai/conversations` y `/api/novai/conversations/[id]/messages` bajo RLS estricto para sincronización entre dispositivos.
- **Selector Visual de Modos en el Composer UI (`src/views/apps/novai/components/novai-composer.tsx`, `src/views/apps/novai/index.tsx`)**:
  - Dropdown interactivo en la barra de prompts con los 7 modos operativos, iconos temáticos, descripciones y propagación reactiva al backend en el payload de chat.
- **Tests Automatizados Integrales (`tests/novai/model-router.test.ts`, `tests/novai/tool-gateway-and-memory.test.ts`, `tests/novai/conversations-repository.test.ts`)**:
  - Cobertura completa de pruebas unitarias y de contrato (161 tests pasando con 0 fallos).

## v0.0.27 (2026-08-23)

### Added

- **Base de Conocimiento Maestra de Metodología y Diagnóstico Estratégico (`doc/plans/BASE_CONOCIMIENTO_METODOLOGIA_ESTRATEGICA_NOVAI.md`, `src/features/novai/methodology-knowledge.ts`)**:
  - Documento canónico maestro que formaliza el marco epistemológico y matemático para matrices EFI, EFE, DAFO de impacto cruzado ($FO, DO, FA, DA$), matrices cuantitativas QSPM y planes de acción CAME.
  - Compilación tipada en TypeScript (`methodology-knowledge.ts`) con axiomas matemáticos ($\sum w_i = 1.00$, escalas $0-3$ y $1-4$), directivas críticas de consultoría senior y reglas de discriminación causal.
- **Motor Central de Contexto y Gobernanza (*Context Engine*) (`src/features/novai/context-engine.ts`)**:
  - Centralizada la construcción del System Prompt combinando la identidad del Principal, el estado del expediente activo bajo RLS/ReBAC, el inventario del tenant y la inyección metodológica canónica.
- **Motor Determinista de Evidencias y Detección de Contradicciones (*Evidence Engine*) (`src/features/novai/evidence-engine.ts`)**:
  - Analizador determinista que audita la consistencia matemática de sumas de pesos ($\sum w_i = 1.00$), coherencia de calificaciones (debilidades $1-2$, fortalezas $3-4$) y detecta automáticamente ceros sospechosos en cruces críticos (ej. debilidad de desgaste de personal $D\text{-}03 \times$ amenaza de competencia laboral $A\text{-}02$).
  - Inyección de alertas de auditoría previas en el prompt para guiar al modelo a señalar inconsistencias antes de responder.
- **Directivas Canónicas Anti-Complacencia (*Anti-Sycophancy*) (`src/features/novai/service.ts`, `src/features/novai/methodology-knowledge.ts`)**:
  - Instrucciones explícitas que impiden a NovAi justificar premisas erróneas del usuario o del estado de la matriz, obligándolo a auditar la causalidad objetiva y recomendar calificaciones metodológicamente fundadas ($2$ o $3$).
  - Enriquecimiento de `get_investigation_details` en `src/features/novai/tools.ts` con IDs, evidencias documentadas y reporte de auditoría determinista.
- **Suite Automatizada de Evaluación de Razonamiento Estratégico (`tests/novai/reasoning-evaluation.test.ts`)**:
  - Pruebas automatizadas para validación de anti-sycophancy en cruces DAFO DA y FO, detección de contradicciones y ensamblado de contexto gobernado.

## v0.0.26 (2026-08-23)

### Fixed

- **Eliminación de Polling de 15s y Arquitectura Reactiva en Tiempo Real (`src/views/apps/novai/index.tsx`, `src/hooks/use-investigator-analysis.tsx`)**:
  - Eliminados los timers continuos de `setInterval(..., 15000)` que consultaban `/api/ai/quota` cada 15 segundos sin necesidad de tráfico.
  - Sincronización multi-pestaña 100% reactiva mediante `BroadcastChannel('novastore:ai-quota')` en 0ms y con cero peticiones de red al interactuar con la IA, complementado con re-sincronización pasiva en eventos de foco de ventana (`focus`) y cambio de visibilidad (`visibilitychange`).
- **Estabilidad de Mensajes y Streaming en el Sheet de IA (`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`)**:
  - Corregida la condición de carrera donde cambios en la referencia del contexto `investigatorCtx` disparaban la re-hidratación desde `localStorage` a mitad del diálogo, evitando que se sobreescriba o desaparezca el último mensaje enviado por el usuario.
  - Inmutabilidad estricta en la actualización de chunks durante el streaming SSE y en las acciones de error/aborto.
- **Scroll Inteligente y Anclaje en el Diálogo de IA (*Sticky Scroll / Scroll Anchoring*) (`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`)**:
  - Implementada detección de proximidad al fondo del scroll (`scrollHeight - scrollTop - clientHeight < 60px`): el auto-scroll hacia abajo solo se activa si el usuario ya se encuentra al final de la conversación.
  - Permite a los usuarios desplazarse hacia arriba para leer análisis o fórmulas previas sin que los nuevos tokens del stream los arrastren al fondo.
  - Añadido botón flotante discreto ($\downarrow$) para retornar al último mensaje cuando el usuario se desplaza hacia arriba.
- **Campo de Entrada de Chat No Bloqueante (`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`)**:
  - El `<Textarea>` y su botón de envío permanecen montados en el DOM en todo momento, eliminando los parpadeos, pérdidas de foco y carteles de carga invasivos al refrescar cuotas en segundo plano.
- **Resolución y Jerarquía Estricta de Cuota Diaria de IA (`supabase/migrations/2026-08-23T06-30-00_fix_ai_daily_unlimited_and_hierarchy.sql`)**:
  - Corregidas las funciones PostgreSQL `get_ai_daily_remaining` y `consume_ai_daily_quota` para distinguir de forma determinista entre *sin registro* (denegado/0 por defecto) e *ilimitado explícito* (`limit_value IS NULL`).
  - Eliminado el salto erróneo de fallback a `tenant_entitlements` cuando el plan activo define cuota ilimitada (`NULL`), respetando la jerarquía 3D: `tenant_plan_overrides` $\rightarrow$ `subscriptions/plans` $\rightarrow$ `tenant_entitlements`.
  - Sincronizada la proyección de `tenant_entitlements` con las cuotas del plan activo actual.

### Added

- **Rediseño Estructural de la UI de NovAi y Menú Lateral Sub-Sidebar (`src/views/apps/novai/index.tsx`, `src/views/apps/novai/components/novai-sidebar.tsx`, `src/views/apps/novai/components/novai-composer.tsx`)**:
  - Reubicado el sidebar de chats de NovAi como un sub-sidebar adosado a la izquierda del área de trabajo, maximizando el espacio central disponible para las respuestas de la IA.
  - Diseñado el composer de redacción con comportamiento `sticky bottom-0 z-20` respaldado por un acabado traslúcido glassmorphic (`bg-background/80 backdrop-blur-xl`), manteniendo el campo de texto inmóvil en el borde inferior mientras el historial de chats se desplaza suavemente en el área central.
  - Trasladado el indicador interactivo de cuotas mensuales y diarias (Badge con icono `Zap`) desde el pie del sidebar a la barra de controles inferior de `NovaiComposer`, posicionándolo de forma visible al lado del selector de contexto y los botones de envío.
- **Generación Inteligente de Cruces DAFO con NovAi (`src/features/novai/service.ts`, `src/app/api/ai/investigator/propose-dafo/route.ts`, `src/views/apps/investigator/dafo/dafo-ai-modal.tsx`)**:
  - Nuevo botón `Proponer cruces con NovAi` en la cabecera de la matriz DAFO que invoca a NovAi para analizar la relación estratégica causa-efecto entre factores internos (EFI) y externos (EFE).
  - Algoritmo de deduplicación determinista de evidencias documentales que consolida las fuentes de ambos factores sin redundancias.
  - Generación de fuerzas cualitativas discriminadas ($0$ a $3$) con justificaciones técnicas y asignación automática del evaluador desde los metadatos del expediente.
  - Componente accesible `DafoAiModal` con vista previa agrupada por cuadrantes ($FO$, $DO$, $FA$, $DA$), filtros por pestaña y selección de aplicación: *"Completar cruces pendientes"* o *"Sobrescribir todos"*.
- **Generación Inteligente de Calificaciones Cuantitativas QSPM con NovAi (`src/features/novai/service.ts`, `src/app/api/ai/investigator/propose-qspm/route.ts`, `src/views/apps/investigator/qspm/qspm-ai-modal.tsx`)**:
  - Nuevo botón `Proponer AS con NovAi` en la tabla cuantitativa QSPM que evalúa el atractivo de las alternativas estratégicas frente a cada factor ponderado según la metodología de Fred David ($AS$ 1 a 4 o null).
  - Capacidad de formular automáticamente alternativas estratégicas sugeridas orientadas al cuadrante dominante si el expediente no tiene estrategias previas.
  - Componente modal `QspmAiModal` con resumen de puntuaciones por alternativa, fundamentación metodológica y aplicación en 1 clic que ilumina las estrellas interactivas y actualiza el ranking TAS al instante.
- **Gobernanza y Cuotas por Usuario Autenticado (`src/features/ai/service.ts`, `src/features/novai/service.ts`)**:
  - Trazabilidad y consumo de cuotas de consultas de IA gestionadas a nivel del usuario autenticado en sesión (`principal.userId`), garantizando que en suscripciones multi-usuario (Pro, Team, Enterprise) cada miembro gestione su propio límite individual sin agotar el cupo del equipo.
- **Sincronización Multi-idioma en 5 Locales (`src/locales/{es,en,de,ko,pt}.ts`)**:
  - Integración de 12 claves i18n (`proposeDafoAi`, `dafoAiModalTitle`, `dafoAiModalDesc`, `applyMissingOnly`, `applyOverwriteAll`, `proposeQspmAi`, `qspmAiModalTitle`, `qspmAiModalDesc`, `applyQspmScores`, `aiGenerating`, `dafoAiAppliedToast`, `qspmAiAppliedToast`) sincronizadas con tipado TypeScript en los 5 idiomas oficiales.
- **Tests Unitarios Automatizados (`tests/apps/investigator-ai-proposals.test.ts`)**:
  - Suite de validación de esquemas Zod para requests y responses de propuestas DAFO y QSPM.

## v0.0.25 (2026-08-22)

### Fixed

- **Optimización de Auto-Guardado y Estabilidad de Foco en la UI (`use-investigator-analysis.tsx`, `factor-editor.tsx`, `came/index.tsx`, `qspm/index.tsx`, `dafo/index.tsx`)**:
  - Calibrado el temporizador de auto-guardado a 3500ms (en lugar de 500ms), reduciendo drásticamente la proliferación de versiones innecesarias en base de datos durante la redacción continua.
  - Implementada actualización de estado no destructiva al completar el guardado remoto: preserva los inputs en caliente sin clobbering de arrays ni desmontaje de elementos activos en el DOM.
  - Asignado `getRowId: row => row.id` en todas las tablas de TanStack Table (`useReactTable`) y estabilizada la memoización de columnas, eliminando la pérdida de foco y parpadeo al escribir factores en EFI, EFE, CAME, QSPM y DAFO.
  - Filtrados los ecos de Supabase Realtime originados por la propia sesión local activa para evitar recargas dobles.
- **Generación Resiliente de Idempotency Key en el Cliente (`src/lib/investigations/client.ts`)**: Se implementó la función helper `generateClientUuid()` con fallback multinivel (`crypto.randomUUID()` -> `crypto.getRandomValues()` -> generador RFC4122 determinista) para la creación de investigaciones en el cliente. Esto elimina el error `crypto.randomUUID is not a function` que ocurría cuando usuarios o miembros del equipo accedían desde otras máquinas por red local / IP HTTP (contextos no seguros) o navegadores sin soporte directo de Web Crypto.

### Added

- **Diálogo Modal para CRUD de Alternativas Estratégicas (`src/views/apps/investigator/qspm/strategy-modal-dialog.tsx`)**: Nuevo componente accesible `StrategyModalDialog` que permite crear y editar alternativas estratégicas con selector de cuadrantes DAFO (`FO`, `DO`, `FA`, `DA`), orientación metodológica explicada, inputs de nombre y descripción validados, eliminando los inputs directos apretados del layout anterior.
- **Claves i18n para Modal y Métricas QSPM (`src/locales/{es,en,de,ko,pt}.ts`)**: Sincronizadas las 15 nuevas claves (`editAlternative`, `newAlternative`, `strategyModalTitle`, `strategyModalDesc`, `strategyCode`, `strategyName`, `strategyQuadrant`, `strategyDescription`, `selectAsWinner`, `selectedAsWinner`, `totalAlternatives`, `evaluationProgress`, `strategyWinnerBadge`, `qspmTas`) en los 5 idiomas con tipos verificados en TypeScript.
- **Renderizador Matemático Universal con KaTeX (`src/views/apps/novai/components/markdown-renderer.tsx` y `src/app/globals.css`)**: Integración completa del motor tipográfico KaTeX para renderizar fórmulas matemáticas elegantes tanto en bloque (`$$...$$`, `\[...\]`) como en línea (`$...$`, `\(...\)`), eliminando el texto crudo tipo código o regex.
- **Unificación Visual en el Sheet Lateral y Dictámenes de IA (`src/views/apps/investigator/shared/ai-copilot-sheet.tsx`, `ai-report-dialog.tsx`, `summary/index.tsx`)**: Se reemplazó el renderizado de texto plano (`whitespace-pre-wrap`) por `MarkdownRenderer`, logrando que las respuestas del asistente en el panel lateral, el diálogo de dictamen y el visor de resumen estratégico muestren fórmulas KaTeX, negritas, listas y tablas con la misma calidad visual que el módulo principal de NovAi.
- **Directiva Global de Formato Matemático Pedagógico (`src/features/ai/context-builder.ts` y `src/features/novai/adapters/general.ts`)**: Estandarización obligatoria para NovAi en cualquier cálculo o fórmula de la plataforma (EFI/EFE, DAFO, QSPM, CAME, métricas SaaS, financieras y consultas cuantitativas), estructurando las respuestas con: *1) Encabezado temático con emoji, 2) Fórmula matemática formal en LaTeX, 3) Sección "Donde:" con desglose de cada variable, y 4) Sustitución numérica paso a paso*.

### Updated

- **Rediseño Completo de UX/UI en la Matriz QSPM (`src/views/apps/investigator/qspm/index.tsx`)**:
  - **Visualización Continua Sin Pestañas (Full-Width Dashboard)**: La tabla matricial QSPM ocupa el 100% del ancho del viewport en la sección superior, permitiendo evaluar cómodamente todas las alternativas frente a los 20 factores sin forzar scrolls horizontales apretados.
  - **Separadores Visuales de Grupo con Subtotales Dinámicos**: Inserción de filas divisorias limpias para *Factores Internos (EFI)* y *Factores Externos (EFE)* con sus subtotales de pesos y puntuaciones de atractivo ponderado.
  - **Tarjetas de Alternativas Siempre Abiertas y Limpias**: En el panel inferior izquierdo, las alternativas se presentan en tarjetas de lectura estilizadas con badges de cuadrante, nombre destacado, descripción concisa, puntaje TAS acumulado y botón de selección como ganadora.
  - **Ranking de Atractivo con Barras Proporcionales**: El panel de ranking visualiza la jerarquía de alternativas (#1, #2, ...) con barras de progreso relativas al puntaje TAS líder.
  - **Barra de Métricas y KPIs de Cabecera**: 4 tarjetas de métricas en la cabecera (Total Alternativas, Alternativa Recomendada, Seleccionada y Progreso de Evaluación).
- **Calificación Interactiva con 4 Estrellas (`src/views/apps/investigator/qspm/index.tsx`)**: Se integró el componente oficial accesible `Rating` (`@/components/ui/rating`) con interacción de 1 solo clic, estrellas con código cromático semántico y toggle de deselección directa.
- **Reordenamiento de Columnas de Alternativas por Arrastre (Drag-and-Drop con `@dnd-kit`)**: Integración de `@dnd-kit/core`, `@dnd-kit/sortable` y TanStack Table para permitir arrastrar y reordenar horizontalmente las columnas de alternativas estratégicas para comparación directa lado a lado, manteniendo las columnas de *Factor Crítico* y *Peso* bloqueadas en su posición fija izquierda y sincronizando automáticamente el pie de tabla con los subtotales.
- **Ajuste de Columnas Compactas y Envoltura Multilínea**: Optimización de los anchos de columnas de estrategias para evitar scrollbars horizontales y corrección de la clase `TableHead` para permitir que títulos largos se muestren en múltiples líneas legibles.
- **Documentación Maestra Actualizada (`doc/plans/PLAN_MAESTRO_NOVASTORE_FULL_2026-08-07.md`)**: Registrada la Decisión de Arquitectura 42 que formaliza el rediseño continuo a ancho completo y el CRUD exclusivo en modal para QSPM.

### Added

- **Card Resumen del Plan de Acción CAME (`src/views/apps/investigator/summary/index.tsx`)**: Nueva tarjeta dedicada que reemplaza a la eliminada "Radiografía del expediente", con desglose visual de acciones CAME por tipo (Correctivas / Preventivas / De Mejora / Adaptativas) y por prioridad multicriterio (Crítica / Alta / Media / Baja) usando barras `Progress` y `Badge`, consistente con el lenguaje visual existente. Consume `analysis.came` ya calculado — sin fetch adicional.
- **Claves i18n CAME (`src/locales/{es,en,de,ko,pt}.ts`)**: 12 claves nuevas (`cameSummaryTitle`, `cameSummaryDesc`, `cameByType`, `cameByPriority`, `cameTypeC/A/M/E`, `camePriorityCritica/Alta/Media/Baja`) sincronizadas al 100% en los 5 idiomas, con tipos declarados en el catálogo canónico `es.ts`.

### Removed

- **Sección "Radiografía del expediente" (`summary/index.tsx`)**: Eliminada por duplicación visual con las cards superiores (Estado de Validación, Índices DAFO, IE Matrix). Sin impacto analítico: la IA consume las estadísticas server-side vía `buildQualityInsights()` en el prompt, no desde la UI.

### Updated

- **Tipografía shadcn y alturas uniformes en el Resumen (`src/views/apps/investigator/summary/index.tsx`)**: Eliminados los `font-mono` indebidos de la card CAME (descripción, contadores y franja de prioridades) para respetar la fuente sans del design system (§9.1). Card "Estado de Validación" rediseñada a layout compacto en 2 columnas internas (etapa + Badge + mini-barra) con pie destacado "N/M etapas listas", igualando la altura vertical de las 4 cards del grid (`items-stretch` + `h-full`).
- **Rediseño Card CAME y Skeleton del Resumen (`src/views/apps/investigator/summary/index.tsx`)**: La card "Plan de Acción CAME" se integra como 4ª columna del grid (`lg:grid-cols-4`), alineada en la misma fila que Validación, Índices DAFO e IE Matrix. Nuevo diseño compacto según mockup aprobado: lista vertical de tipos (Correctivas/Preventivas/Mejora/Adaptativas) con barra proporcional + contador, y franja inferior de prioridades como chips inline (Badge + cifra). El skeleton de carga ahora renderiza 4 cards en grid `lg:grid-cols-4`, reflejando el layout real. Clave i18n `cameSummaryDesc` simplificada a "acciones" en los 5 idiomas.
- **Migración `investigation_ai_reports` aplicada a Supabase vía MCP**: Tabla de persistencia del último dictamen IA aplicada y verificada en la base remota (RLS + 4 políticas, PK, índice tenant, 2 triggers). Security Advisor sin hallazgos nuevos.

## v0.0.23 (2026-08-22)

### Added

- **Enriquecimiento del Dictamen IA con Estadística Real y Auditoría de Calidad (`src/features/ai/context-builder.ts`, `src/features/ai/service.ts`)**:
  - Nueva función `buildQualityInsights()` que inyecta al System Prompt un bloque de métricas calculadas del expediente: DAFO evaluadas/pendientes/cobertura/dominante/confianza, QSPM ganadora + TAS + diff con 2ª, CAME por tipo y prioridad, pesos EFI/EFE ≠1.00 y factores sin evidencia por ID.
  - Capítulo 5 del reporte ("Auditoría de Calidad, Vacíos y Recomendaciones de Mejora") en los 5 idiomas: exige citar números exactos y proponer correcciones accionables por ID ante datos ambiguos o incompletos.
- **Persistencia del Dictamen IA en Base de Datos (última versión siempre)**:
  - Migración `supabase/migrations/2026-08-26T00-00-00_investigation_ai_reports.sql`: tabla tenant-scoped con PK `investigation_id` (upsert — N redacciones = 1 fila), RLS con capability `ai.report`, triggers `set_updated_at` y validación de coherencia tenant↔investigación.
  - Repositorio `src/lib/investigations/ai-reports.ts` (get/upsert), endpoints `POST /api/investigations/ai/report` (guarda en `onComplete`) y `GET /api/investigations/[id]/ai-report`.
  - Hidratación automática en `summary/index.tsx`: el dictamen se recupera desde BD al entrar a Resumen; ya no se pierde al cambiar a Estándar ni al recargar (bug reportado).
- **Sincronización de Créditos IA Multi-Pestaña en Tiempo Real**:
  - Canal `BroadcastChannel('novastore:ai-quota')` + polling cada 15s solo con pestaña visible + refresh on focus, implementado tanto en Investigador (`use-investigator-analysis.tsx`) como en NovAi (`novai/index.tsx`). Sin WebSocket propio ni dependencias nuevas.
- **Historia Compartida NovAi ↔ Sheet del Investigador (`shared/ai-copilot-sheet.tsx`)**:
  - El Sheet ahora comparte hilo con el módulo NovAi vía `novastore:novai_threads_v2`: hidrata al abrir, persiste con debounce 400ms y sincroniza cross-tab mediante eventos `storage`. Aparece como hilo "Sheet Investigador" en la sidebar de NovAi.
- **Cascada de Modelos Free de OpenRouter (`src/features/{ai,novai}/service.ts`, `.env.example`)**:
  - Tras el primario `openai/gpt-4o-mini`, se prueban automáticamente los fallbacks `:free` sin tarjeta: `llama-3.3-70b-instruct`, `qwen-3-coder`, `mistral-small-3.2-24b-instruct` y `gemma-3-27b-it` (configurable vía `OPENROUTER_FREE_MODELS`). Aplicado en chat, NovAi (con tool-calling) y generación de reportes.

### Fixed

- **Lint y tipos del slice AI/Investigator**: eliminados imports no usados (`removeFactor`, `AiQuotaInfo`, `PanelLeftClose`, `Sparkles`), corregida firma de `streamAiConsultation` para aceptar `inventory`, restaurada la cadena multi-proveedor de `service.ts` (OpenRouter → Zen → GitHub → Pollinations → Cerebras → Groq → Gemini) reemplazando `console.warn` por `logger` estructurado (§15).
- **Descuento de Cuota Mensual de IA (`consume_billing_entitlement_usage` & `get_billing_entitlement_usage`)**:
  - **Corrección de Capability en Postgres (`2026-08-25T00-00-00_fix_ai_capability_and_rpcs.sql`)**: Corregido el guard interno de la RPC `consume_billing_entitlement_usage` que validaba erróneamente la capability inexistente `investigations.ai_copilot` en lugar de la capability canónica `ai.chat` / `ai.free_chat`.
  - **Paridad Absoluta 1→2→3 en Entitlements**: Alineada la RPC `get_billing_entitlement_usage` con el Nivel 3 (proyección `tenant_entitlements`), garantizando paridad matemática exacta entre la lectura visual de cuotas y el consumo transaccional.
- **Acceso a Expedientes y Factores Reales en NovAi (Multi-provider Tool Calling Loop)**:
  - **Loop Server-side Multi-proveedor (`src/features/novai/service.ts`)**: Implementado el ciclo autónomo de ejecución de herramientas (`runWithToolCallingLoop`) para todos los proveedores OpenAI-compatibles (`OpenRouter`, `OpenCode Zen`, `GitHub Models`, `Groq`), permitiendo a NovAi solicitar `tool_calls` cuando el usuario requiere información profunda.
  - **Enriquecimiento del Detalle de Investigaciones (`src/features/novai/tools.ts`)**: `get_investigation_details` ahora expone desglose completo de factores internos (EFI con pesos y calificaciones), externos (EFE), autor/líder del expediente, matrices DAFO, estrategias QSPM y acciones CAME.
  - **Adaptadores de Clientes de IA (`openrouter-client.ts`, `opencode-zen-client.ts`, `github-models-client.ts`, `groq-client.ts`)**: Soporte completo para envío de `tools` y agregación delta de fragmentos `tool_calls` en el stream SSE, con timeout ampliado a 30s para análisis profundos.

## v0.0.22 (2026-08-22)

### Added

- **NovAi Tool Calling Engine con ReBAC y Consulta en Tiempo Real (Decisión 45 — `PLAN_MAESTRO_COPILOT_IA §8`)**:
  - **Catálogo de 7 Herramientas ReBAC (`src/features/novai/tools.ts`)**: Implementación server-side de `list_investigations`, `get_investigation_details`, `get_investigations_stats`, `list_kanban_tasks`, `get_kanban_board_summary`, `list_workspace_members_and_teams` y `get_tenant_billing_and_quota_info`.
  - **Triple Validación ReBAC y Aislamiento RLS**: Todas las consultas operan bajo el `tenant_id` y permisos de equipo/workspace del Principal autenticado. Recursos privados o de otros teams quedan estrictamente restringidos.
  - **Hidratación Automática del Resumen del Tenant (`fetchTenantLiveOverview`)**: Inyección instantánea en el System Prompt de investigaciones activas, tareas de Kanban y equipos, permitiendo a NovAi responder preguntas transversales sin latencia adicional y eliminando respuestas que alegaban falta de acceso en tiempo real.

### Fixed

- **Depuración de Módulo Legacy en Modal de Planes**: Eliminado el registro residual `ai_copilot` de `public.platform_modules` en Supabase, dejando activos exclusivamente los 3 módulos canónicos (`Investigator`, `Kanban`, `NovAi`).
- **Claridad Visual en Contador de Cuotas (`novai-sidebar.tsx`)**: Actualizada la UI para mostrar con total transparencia la cuota mensual (`X / Y mes`) y el tope diario (`Z de W disponibles`).

## v0.0.21 (2026-08-22)

### Fixed

- **Sincronización Completa de Migraciones Supabase PostgreSQL**:
  - Aplicadas las 20 migraciones pendientes del repositorio a la base de datos de producción/desarrollo (`NovaStore`), abarcando: configuración de duración de planes (`plan_duration_seconds`), tablas y RLS de proyectos (`kanban_foundation`), gestión de equipos y avatares (`workspace_teams_schema`, `teams_tags_column`, `reorganize_avatars_storage`), triggers y políticas de perfiles (`handle_new_user_trigger`, `profiles_update_policy`, `profiles_tenant_read_policy`), actualización de permisos de workspaces/tenants (`workspaces_tenants_update_policies`), RPCs de facturación y direcciones (`fix_purchase_delegation_rpc_ambiguity`, `billing_purchase_address`, `billing_purchase_personal_info`), unificación de trials (`trial_entitlements_unification`), transiciones de investigaciones (`fix_investigations_lock_transition_trigger`), y arquitectura RBAC/ReBAC + NovAi Copilot (`ai_copilot_entitlements_and_usage`, `register_ai_platform_module_and_capabilities`, `rbac_scope_and_rebac`, `ai_daily_policy_and_tenant_entitlements`, `fix_consume_monthly_tenant_entitlements`).
  - Verificación exitosa del 100% de la suite con `pnpm check-types` (0 errores) y `pnpm test` (136 tests pasados en 36 suites).

## v0.0.20 (2026-08-21)

### Updated

- **Instrucciones Canónicas para Asistentes de IA (`AGENTS.md`)**:
  - Actualización integral del documento rector de IA para alinearlo al 100% con la arquitectura real de NovaStore (Next.js 16.2.11 App Router, React 19.2.4, Supabase PostgreSQL con RLS nativo, Stripe Billing 22.4, Tailwind CSS v4, i18n en 5 idiomas y NovAi Copilot).
  - Eliminadas todas las referencias obsoletas a Prisma, Jest, NextAuth, Pino y rutas legacy (`docs/`, `src/styles/globals.css`).
  - Preservadas e integradas todas las reglas de dominio SaaS/ERP, arquitectura SODA modular por features (`src/features/*`), gobernanza de cuotas de IA, titularidad comercial del tenant, modelo de autorización híbrido (RBAC + ReBAC + Entitlements), metodología estratégica (EFI/EFE/DAFO/QSPM/CAME) y performance budgets bloqueantes (§14).

## v0.0.19 (2026-08-22)

### Fixed

- **Platform Billing — Modal entitlements no salta a página 1 al editar (TanStack autoResetPageIndex)** (`src/views/apps/platform/platform-billing/index.tsx:212-310`): causa verificada `autoResetPageIndex:true` por defecto → cada `setPlanForm` (Input `limitValue`/`Switch`/`Remove`) disparaba `onPaginationChange({pageIndex:0})`. Fix SODA `src/views`: `useMemo` para `columns`, `getRowId: row=>row.entitlementKey`, `autoResetPageIndex:false`/`autoResetExpanded:false`, reset explícito `{pageIndex:0}` solo al abrir modal y clamp `pageIndex` al eliminar fila; `§14.3` paginación cliente. (`doc/plans/PLAN_MAESTRO_COPILOT_IA §7.1`)
- **AI Quota mensual `limits.ai_queries_monthly` no descontaba — quedaba en `10` tras usos** (`src/features/ai/service.ts:23-216`, `supabase/migrations/2026-08-22T03-00-00_fix_consume_monthly_tenant_entitlements.sql`): causa verificada inconsistencia fuentes — `get_billing_entitlement_usage` (fix `2026-08-22:52-108`) resuelve 3 fuentes `override→subscription→tenant_entitlements`, pero `consume_billing_entitlement_usage` (`2026-08-19:80-113`) solo 2 (`override→subscription`) → límite hidratado vía `tenant_entitlements` (seed `2026-08-21`) nunca incrementaba `billing_entitlement_usage` (`usage_count` 0 → `remaining 10`). Migración alinea `consume` con 3er bloque `tenant_entitlements`, corrige matriz `missing→0 denied` vs `null→unlimited`, y `FOR UPDATE` transaccional. Service usa `logger` (`§15`) en lugar de `console.*`, log `warn` si `allowed===false` y fallback `getAiQuotaInfo` ya no enmascara error con `usage 0`. (`doc/plans/PLAN_MAESTRO_COPILOT_IA §7.2`)

## v0.0.18 (2026-08-23)

### Added

- **NovAi Workspace Conversacional Estilo Claude / ChatGPT y Botón Flotante Global (Decisión 44)**:
  - **Workspace Dedicado `/apps/novai`**: Rediseño integral de la UI en `src/views/apps/novai/` con sidebar de historial de conversaciones (`ChatThread`), agrupación por fecha (*Hoy*, *Ayer*, *Últimos 7 días*, *Anteriores*), búsqueda, renombrado y persistencia local (`novai_threads_v2`).
  - **Empty State Hero con Capability Cards**: Sugerencias de prompt interactivas clasificadas por módulo (EFI/EFE, DAFO/CAME, QSPM, Kanban).
  - **Renderizado Markdown Enriquecido (`MarkdownRenderer`)**: Soporte de tablas con formato shadcn, citas, listas y bloques de código con botón de copiado directo y feedback visual.
  - **Composer Flotante con Soporte de AbortController**: Input expandible con selector de contexto (`@General`, `@Investigador`, `@Kanban`) y botón de detención inmediata de streaming (`Square`).
  - **Botón Flotante de IA Universal (`GlobalAiCopilot`)**: Incorporado a nivel global en `src/app/(pages)/layout.tsx` para permitir acceso al asistente en cualquier pantalla de NovaStore, ocultándose automáticamente en `/apps/novai`.

### Fixed

- **Modelos Canónicos Gemini y Conmutación Resiliente**: Actualizado `DEFAULT_GEMINI_MODELS` en `src/features/ai/gemini-client.ts` a modelos activos (`gemini-2.5-flash`, `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`), resolviendo errores 404/503.
- **Prevención de Excepciones en WritableStream SSE**: Implementado helper `safeWrite` y `safeClose` en `/api/ai/chat`, `/api/investigations/ai/chat` y `/api/ai/report`, eliminando fallos `Invalid state: WritableStream is closed`.

## v0.0.17 (2026-08-23)

### Added

- **NovAi — Módulo IA Independiente con `ai.*` y Chat Página + Flotante Preservado (Decisión 43)**:
  - **Módulo Plataforma `novai`**: `platform_modules(module_key='novai', route_prefix='/apps/novai', display_order 12)` en `2026-08-23T03-37-55_ai_independent_novai.sql`. Capabilities nuevas `ai.chat / ai.free_chat / ai.report` (`resource='ai'`) otorgadas a `owner/admin/analyst` (alias `investigations.ai_*` se mantiene 1 versión para compat). SODA: `src/features/novai/` independiente (`schema.ts`, `service.ts`, `adapters/investigator|kanban|general`).
  - **API Genérica Compartida**: `src/app/api/ai/(quota|chat|report)/route.ts` con `NovaiContext` discriminado (`investigator|kanban|general`) + Zod, reutiliza quota tenant-global `limits.ai_queries_monthly/daily` (compartida). Alias `src/app/api/investigations/ai/*` preservado para compatibilidad Investigador.
  - **UI SODA**: `src/views/apps/novai/index.tsx` chat pantalla completa (historial, streaming SSE, selector contexto, badges `mes/día`, sin flotante) + `src/app/(pages)/apps/novai/(layout|page).tsx` con `requireModuleAccess('novai')`. `src/configs/navConfig.tsx:209` añade `NovAi` en sidebar `Apps` (`moduleKey='novai'`). `AiCopilotSheet` flotante se mantiene para Investigador/Kanban (no en NovAi).
  - **Vínculo Investigador**: `adapters/investigator.ts` delega a `buildInvestigationSystemPrompt` existente; Investigador sigue siendo un consumidor de NovAi, no su dueño. Kanban `kanbanAdapter` y `generalAdapter` listos para expansión.

### Fixed

- **Daniel (plan `basic`/Individual sin IA) ya no ve `∞`**: `service.ts` ahora exige `limits.ai_queries_monthly` (AND, no OR) y `2026-08-22T02-50-40` distingue falta (`0`) vs explícito ilimitado (`null` desde UI en blanco). Admin configura todo vía `platform-billing`.
- **Sincronización y consistencia de tipos i18n en todos los idiomas (`src/locales/`)**: Sincronizadas las claves faltantes en `es.ts` (`platform.aiDailyQueries10Preset`, `platform.entitlementsCount`) y en los diccionarios `en.ts`, `de.ts`, `pt.ts`, `ko.ts` (`common.of`, `common.page`, migración de `investigator.ai*` al namespace `novai.*`, namespaces `forms` y `userSettings`), garantizando 100% de cumplimiento estricto con `TranslationSchema` y resolviendo todos los errores de `tsc --noEmit`.

## v0.0.16 (2026-08-21)

### Added

- **Authorization Engine Híbrido RBAC + ReBAC + ABAC/Entitlements (Decisión 42 — PLAN_REFACTOR_RBAC)**:
  - **PDP central `src/features/access/authorization-engine.ts`**: implementa la fórmula `ACCESS = Tenant AND Role AND Relationship AND Entitlement AND Policy` (§11) con la regla de oro *Roles determine responsibility. Relationships determine reach. Entitlements determine availability. Policies determine conditions.* (§20). Expone `authorize({ subject, action, resource, context }) → { allowed, reason }` (§18) distinguendo `AUTHORIZATION_DENIED` (403) vs `ENTITLEMENT_REQUIRED` (402) vs `POLICY_DENIED` (429) (§13), evolutivo a OpenFGA/Cedar sin reescribir callers.
  - **Base de Datos — `role_scope` y ReBAC (§15-16, §5-6)**: migración `2026-08-21T01-26-50_rbac_scope_and_rebac.sql` añade `public.roles.scope` (`tenant|workspace|team|platform`), FK `team_members.role_id` hacia `roles(scope=team)` (roles `team_leader/analyst/viewer/member`), tabla `resource_relationships` (`member_of / belongs_to`) y proyección local `tenant_entitlements` (Stripe como source-of-truth, NovaStore proyección local §20). Respeta tenant como frontera sagrada (§2).
  - **Feature AI — capas SODA intactas**: `src/features/ai/entitlements.ts` (ABAC §10) y `src/features/ai/rate-limit.ts` (Policy §11) centralizan `checkAiEntitlements` y `getDailyQuota/consumeDailyQuota` vía RPCs `get_ai_daily_remaining` / `consume_ai_daily_quota` (24h `rate_limit_buckets`).
  - **Doble Cuota por Plan para AI Chat**: entitlements `limits.ai_queries_monthly` (billing) + `limits.ai_queries_daily` (policy 24h) con seeds `free:10/día, basic:20, team:100, enterprise:ilimitado` en `2026-08-21T01-26-52_ai_daily_policy_and_tenant_entitlements.sql` y UI de catálogo en `platform-billing/index.tsx:93`.
  - **Servicio AI con PDP + Gemini Tier 1**: `src/features/ai/service.ts` refactorizado para `getAiQuotaInfo` (mensual+diaria), `assertAiAllowed` (invoca `authorize` con `requireEntitlement: limits.ai_queries_monthly` + `requireDailyPolicy: limits.ai_queries_daily`) y `consumeAiQueryQuota` (consume ambas atomically). Streaming mantiene `Gemini → Groq → fallback determinista` (`gemini-client.ts:54`) y documenta que `GEMINI_API_KEY` con Billing pay-as-you-go Tier 1 evita entrenamiento con datos sensibles.
  - **UI SODA**: `AiCopilotSheet` muestra `mes: X/Y` + `Hoy: A/B` y bloquea envío si diario agotado; `use-investigator-analysis` expone quota extendida (`AiQuotaInfo` con `daily*` y `monthly/daily` anidados); `.env.example:46` documenta `GEMINI_API_KEY` + `GROQ_API_KEY` opcional.

### Updated

- **Arquitectura SODA verificada**: ningún cambio crea carpetas regadas; `src/app` solo rutas, `src/views` solo controllers, `src/features` contiene toda la lógica, `src/domain`/`src/infrastructure` intactos. MCP Supabase ya configurado en `.mcp.json:3` (`https://mcp.supabase.com/mcp`, `mcp-remote`); migraciones siguen patrón imperativo `supabase migration new` + `supabase db push` tras `supabase link` / dashboard.

## v0.0.15 (2026-08-20)

### Added

- **Registro de Módulo de Plataforma `ai_copilot` y Capacidades Granulares de IA (Decisión 41.3)**:
  - **Módulo de Plataforma en Base de Datos (`platform_modules`)**:
    - Registrado formalmente el módulo `ai_copilot` en `public.platform_modules` (`display_order: 15`, `route_prefix: '/apps/investigator'`) para permitir la validación comercial nativa de `modules.ai_copilot` en planes de suscripción.
  - **Capacidades Granulares en `CAPABILITY_MANIFEST` y Base de Datos**:
    - `investigations.ai_free_text`: Habilita el chat interactivo libre con el Copiloto IA (permitiendo restringir el textarea en planes básicos y reservarlo para planes superiores).
    - `investigations.ai_academic_report`: Habilita la redacción de dictamen metodológico enriquecido con IA.
    - Migración SQL `supabase/migrations/2026-08-20T02-00-00_register_ai_platform_module_and_capabilities.sql` ejecutada y sincronizada, vinculando las nuevas capacidades a los roles `owner`, `admin` y `analyst`.

### Fixed

- **Gobernanza Estricta de Entitlements de IA y Refactorización del Selector en Planes (Decisión 41.2)**:
  - **Gobernanza 100% Basada en Plataforma (Sin Fallbacks Hardcodeados)**:
    - Eliminadas todas las suposiciones y valores por defecto en código en `src/features/ai/service.ts` (`getAiQuotaInfo`).
    - Si un plan no tiene asignado `modules.ai_copilot`, `actions.investigations.ai_copilot` ni `limits.ai_queries_monthly` en la base de datos, el acceso es denegado estrictamente (`allowed: false`, `remaining: 0`, `limitValue: 0`).
  - **Alineación con Tokens y Componentes Canónicos de shadcn/ui**:
    - Refactorizado el selector de entitlements en `src/views/apps/platform/platform-billing/index.tsx` usando la composición oficial de shadcn: `<SelectGroup>`, `<SelectLabel>`, `<SelectItem>` y `<SelectSeparator />`.
    - Eliminados emojis e iconos ad-hoc en los encabezados y opciones del dropdown.
    - Aplicado `className="w-full"` al `SelectTrigger` para ocupar el 100% del ancho de su columna y eliminar el espacio vacío a su derecha.
    - Eliminada la opción `__custom__` y el campo de texto adicional para mantener una única fila horizontal limpia.

## v0.0.14 (2026-08-19)

### Added

- **Refinamiento de Copiloto IA: Carga Anticipada de Entitlements, Prevención de Flickering, Soporte Multilingüe Completo (5 Idiomas) y Botón Flotante (Decisión 41.1)**:
  - **Carga Anticipada de Políticas y Cuota en Proveedor Global (`useInvestigatorAnalysis`)**:
    - Centralización de `aiQuota`, `isLoadingAiQuota` y `refreshAiQuota` en el contexto `InvestigatorAnalysisProvider`, disparando la consulta de cuotas y entitlements al montar el workspace.
    - Eliminación definitiva del parpadeo de texto libre en usuarios con planes individuales/básicos: el input de texto libre no se renderiza temporalmente mientras se evalúan los entitlements del usuario.
  - **Internacionalización Completa (i18n) en `es`, `en`, `de`, `ko`, `pt`**:
    - Mensaje de bienvenida reactivo traducido según el idioma activo del usuario (`t('novai.aiWelcomeMessage')`).
    - Directiva estricta de idioma inyectada en el prompt de sistema del LLM (`buildInvestigationSystemPrompt`) y en las peticiones SSE de chat y reporte (`locale: 'es' | 'en' | 'de' | 'ko' | 'pt'`).
    - Generador de dictamen editorial algorítmico continuo (`buildLocalizedAcademicReport`) con redacción metodológica especializada para los 4 capítulos del reporte en español, inglés, alemán, coreano y portugués.
    - Respuestas deterministas de contingencia localizadas en los 5 idiomas para fallbacks sin conexión o sin API keys configuradas.
  - **Botón Flotante del Copiloto IA (`AiCopilotSheet`)**:
    - Ubicación flotante en la esquina inferior derecha (`fixed right-56 bottom-8 z-50`), posicionado inmediatamente a la izquierda del botón de *Upgrade your plan*.
    - Indicador en vivo tipo píldora que muestra las consultas restantes del mes en tiempo real.
    - Sincronización completa de los 5 diccionarios de internacionalización (`es.ts`, `en.ts`, `de.ts`, `ko.ts`, `pt.ts`) con 0 cadenas pendientes.

## v0.0.13 (2026-08-19)

### Added

- **Copiloto Estratégico de IA y Redacción Inteligente de Dictámenes Metodológicos (Decisión 41)**:
  - **Motor de Inteligencia Artificial Multi-proveedor con Streaming SSE**: Integración con Google Gemini API (`gemini-2.5-flash` / `gemini-2.0-flash` vía Google AI Studio) con cuota de alta escala (1,500 solicitudes/día gratuitas y 1M de tokens de contexto) y fallback automático a Groq Cloud (`llama-3.3-70b-versatile`).
  - **Gobernanza Comercial de Entitlements y Cuotas Mensuales**:
    - `modules.ai_copilot`: Habilitación del módulo de copiloto por tenant.
    - `actions.ai_free_text_chat`: Control de chat libre (desactivado en Plan Free/Prueba para permitir interacción guiada mediante catálogo de prompts predefinidos; activo en planes Pro y Enterprise).
    - `actions.ai_academic_report`: Generación de síntesis ejecutiva y defensa metodológica doctoral asistida por IA.
    - `limits.ai_queries_monthly`: Cuota de consultas mensuales por tenant acumulada y controlada en base de datos mediante la migración `supabase/migrations/2026-08-19T22-00-00_ai_copilot_entitlements_and_usage.sql` y funciones RPC `consume_billing_entitlement_usage` y `get_billing_entitlement_usage`.
    - Capability `investigations.ai_copilot` registrada en `CAPABILITY_MANIFEST` y enlazada a roles `owner`, `admin` y `analyst`.
  - **Copiloto Lateral Deslizante (`AiCopilotSheet`)**:
    - Panel accesible desde la cabecera de pestañas del Investigador con streaming en tiempo real.
    - Catálogo de 5 consultas rápidas predefinidas organizadas por áreas metodológicas: Balance EFI/EFE, Vector Dominante DAFO, Coherencia de Ponderaciones, Mitigación Crítica CAME y Fundamentación QSPM.
    - Indicador en vivo de consultas restantes del plan, bloqueo informativo de texto libre en plan Free con enlace a Pro, y prevención de desbordamiento de cuota.
  - **Redacción de Dictamen con IA en Informe Resumen (`AiReportDialog`)**:
    - Botón **"✨ Redactar dictamen con IA"** en la tarjeta de informe resumen (`/apps/investigator/summary`).
    - Modal de confirmación con advertencia de consumo de cuota (*"Esta acción utilizará 1 consulta de tu cuota mensual de IA..."*) y contador de consultas disponibles antes de la invocación.
    - Selector de pestañas para alternar entre el **Dictamen Estándar (Algorítmico)** y el **Dictamen Enriquecido (IA)** con soporte de copiado al portapapeles.
  - **Endpoints API con Streaming**:
    - `GET /api/investigations/ai/quota`: Consulta de cuota restante, límites y permisos de texto libre.
    - `POST /api/investigations/ai/chat`: Streaming SSE para interacción interactiva con el Copiloto.
    - `POST /api/investigations/ai/report`: Streaming SSE para generación del dictamen metodológico completo.
  - **Internacionalización y Pruebas Automatizadas**:
    - Claves traducidas y sincronizadas en los 5 idiomas (`es.ts`, `en.ts`, `de.ts`, `ko.ts`, `pt.ts`) con 0 cadenas pendientes en `i18n:scan`.
    - Suite de pruebas unitarias en `tests/apps/investigator/ai-governance.test.ts` (32 pruebas pasando).
- **Skeletons de Carga en Todas las Vistas de Análisis, Empty State en Dictamen y Reordenación de Navegación (Decisión 40)**:
  - Reordenación integral del menú de navegación de la suite de investigación: el **Gestor de Investigaciones** (`/apps/investigator/investigations`) se establece como el primer elemento en el sidebar (`src/configs/navConfig.tsx`), en la barra de pestañas (`src/utils/investigator/constants.ts`) y como ruta por defecto en `/apps/investigator`.
  - Integración reactiva de siluetas de carga (`Skeleton` de shadcn) en todas las vistas de análisis (`SummaryView`, `ContextView`, `FactorEditor` para `EFI`/`EFE`, `DafoView`, `QspmView`, `CameView`) activadas mientras `isLoading = !hydrated || syncStatus === 'loading'`, eliminando el parpadeo de pantallas vacías o datos no calculados.
  - Implementación de estado vacío (*Empty State*) en la sección del informe resumen metodológico (`SummaryView`): si la investigación no contiene factores (`state.internal` y `state.external` vacíos), se oculta el texto narrativo y se muestra una tarjeta explicativa con botones de acción directa para registrar factores en EFI (`/apps/investigator/efi`) o abrir un expediente existente en el Gestor (`/apps/investigator/investigations`).
  - Sincronización completa de los 5 diccionarios de internacionalización (`es.ts`, `en.ts`, `de.ts`, `ko.ts`, `pt.ts`) con las claves `academicReportTitle`, `academicReportDesc`, `noDataForReport`, `noDataForReportDesc`, `goToEfi` y `goToManager`.
- **Desacoplamiento del Registro de Último Acceso (`last_opened_at`)**:
  - Parámetro opcional `{ touch?: boolean }` en `getInvestigation` (`src/lib/investigations/service.ts`), `GET /api/investigations/:id` y `client.ts`.
  - El listado de investigaciones en background (`listRemoteInvestigations()`) consulta sin actualizar `last_opened_at`, asegurando que la fecha de último acceso sólo se actualice cuando el usuario abre explícitamente un expediente (`openResearch`).
- **Arquitectura de Historial Diferencial y Optimización de Payload (Decisión 39)**:
  - Eliminación de la clonación de estados completos (`snapshot: cloneState(...)`) en `state.history`, sustituyéndola por un modelo de seguimiento diferencial ligero (`changes: HistoryChangeDetail[]`) que reduce el tamaño por versión de ~45 KB a ~300 bytes (>99% de reducción).
  - Implementación de `computeStateChanges` en `src/utils/investigator/workspace.ts` para detectar automáticamente diferencias en metadatos, factores internos/externos, relaciones cruzadas DAFO, estrategias y acciones CAME con resúmenes legibles y trazabilidad de autoría (`authorName`).
  - Saneamiento y purga automática de snapshots pesados heredados (`sanitizeHistoryEntry` y `normalizeStoredState`), reduciendo instantáneamente de ~900 KB a ~45 KB los expedientes existentes al cargarse o sincronizarse.
  - Ampliación de límites preventivos en backend: `MAX_STATE_PAYLOAD_BYTES = 2MB` (`src/lib/investigations/schema.ts`) y `MAX_REQUEST_BODY_BYTES = 4MB` (`src/lib/investigations/http.ts`), eliminando de forma definitiva el error `HTTP 413 (Payload Too Large)` en peticiones `PATCH /api/investigations/:id`.
  - Cobertura de pruebas unitarias automatizadas en `tests/apps/investigator/delta-history.test.ts` (4 pruebas passing).
- **Reorganización, Ordenación Persistente y Seguridad en Gestor de Investigaciones (Decisión 38)**:
  - Reubicación de acciones secundarias de expedientes en menú contextual de 3 puntos (`DropdownMenu` con `MoreVertical`), dejando visible y accesible el botón principal "Abrir expediente".
  - Visibilidad condicional del botón/opción "Compartir": solo visible cuando la investigación está protegida por el autor (`isLocked`) o tiene acceso restringido, y el usuario actual es el propietario.
  - Alineación fija a la derecha de badges de estado (`[Activo]`, `[Estado]`, `[Protegida/Colaborativa]`, `[Colaboradores]`) manteniéndolos inmóviles ante variaciones en la longitud del título.
  - Carga automática del último expediente abierto al iniciar sesión o sincronizar el workspace (`loadRemoteWorkspace`), persistido en `localStorage` (`novastore:last_opened_investigation_id`).
  - Selector de ordenación de investigaciones (`ArrowUpDown`) con persistencia en preferencias de usuario (`localStorage` `novastore:investigations_sort_order`) soportando orden por última edición, alfabético, fecha de creación y último acceso.
  - Validación de seguridad en `getInvestigation` (`src/lib/investigations/service.ts`): los expedientes privados (`access_level = 'private'`) solo pueden ser leídos por su autor o colaboradores explícitamente autorizados; de lo contrario se deniega el acceso con `403 FORBIDDEN`.
  - Mutación optimista inmediata en `renameResearch` (`use-investigator-analysis.tsx`), reflejando instantáneamente el nuevo nombre en la UI y sincronización reactiva del borrador con tecla `Escape` y botón `Cancelar`.
  - Refinamiento de tokens de diseño semánticos y monocromáticos de shadcn en `ShareInvestigationDialog`, eliminando identificadores técnicos crudos (`team_write`, `editor`) en selectores y estandarizando el botón de añadir con `t('common.add')`.
- **Compartición Granular y Co-autoría en Investigaciones Estratégicas (Decisión 37)**:
  - Soporte de colaboradores específicos del workspace (`investigationCollaboratorSchema` con `userId`, `displayName`, `avatarUrl`, `role: 'editor' | 'viewer'`, `addedAt`).
  - Endpoint `GET /api/workspace/members` para listar los miembros activos del workspace actual desde `memberships` y `profiles`.
  - Capa de autorización en `src/lib/investigations/service.ts`: Los colaboradores con rol `editor` pueden mutar matrices, ponderaciones y factores aún cuando el expediente esté bloqueado (`is_locked = true`) o en modo `team_read`.
  - Diálogo modal accesible `ShareInvestigationDialog` (`src/views/apps/investigator/investigations/share-investigation-dialog.tsx`) para gestionar el nivel de acceso (`team_write`, `team_read`, `private`), bloqueo general y lista de colaboradores por miembro y rol.
  - Integración en `ResearchCard` con botón "Compartir", contador de colaboradores y badges de estado.
  - Soporte de internacionalización en los 5 idiomas (`es`, `en`, `de`, `ko`, `pt`) para todos los textos del modal y acciones de compartición.
- **Internacionalización y Refinamiento Visual en Gestor de Facturación y Planes (`/apps/platform/platform-billing`)**:
  - Corrección integral del diálogo modal de creación/edición de planes comerciales y catálogo de módulos, eliminando claves técnicas crudas (`platform.planDialogDesc`, `platform.uniqueCode`, `billing.price`, `platform.billingInterval`, `pricing.freeTrial`, etc.).
  - Estandarización de atajos de cuotas con etiquetas localizadas (`platform.activeInvestigationsPreset`, `platform.exportPdfMonthlyPreset`, `platform.storage1GbPreset`, `platform.collaboratorsPreset`, `platform.teamsPreset`, `platform.kanbanProjectsPreset`, `platform.kanbanTasksPreset`).
  - Corrección de anchos de columna en la tabla de entitlements (`w-32` para límite, `w-24` para habilitado, `w-20` para quitar) y reemplazo del texto truncado `comm...` por `t('common.remove')`.
  - Sincronización completa de los 5 diccionarios (`es.ts`, `en.ts`, `de.ts`, `ko.ts`, `pt.ts`) bajo `TranslationSchema` estricto, resolviendo claves faltantes (`viewInvoice`, `allTenants`, `commercialAudit`) y eliminando declaraciones duplicadas.
- **Cobertura de Internacionalización al 100% en Todos los Módulos del Sistema (`pnpm run i18n:scan`)**:
  - Escaneo exhaustivo y auditoría en 150 archivos de vista y componentes con 0 textos huérfanos o pendientes.
  - Sincronización completa de los 5 diccionarios de idiomas soportados (`es`, `en`, `de`, `ko`, `pt`) bajo `TranslationSchema` estricto con namespaces para `mail`, `kanban`, `forms`, `datatables`, `dashboards`, `calendar`, `notifications`, `platform`, `investigator`, `pricingPage`, `userSettings` y `userProfile`.
  - Localización completa de la suite de Investigación Estratégica (`/apps/investigator`): DAFO (tablas de relaciones cruzadas, modales de ponderación y justificación), CAME (modal de fichas de acción, selección de criterios, responsables, metas e indicadores), EFI/EFE, QSPM y Resumen.
  - Localización de Plataforma y Facturación (`/apps/platform/platform-billing`): Catálogo global de módulos, derechos por tenant, configuración y edición de planes comerciales, tabla de suscripciones activas y auditoría comercial.
  - Localización de Kanban (`/apps/kanban`): Tablero, columnas dinámicas, formularios de creación/edición de tareas, asignación de miembros y selectores de prioridad.
  - Localización del Módulo de Correo (`/apps/mail`): Lista de carpetas, etiquetas, visor de correos e hilos de conversación, y estados vacíos.
  - Localización de Formularios y Tablas de Datos (`/views/forms`, `/views/datatables`): Tablas básicas, filtrables y con columnas fijables (pinnable columns) adaptadas a constructores dinámicos `getColumns(t)`.
- **Skeletons de Carga y Métricas Enriquecidas en Gestor de Investigaciones (`/apps/investigator/investigations`)**:
  - Integración de condición unificada `isLoading = !hydrated || syncStatus === 'loading'` para mostrar skeletons completos durante la sincronización remota con la base de datos, eliminando el parpadeo de "No hay datos disponibles".
  - Desglose cuantitativo semántico en la cabecera: `{totalCount} expedientes · {activeCount} activos · {closedCount} cerrados · {archivedCount} archivados`.
  - Internacionalización de etiquetas de auditoría en tarjetas de investigación (`investigator.author`, `investigator.modifiedBy`, etc.).

### Fixed

- **Corrección de Trigger PostgreSQL en Bloqueo de Expedientes (`PATCH /api/investigations/:id`)**:
  - Publicada la migración forward `supabase/migrations/2026-08-19T13-45-00_fix_investigations_lock_transition_trigger.sql` corrigiendo la función trigger `public.validate_investigation_transition()`.
  - Reconocimiento de `is_locked` y `access_level` como modificaciones válidas de negocio bajo control de versiones optimista (`new.version = old.version + 1`), eliminando el error PostgreSQL `22023 (investigation update must change a business field)` y el timeout de 18.4s en peticiones `PATCH`.
  - Sincronización bidireccional de metadatos de bloqueo y nivel de acceso entre columnas relacionales y documento JSON `state` en `patchInvestigation` (`service.ts`).
- **Resolución Integral de Errores de Tipado TypeScript (`pnpm run check-types`)**:
  - Corrección de tipado en `src/views/pages/pricing/billing/upgrade/index.tsx` asegurando que los parámetros para `t()` sean de tipo `string | number`.
  - Corrección de mapeo de estadísticas y etiquetas en `src/views/pages/user-profile/connections/index.tsx` respetando la interfaz `UserConnection`.
  - Corrección de acceso a `thread.messages` y avatar de usuario en `src/views/apps/mail/mail-display/mail-display-content.tsx`.
  - Corrección de invocación a `handleDeleteTeam` en `src/views/pages/user-settings/workspace/workspace-teams.tsx`.
  - Limpieza de duplicaciones en diccionarios de idiomas y corrección de cumplimiento de `TranslationSchema` en `src/locales/de.ts`, `en.ts`, `ko.ts` y `pt.ts`.
  - **Desacoplamiento de Registro de Último Acceso (`last_opened_at`) en Gestor de Investigaciones**:
    - Corrección en `getInvestigation` (`service.ts`), `GET /api/investigations/[id]` (`route.ts`) y `getRemoteInvestigation` (`client.ts`): `touchInvestigationAccess` ahora es opcional (`touch?: boolean`) y solo se ejecuta cuando el usuario abre explícitamente un expediente (`openResearch`).
    - Eliminada la mutación masiva de marcas de tiempo `last_opened_at` que ocurría al sincronizar o listar todas las investigaciones en lote (`listRemoteInvestigations`), garantizando que la fecha de último acceso refleje fielmente cuándo el usuario interactuó con cada expediente específico.
  - **Limpieza Visual y Coherencia de Estados en Diálogo de Compartir Expediente (`ShareInvestigationDialog`)**:
    - Eliminados todos los iconos decorativos y emojis redundantes en la cabecera, etiquetas de sección, botones y filas de colaboradores, obteniendo una interfaz limpia y sobria.
    - Sincronización reactiva entre el estado de bloqueo (`isLocked`), expedientes cerrados (`status === 'cerrada'`) y el selector de acceso general (`accessLevel`), impidiendo que un expediente protegido o cerrado se muestre falsamente como "Colaborativa (Todos pueden editar)".
    - Corrección en las tarjetas de investigación (`ResearchCard`) para representar explícitamente el badge `[Privada]` cuando `accessLevel === 'private'`.

## v0.0.12 (2026-08-18)

### Added

- **Mecanismo Automatizado de Auditoría y Escaneo Estático de Cadenas Sin Traducir (`pnpm run i18n:scan`)** ([i18n-audit-views.ts](/scripts/i18n-audit-views.ts), `package.json`):
  - Herramienta de detección que analiza sintácticamente todas las vistas JSX/TSX en `src/views/` y componentes de `src/components/layout` y `src/components/shared`.
  - Detección de nodos de texto JSX huérfanos y propiedades de texto de interfaz (`placeholder`, `title`, `aria-label`, `description`, `label`, `alt`) no encapsuladas en llamadas a `t()`.
  - Reporte consolidado con archivo, línea exacta y sugerencia de clave.
- **Internacionalización Completa de Subcomponentes y Formularios de Configuración de Usuario (`/pages/user-settings`)**:
  - `general/` ([personal-info.tsx](/src/views/pages/user-settings/general/personal-info.tsx), [connect-account.tsx](/src/views/pages/user-settings/general/connect-account.tsx), [social-url.tsx](/src/views/pages/user-settings/general/social-url.tsx), [danger-zone.tsx](/src/views/pages/user-settings/general/danger-zone.tsx)):
    - Traducción al 100% de títulos y descripciones de sección, subida de avatar, restricciones de tamaño de archivo, campos de información personal (*Nombre, Apellidos, Teléfono, País, Género, Rol*), sección completa de dirección fiscal (*Dirección Línea 1, Línea 2, Ciudad, Estado/Provincia, Código Postal*), modal y lista de cuentas conectadas, gestión de enlaces y redes sociales, y zona de peligro con diálogo de confirmación.
  - `security/` ([email-password.tsx](/src/views/pages/user-settings/security/email-password.tsx), [two-factor.tsx](/src/views/pages/user-settings/security/two-factor.tsx)):
    - Traducción de títulos, descripciones, campos de contraseña actual/nueva, requisitos de seguridad dinámicos y configuración de autenticación en dos factores (2FA).
  - `workspace/` ([workspace-name.tsx](/src/views/pages/user-settings/workspace/workspace-name.tsx), [workspace-detail.tsx](/src/views/pages/user-settings/workspace/workspace-detail.tsx), [primary-organization.tsx](/src/views/pages/user-settings/workspace/primary-organization.tsx), [danger-zone.tsx](/src/views/pages/user-settings/workspace/danger-zone.tsx), [workspace-data.tsx](/src/views/pages/user-settings/workspace/workspace-data.tsx), [workspace-organizations.tsx](/src/views/pages/user-settings/workspace/workspace-organizations.tsx)):
    - Traducción de formularios de nombre y zona horaria, subida de logo de espacio, selector de organización predeterminada, exportación de datos y salida de espacios.
  - `billing/` ([current-plan-section.tsx](/src/views/pages/user-settings/billing/current-plan-section.tsx)):
    - Traducción de tarjeta de plan activo, estado del ciclo, botones de acción (*Gestionar facturación, Cambiar plan*) y medidores de progreso de consumo.
- **Internacionalización de Secciones de Perfil de Usuario (`/pages/user-profile`)**:
  - `profile/` ([about-section.tsx](/src/views/pages/user-profile/profile/about-section.tsx)):
    - Traducción de tarjetas de información personal (*Acerca de, Contacto, Equipos, Resumen de métricas*).

## v0.0.11 (2026-08-18)

### Added

- **Internacionalización Integral de Vistas de Gestión de Usuarios y Accesos (`/apps/users`, `/apps/roles`, `/apps/permissions`)**:
  - `/apps/users/list` ([user-table-filters.tsx](/src/views/apps/users/list/user-table-filters.tsx), [user-table-toolbar.tsx](/src/views/apps/users/list/user-table-toolbar.tsx), [user-table-columns.tsx](/src/views/apps/users/list/user-table-columns.tsx), [user-pagination.tsx](/src/views/apps/users/list/user-pagination.tsx)):
    - Conexión de todos los filtros de rol y estado (`Activo`, `Pendiente`, `Suspendido`, `Inactivo`, `Todos`), barra de herramientas (búsqueda, exportaciones CSV/Excel/JSON, importación, botón `Añadir Nuevo Usuario`), columnas de la tabla y controles de paginación (`Mostrando {from} a {to} de {total} registros`, `Anterior`, `Siguiente`).
  - `/apps/users/invitations` ([invitations/index.tsx](/src/views/apps/users/invitations/index.tsx)):
    - Traducción reactiva de encabezados, buscador por correo, badges de estado de entrega (`Pendiente`, `Enviado`, `Fallido`), columnas (`Correo`, `Espacio`, `Rol`, `Estado`, `Envío`, `Fecha de Registro`, `Acciones`), y tooltips de acciones (`Editar`, `Reenviar`, `Revocar`).
  - `/apps/roles` ([roles/index.tsx](/src/views/apps/access/roles/index.tsx)):
    - Kicker, título, descripción, botón `+ Crear rol`, tarjetas KPI métricas (`Roles totales`, `Roles activos`, `Roles personalizados`), tabla de roles con badges de ámbito (`Plataforma`, `Global tenant`, `Tenant`), estados (`Activo`, `Inactivo`) y botones de alternancia (`Desactivar`, `Activar`).
  - `/apps/permissions` ([permissions/index.tsx](/src/views/apps/access/permissions/index.tsx)):
    - Kicker, título, descripción, botón `Guardar permisos`, panel lateral de roles con conteo dinámico de capacidades (`{count} capacidades`), panel central de selección y badges (`Sistema`, `Personalizado`, `Modo Consulta`).
- **Internacionalización de Pantallas de Administración y Plataforma (`/apps/platform/*`)**:
  - `/apps/platform/registration-cleanup` ([registration-cleanup/index.tsx](/src/views/apps/platform/registration-cleanup/index.tsx)):
    - Kicker de ámbito de plataforma, título y descripción institucional integrados con `useI18n()`.
  - `/apps/platform/vid` ([vid/index.tsx](/src/views/apps/platform/vid/index.tsx)):
    - Kicker de plataforma, título, descripción de verificación de identidad digital y botón de actualización de cola.
  - `/apps/platform/billing` ([platform-billing/index.tsx](/src/views/apps/platform/platform-billing/index.tsx)):
    - Kicker de plataforma, título de gestión de facturación de plataforma, descripción global y botón de refresco.
- **Internacionalización de Pestañas de Configuración y Perfil de Usuario (`/pages/user-settings`, `/pages/user-profile`)**:
  - `/pages/user-settings` ([user-settings-tabs.tsx](/src/views/pages/user-settings/user-settings-tabs.tsx)):
    - Pestañas de configuración totalmente dinámicas: `General`, `Espacio de Trabajo`, `Miembros`, `Seguridad`, `Verificación Digital` (VID) y `Facturación y Consumo`.
  - `/pages/user-profile` ([user-profile-tabs.tsx](/src/views/pages/user-profile/user-profile-tabs.tsx)):
    - Pestañas de perfil multilingües: `Perfil`, `Equipos`, `Proyectos` y `Conexiones`.
- **Sincronización Total con Gemini API en los 5 Idiomas**:
  - 100% de cobertura y congruencia lingüística en `es.ts`, `en.ts`, `de.ts`, `pt.ts`, `ko.ts` verificada con `pnpm run i18n:check`.

## v0.0.10 (2026-08-18)

### Added

- **Internacionalización Integral de la Página de Planes Comerciales (`/pages/pricing`)** ([pricing/index.tsx](/src/views/pages/pricing/index.tsx)):
  - Traducción al 100% de la interfaz fija, encabezados, kickers, subtítulos, badges de planes (`Actual`, `Vitalicio`, `Gratis`), intervalos (`/mes`, `/año`, `/{hours}h demo`, `/{hours}h pase`) y botones de acción (`Plan actual`, `Gestionar plan`, `Iniciar prueba`, `Comprar acceso`, `Elegir plan`, `A consultar`).
  - Matriz comparativa de capacidades y límites conectada a `useI18n()` con formateadores numéricos parametrizados: `Ilimitado` / `Unlimited` / `무제한`, `Hasta {count} proyectos`, `Hasta {count} miembros`, `1 usuario`, `{count} activas`.
  - Soporte reactivo que actualiza los planes automáticamente ante cambios de idioma en el selector.
- **Hook de Backend para Traducción Asistida por IA de Planes Dinámicos (Opción B)** ([translation.ts](/src/features/billing/translation.ts), [plans/route.ts](/src/app/api/billing/plans/route.ts)):
  - Módulo en el servidor que utiliza **Google Gemini API** (`gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-pro-latest`) para traducir nombres y descripciones de planes creados o personalizados en la base de datos al idioma del usuario activo (`en`, `de`, `pt`, `ko`).
  - Detección del idioma solicitado en `/api/billing/plans` mediante parámetros de consulta (`?locale=`), cookies de sesión (`NEXT_LOCALE`, `novastore_locale`) y encabezados HTTP (`x-locale`, `Accept-Language`).
  - Memoria caché en el servidor para evitar llamadas redundantes a la API de IA.
- **Corrección Exhaustiva de Elementos de Navegación en el Menú Lateral** ([Sidebar.tsx](/src/components/layout/Sidebar.tsx), [es.ts](/src/locales/es.ts)):
  - Resolución y traducción de todas las claves que aparecían en formato crudo: `nav.userList`, `nav.userView`, `nav.invitations`, `nav.roles`, `nav.rolesList`, `nav.permissionsList`, `nav.security`, `nav.teams`, `nav.platform`, `nav.organizations`.
  - Traducción del subtítulo institucional bajo el logo (`nav.brandSubtitle`: *"Apps de Plataforma de Administración"* / *"관리 플랫폼 앱"*).
  - Traducción de las insignias (`badges`) en elementos colapsables y hojas del menú (`Try Demo` → *"Probar Demo"* / *"데모 체험"*).
  - Traducción del enlace inferior a planes (`Pricing` → *"Planes y Precios"* / *"요금제"*).

## v0.0.9 (2026-08-18)

### Added

- **Pipeline Automatizado de Traducción con Inteligencia Artificial (Google Gemini API)** ([scripts/i18n-sync.ts](/scripts/i18n-sync.ts), `package.json`):
  - Herramienta de sincronización CLI impulsada por modelos Gemini (`gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-pro-latest`) con prompt de dominio estratégico y extracción JSON estricta.
  - Detección automática de claves faltantes en diccionarios derivados (`en`, `de`, `pt`, `ko`) tomando `src/locales/es.ts` como fuente canónica de verdad.
  - Comandos npm dedicados: `pnpm run i18n:sync` (traducción y fusión automática) y `pnpm run i18n:check` (verificación de cobertura en pipelines CI/CD).
- **Internacionalización Completa del Dashboard Estratégico** ([/dashboard/investigations](/src/views/dashboards/investigations/index.tsx)):
  - Traducción al 100% de la vista principal y todos sus 6 subcomponentes:
    - Tarjetas KPI métricas de expedientes, salud interna EFI y respuesta externa EFE ([kpi-cards.tsx](/src/views/dashboards/investigations/components/kpi-cards.tsx)).
    - Matriz de posicionamiento estratégico en 4 cuadrantes con umbrales metodológicos y tooltips dinámicos ([positioning-matrix.tsx](/src/views/dashboards/investigations/components/positioning-matrix.tsx)).
    - Gráfico de balance y distribución de factores DAFO ([factors-distribution-chart.tsx](/src/views/dashboards/investigations/components/factors-distribution-chart.tsx)).
    - Gráfico de iniciativas y prioridades del Plan de Acción CAME ([came-actions-chart.tsx](/src/views/dashboards/investigations/components/came-actions-chart.tsx)).
    - Tabla central de expedientes con filtrado, puntuaciones y estados de validación ([recent-investigations-table.tsx](/src/views/dashboards/investigations/components/recent-investigations-table.tsx)).
    - Panel lateral de dictamen metodológico y resumen académico ([investigation-summary-sheet.tsx](/src/views/dashboards/investigations/components/investigation-summary-sheet.tsx)).
- **Sistema de Internacionalización (i18n) y Selector de Idiomas en Navbar** ([LanguageDropdown.tsx](/src/components/shared/LanguageDropdown.tsx), [Header.tsx](/src/components/layout/Header.tsx), [use-i18n.tsx](/src/hooks/use-i18n.tsx), [Providers.tsx](/src/components/Providers.tsx)):
  - Soporte completo y reactivo para 5 idiomas: 🇪🇸 **Español (`es`)** (base predeterminado), 🇺🇸 **Inglés (`en`)**, 🇩🇪 **Alemán (`de`)**, 🇧🇷 **Portugués (`pt`)** y 🇰🇷 **Coreano (`ko`)**.
  - Dropdown interactivo en la barra superior con nombres nativos, banderas, indicadores de selección y actualización instantánea sin recarga de página.
  - Persistencia híbrida en `localStorage` (`novastore_locale`) y cookie `NEXT_LOCALE` con sincronización de `document.documentElement.lang`.
- **Diccionarios Modulares y Tipado Estricto de Traducciones** ([src/locales/](/src/locales/index.ts)):
  - Estructura modular tipada (`TranslationSchema`) por namespaces: `common`, `nav`, `investigator`, `dashboard`, `billing`, `auth`, `userMenu`.
  - Helper de traducción `t(key, params)` con interpolación de variables y fallback transparente al español.
- **Navegación Dinámica Multilingüe en Sidebar y Pestañas de Workspace** ([Sidebar.tsx](/src/components/layout/Sidebar.tsx), [layout-client.tsx](/src/app/(pages)/apps/investigator/layout-client.tsx)):
  - Mapeo y traducción completa del 100% de los elementos del menú lateral: grupos (`Dashboard`, `Apps`, `Administration`, `User access`), módulos (`Investigator`, `Registration cleanup`, `Digital Verification Identity`, `Platform Billing`, `User Settings`, `User Profile`, etc.) y submenús.
  - Barra de pestañas superior de NovaInvestigator traducida reactivamente (`Contexto`, `Resumen`, `EFI`, `EFE`, `DAFO`, `QSPM`, `CAME`, `Gestor`).
- **Internacionalización Completa de Vistas de NovaInvestigator** ([qspm/index.tsx](/src/views/apps/investigator/qspm/index.tsx), [dafo/index.tsx](/src/views/apps/investigator/dafo/index.tsx), [came/index.tsx](/src/views/apps/investigator/came/index.tsx), [context/index.tsx](/src/views/apps/investigator/context/index.tsx), [summary/index.tsx](/src/views/apps/investigator/summary/index.tsx), [efi/index.tsx](/src/views/apps/investigator/efi/index.tsx), [efe/index.tsx](/src/views/apps/investigator/efe/index.tsx)):
  - Encabezados de etapas, títulos de tarjetas, botones de acción (`+ Añadir alternativa`, `Validar investigación`), filtros, tablas y ranking TAS integrados con `t()`.
- **Suite de Pruebas Unitarias de Internacionalización** ([use-i18n.test.ts](/tests/i18n/use-i18n.test.ts)):
  - Pruebas de validación para normalización de códigos BCP-47, metadatos e integridad estructural de los 5 diccionarios.

## v0.0.8 (2026-08-18)

### Added

- **Sincronización en Tiempo Real y Auto-Recuperación de Conflictos de Concurrencia (HTTP 409)** ([use-investigator-analysis.tsx](/src/hooks/use-investigator-analysis.tsx), [client.ts](/src/lib/investigations/client.ts)):
  - Canal reactivo de Supabase Realtime (`postgres_changes` en `public.investigations`) que propaga automáticamente ediciones de otros miembros del equipo si el cliente local no tiene cambios pendientes de guardado.
  - Mecanismo de re-negociación y reconciliación optimista ante colisiones de guardado concurrente (HTTP 409 `VERSION_CONFLICT`), recuperando la versión más reciente del servidor y sincronizando el estado sin interrupciones.
- **Trazabilidad Integral y Registro de Auditoría en Gestor de Investigaciones** ([investigations/index.tsx](/src/views/apps/investigator/investigations/index.tsx), [repository.ts](/src/lib/investigations/repository.ts), [service.ts](/src/lib/investigations/service.ts), [2026-08-17T03-00-00_investigations_audit_and_locking.sql](/supabase/migrations/2026-08-17T03-00-00_investigations_audit_and_locking.sql)):
  - Nuevas columnas y funciones SQL `last_opened_at`, `last_opened_by`, `touch_investigation_access` e hidratación por lote de nombres desde `public.profiles`.
  - Cuadrícula de auditoría visible en cada tarjeta del Gestor de Investigaciones:
    - 👤 **Autor / Creador**: Nombre/email y fecha de creación.
    - ✏️ **Última edición**: Nombre del último editor, fecha de modificación y número de versión (`v.X`).
    - 👁️ **Último acceso**: Nombre del último usuario en abrir la investigación y fecha/hora exacta.
- **Protección de Autor, Gobernanza de Acceso y Modo Consulta (Solo Lectura)** ([use-investigator-analysis.tsx](/src/hooks/use-investigator-analysis.tsx), [factor-editor.tsx](/src/views/apps/investigator/shared/factor-editor.tsx), [dafo/index.tsx](/src/views/apps/investigator/dafo/index.tsx), [qspm/index.tsx](/src/views/apps/investigator/qspm/index.tsx), [came/index.tsx](/src/views/apps/investigator/came/index.tsx), [service.ts](/src/lib/investigations/service.ts)):
  - Propiedades `is_locked` y `access_level` (`'private' | 'team_read' | 'team_write'`) controladas por el autor de la investigación.
  - Validación en tres capas: API Handler / Service (rechaza modificaciones no autorizadas con `403 Forbidden / investigations.locked`), Dominio en hook (`commitState` bloqueado con toast informativo) y UI (bloqueo reactivo de inputs, selects, textareas y botones con insignias distintivas de "Modo Consulta").
  - Botón asistido `Proteger / Desproteger` para el autor en el Gestor de Investigaciones.
- **División en 2 Secciones Independientes y Subtotales Alineados en Tablas EFI / EFE** ([factor-editor.tsx](/src/views/apps/investigator/shared/factor-editor.tsx)):
  - Segmentación clara de la tabla en dos bloques diferenciados: bloque superior para factores primarios (Fortalezas $F$ / Oportunidades $O$) con subtotal en línea y bloque inferior para factores secundarios (Debilidades $D$ / Amenazas $A$) con subtotal en línea.
  - Alineación estricta de columnas para peso, calificación y puntaje con ancho fijo, y consolidación del total general en `TableFooter`.

### Fixed

- **Validación de Tipos y Prevención de Desbordamiento de Columnas**: Estabilizado ancho de columna para fuente de evidencia (`w-[30rem]`) y corregidos tipos en formulario de metadatos de contexto.

## v0.0.7 (2026-08-17)

### Added

- **Arquitectura Zero-State y Sincronización Dinámica de Dimensiones Arbitrarias ($M \times N$)** ([domain.ts](/src/utils/investigator/domain.ts), [use-investigator-analysis.tsx](/src/hooks/use-investigator-analysis.tsx), [demo.ts](/src/utils/investigator/demo.ts)):
  - Función `createBlankState()` que inicializa nuevas investigaciones en cero absoluto ($0$ factores internos, $0$ factores externos, $0$ relaciones, $0$ estrategias y $0$ fichas CAME), eliminando cualquier pre-población forzada de 5 factores.
  - Sincronizador puro `syncRelationships(internal, external, existing)` que calcula y sincroniza de forma reactiva la matriz de cruces $|Internal| \times |External|$ ante la inserción, edición de tipo o eliminación de factores arbitrarios (ej. 2 F, 1 D, 3 O, 2 A), preservando evaluaciones preexistentes y depurando relaciones huérfanas.
- **Desacoplamiento Total de la Semilla Demo (ETECSA) vs Dominio Puro** ([domain.ts](/src/utils/investigator/domain.ts), [demo.ts](/src/utils/investigator/demo.ts)):
  - Aislamiento completo de textos simulados, mapeos de tesis y heurísticas de scoring de demostración dentro de `src/utils/investigator/demo.ts` (`demoGetRelationStrength`, `buildDemoRelationships`, `buildDemoCameActions`, etc.).
  - `src/utils/investigator/domain.ts` se mantiene 100% puro, genérico y agnóstico, sin cadenas hardcodeadas ni dependencias de datos fijos.
  - Conservación inmutable de la semilla de referencia ETECSA (EFI: 2.15, EFE: 2.45, DO: 1.98, QSPM ganador: EST-FO-01).
- **Adopción Universal de TanStack Table (`@tanstack/react-table`) y Tokens ShadCN en Todas las Vistas** ([factor-editor.tsx](/src/views/apps/investigator/shared/factor-editor.tsx), [dafo/index.tsx](/src/views/apps/investigator/dafo/index.tsx), [qspm/index.tsx](/src/views/apps/investigator/qspm/index.tsx), [came/index.tsx](/src/views/apps/investigator/came/index.tsx)):
  - Migración completa de todas las tablas de NovaInvestigator a `@tanstack/react-table` con `ColumnDef<T>` fuertemente tipado:
    - **Editor de Factores EFI/EFE**: columnas ordenables, selección de evidencia, normalización de peso y subtotales por cuadrante en `TableFooter`.
    - **Tabla Detallada DAFO**: cruces pareados con badges de cuadrante, selector de fuerza ($0-3$), justificación y modal de edición.
    - **Matriz QSPM (David)**: columnas dinámicas de estrategias generadas en base a `state.strategies`, selección reactiva de $AS$, cálculo en tiempo real de $TAS$ y subtotales por tipo de factor.
    - **Plan de Acción CAME**: tabla multicriterio con inputs compactos de los 5 criterios ($1-5$), cálculo de prioridad ponderada, categorización por color y modal expandido.
- **Normalización Proporcional de Pesos en 1 Clic (EFI/EFE)** ([domain.ts](/src/utils/investigator/domain.ts), [use-investigator-analysis.tsx](/src/hooks/use-investigator-analysis.tsx), [factor-editor.tsx](/src/views/apps/investigator/shared/factor-editor.tsx)):
  - Algoritmo `normalizeFactorWeights` que normaliza proporcionalmente la suma de pesos de los factores a exactamente $1.00$ con compensación de redondeo al factor de mayor peso sin alterar los datos demo de referencia.
  - Botón asistido en la cabecera del editor de factores para normalizar pesos con un solo clic e insignia dinámica de validación (`Suma de pesos: X / 1.00`).
  - Filas de subtotales visuales en la tabla de factores para Fortalezas ($F$) vs Debilidades ($D$) en EFI y Oportunidades ($O$) vs Amenazas ($A$) en EFE.
  - Atajos rápidos de clasificación de evidencias metodológicas (Entrevistas, Encuestas, Revisión documental, Observación directa y Dictamen de expertos).
- **Matriz 2×2 Interactiva de Cruces DAFO y Modal de Relaciones** ([dafo/index.tsx](/src/views/apps/investigator/dafo/index.tsx)):
  - Selector de modo de visualización: **Matriz Cuadrantes 2×2** ($FO, DO, FA, DA$) con tarjetas interactivas por cruce vs **Lista Detallada** con filtros por cuadrante y estado de evaluación.
  - Componente modal `RelationshipEditDialog` para editar con precisión la fuerza ($0-3$), la justificación cualitativa del cruce, la evidencia documental y el evaluador responsable.
- **Matriz Cuantitativa de Planificación Estratégica (QSPM - David) con Subtotales y Nombres Completos** ([qspm/index.tsx](/src/views/apps/investigator/qspm/index.tsx), [domain.ts](/src/utils/investigator/domain.ts), [investigator-types.ts](/src/types/apps/investigator-types.ts)):
  - Presentación del nombre completo y badge de tipo de cada factor crítico en la matriz QSPM, eliminando la ceguera de códigos.
  - Presentación dual en cada celda de evaluación: selector de Atractivo ($AS$) y valor calculado de Atractivo Total Ponderado ($TAS = \text{Peso} \times AS$).
  - Filas de subtotales automáticos para factores internos (EFI) y factores externos (EFE) por cada alternativa estratégica, sumando el $TAS$ total de la alternativa con insignia del cuadrante y líder destacado.
- **Plan Operativo CAME Multicriterio y Asistente de Borrador** ([came/index.tsx](/src/views/apps/investigator/came/index.tsx), [domain.ts](/src/utils/investigator/domain.ts)):
  - Botón asistido `Generar borrador CAME desde diagnóstico` que pre-puebla acciones a partir de los factores registrados y la estrategia ganadora.
  - Controles compactos para calificar los 5 criterios de prioridad ($1-5$) por ficha (*Impacto, Urgencia, Severidad, Alineación, Factibilidad*) con cálculo continuo ponderado.
  - Modal expandido de gestión operativa CAME con campos completos: objetivo, responsable, participantes, cronograma (inicio/término), indicadores de éxito, línea base, meta y justificación metodológica.
- **Dictamen Académico Editorial (Regla de Oro - Sección 19) y Matriz IE** ([summary/index.tsx](/src/views/apps/investigator/summary/index.tsx)):
  - Generación de síntesis en prosa académica continua que fundamenta la posición interna (EFI), externa (EFE), cuadrante dominante, estrategia seleccionada en QSPM y priorización CAME para tesis e informes ejecutivos.
  - Botón de 1 clic para copiar el dictamen al portapapeles.
  - Tarjeta de Posicionamiento Estratégico Interno-Externo (IE Matrix 3×3) con prescripción metodológica y vector dominante.

### Fixed

- **Validación de Tipos TypeScript y Control de Nulos**: Corregidos tipos en `Select` de ShadCN y definiciones de columnas en `@tanstack/react-table` en las vistas DAFO, QSPM y CAME.

## v0.0.6 (2026-08-16)

- **Conversión de la Barra de Navegación de Investigator a Tabs Oficiales de shadcn y Eliminación de Scrollbars** ([layout-client.tsx](/src/app/(pages)/apps/investigator/layout-client.tsx)):
  - Sustitución de los botones `<Button>` enumerados por componentes nativos `Tabs`, `TabsList` y `TabsTrigger` de shadcn/ui.
  - Eliminación de la numeración prefija (`1, 2, ..., 8`), presentando una interfaz limpia, accesible y moderna de pestañas (`Contexto`, `Resumen`, `EFI`, `EFE`, `DAFO`, `QSPM`, `CAME`, `Gestor`) con navegación por rutas y contención estricta de overflow vertical para erradicar barras de scroll espurias.
- **Skeletons de Carga en el Gestor de Investigaciones** ([investigations/index.tsx](/src/views/apps/investigator/investigations/index.tsx)):
  - Incorporación de placeholders animados con `Skeleton` durante el proceso de hidratación y consulta inicial del workspace (`!hydrated`), previniendo parpadeos de contenido vacío y replicando la estructura de títulos, insignias y botones de acción.
- **Jerarquía Visual y Presentación de Títulos de Investigaciones vs UUIDs** ([context/index.tsx](/src/views/apps/investigator/context/index.tsx), [investigations/index.tsx](/src/views/apps/investigator/investigations/index.tsx) y [use-investigator-analysis.tsx](/src/hooks/use-investigator-analysis.tsx)):
  - **Vista de Contexto (`/apps/investigator/context`)**: La tarjeta principal `<CardTitle>` renderiza dinámicamente el nombre real y legible asignado por el usuario (`state.metadata.title || 'Nueva investigación estratégica'`), relegando el UUID técnico del expediente a la línea de descripción secundaria (`<CardDescription>`).
  - **Gestor de Investigaciones (`/apps/investigator/investigations`)**: Eliminado el badge de UUID invasivo que opacaba el nombre de las investigaciones; cada fila prioriza el título formal en tipografía semántica (`font-semibold`) y ubica el ID del expediente como metadato discreto en la línea inferior de conteo de factores.
  - **Notificaciones y Toasts**: Las alertas de apertura de expediente muestran el nombre de la investigación entre comillas en lugar del identificador UUID crudo.
- **Estados de Carga Progresiva con Skeleton en Platform Billing Management** ([index.tsx](/src/views/apps/platform/platform-billing/index.tsx)):
  - **Eliminación del Parpadeo de Estado Vacío (FOEC)**: Implementación de componentes `Skeleton` oficiales de shadcn en todas las tablas y tarjetas del módulo administrativo (`Planes Comerciales`, `Gobernanza de Acceso y Pruebas`, `Catálogo Global de Módulos`, `Suscripciones Activas`, `Facturas de Stripe`, `Entitlements por Tenant` y `Auditoría Comercial`).
  - Durante el tiempo de resolución asíncrona de las peticiones iniciales, la interfaz muestra placeholders animados que respetan la geometría y columnas exactas de cada tabla antes de transicionar a los datos reales o al estado vacío legítimo.
- **Consolidación de Entitlements Únicos y Gobernanza de Acceso Global** ([index.tsx](/src/views/apps/platform/platform-billing/index.tsx), [admin-service.ts](/src/features/billing/admin-service.ts) y [2026-08-17T02-00-00_trial_entitlements_unification.sql](/supabase/migrations/2026-08-17T02-00-00_trial_entitlements_unification.sql)):
  - **`public.plan_entitlements` como Única Fuente de la Verdad**: Todos los límites de capacidad (`investigations.max_active`, `investigations.export_pdf_monthly`, `storage.max_bytes`, `users.max_members`) y módulos (`modules.*`) del trial se gestionan exclusivamente dentro del plan comercial `trial` en `public.plan_entitlements`, eliminando la duplicidad histórica de tablas y esquemas de claves dispares (`actions.*`, `limits.*`).
  - **Actualización de `start_trial` RPC**: La función de base de datos inyecta directamente los entitlements del plan comercial activo en `public.access_grant_entitlements` con `source = 'plan'`.
  - **Card Única de Gobernanza de Acceso y Pruebas en Plataforma**: Se unificaron en una sola tarjeta las 4 políticas de acceso a nivel de plataforma (`Habilitar Trial Registrado`, `Permitir Trial Guest`, `Permitir Checkout en Trial Registrado` y `Máximo de sesiones por Guest`), eliminando los controles redundantes de duración en días, switch de PDF y la tabla duplicada de entitlements del trial.
- **Unificación de Prueba Gratuita (Free / Demo) como Plan Comercial de $0** ([pricing/index.tsx](/src/views/pages/pricing/index.tsx), [admin-service.ts](/src/features/billing/admin-service.ts) y [2026-08-17T01-10-00_free_plan_interval_and_trial_unification.sql](/supabase/migrations/2026-08-17T01-10-00_free_plan_interval_and_trial_unification.sql)):
  - El plan Demo / Trial se convierte en un plan de catálogo formal de $0 en base de datos (`public.plans`), devuelto dinámicamente por `GET /api/billing/plans` con sus entitlements reales.
  - Eliminado el plan sintético estático `DEMO_TRIAL_PLAN` hardcodeado en la vista de precios; el plan gratuito se ordena naturalmente al inicio de la matriz de precios (por `amount_minor ASC`).
  - **Nuevo Intervalo de Cobro `'free'` (Gratis)**: extendido el tipo `BillingInterval` (`'free' | 'one_time' | 'month' | 'year'`) y schemas Zod administrativos para soportar planes gratuitos sin requerir un identificador de precio de Stripe (`provider_price_id`).
  - **Migración DDL de Integridad (`plans_check`)**: ajustada la restricción de integridad en Postgres para que `(interval = 'free' AND amount_minor = 0)` sea válido para planes comerciales activos y públicos sin Stripe Price ID.
  - **Unificación de Pestañas en la Plataforma Administrativa** ([index.tsx](/src/views/apps/platform/billing/index.tsx)): la pestaña independiente *Política de Prueba* se unificó e integró dentro de la pestaña principal *Catálogo de Planes & Prueba*, permitiendo configurar tanto los planes comerciales como la política de acceso de prueba en una misma pantalla.
  - **Modal de Creación/Edición con Selector de Intervalo 'Gratis'**: el administrador puede crear planes con intervalo `Gratis (Prueba / Demo)`, bloqueando el precio a $0 y permitiendo definir duración temporal (en horas) o permanente.
- **Página de upgrade con wizard multi-paso** ([page.tsx](/src/app/(pages)/pages/billing/upgrade/page.tsx) y [index.tsx](/src/views/pages/billing/upgrade/index.tsx)):
  - Nuevo flujo guiado de compra con el **Stepper oficial de shadcn** (`@stepper/stepper` instalado vía `npx shadcn@latest add @stepper/stepper` → [stepper.tsx](/src/components/ui/stepper.tsx)): pasos *Plan → Espacio de trabajo → Datos de pago*.
  - **Soporte de Asunción / Renovación de Pago**: los usuarios delegados (y el propietario) pueden seleccionar el plan activo actual del workspace para renovarlo o asumir el cobro recurrente. Banner informativo contextual que explica la transición.
  - **Detección y Confirmación de Downgrade (`DowngradeWarningDialog`)**: modal con tabla comparativa de capacidades y límites resultantes (precio, investigaciones activas, exportaciones PDF, módulos) y checkbox obligatorio de confirmación antes de iniciar el checkout.
  - **Matriz Comparativa de Planes y Metadatos Dinámicos de Módulos** ([pricing/index.tsx](/src/views/pages/pricing/index.tsx)): nuevo diseño de página de precios con tabla comparativa estructurada por categorías (`Feature Breakdown Table`), pantalla única continua con todos los planes ordenados por precio (sin filtros de pestañas), cabecera superior plana 1:1 (`table-fixed`) sin cards con bordes, ajuste de texto seguro en la primera columna (`break-words`, padding holgado) y resolución dinámica de títulos de apps desde `public.platform_modules`.
  - **Gobernanza de Visibilidad y Modo de Contratación** ([index.tsx](/src/views/apps/platform/billing/index.tsx)): migración `plans_visibility_and_contact_sales` con columnas `is_public` y `contact_sales`, nuevos controles en el modal de planes para visibilidad pública y cotización comercial, y resolución del listado administrativo `listAdminPlans` con cliente admin para mantener visibles los planes inactivos.
  - **Gestión de Descripciones de Planes en Plataforma** ([index.tsx](/src/views/apps/platform/billing/index.tsx)): nuevo campo visual de descripción en el modal de creación/edición de planes comerciales (`public.plans.description`), persistiendo descripciones dinámicas para alimentar Pricing y Upgrade Wizard.
  - **Jerarquía Comercial por Progresión de Precios**: ordenación natural de planes por `amount_minor ASC` en backend y frontend (`One-time → Individual → Team → Enterprise → Lifetime`), eliminando dependencias de órdenes fijos artificiales.
  - **Clasificación Comercial Flexible vs Workspace** ([pricing/index.tsx](/src/views/pages/pricing/index.tsx)): `Flexible access` agrupa exclusivamente pases de acceso puntual temporales (`duration_seconds !== null`), mientras que `Workspace plans` aloja suscripciones recurrentes y planes de acceso permanente vitalicio (`Lifetime` sin expiración).
  - **Gestión de Dirección Residencial y Fiscal en Ajustes** ([personal-info.tsx](/src/views/pages/user-settings/general/personal-info.tsx)): nuevos campos para Dirección Línea 1, Línea 2, Ciudad, Estado/Provincia y Código Postal con persistencia en `auth.user_metadata` mediante `PATCH /api/user/profile`.
  - **Precarga y Fallback Automático en Asistente de Compra**: el Paso 2 del wizard autocompleta al 100% nombre, apellidos, teléfono, país y dirección completa aprovechando la metadata del usuario y `getCheckoutContext`.
  - **Badges de transición de plan**: etiquetas dinámicas en cada tarjeta (`Plan actual / Renovar`, `Upgrade ⬆️`, `Downgrade 🔻`) y desglose claro de la operación en el resumen de orden.
  - **Garantía contra doble cobro en Stripe**: al activarse la nueva suscripción en el webhook, se cancela automáticamente la suscripción previa en Stripe del owner anterior para desvincular sus cargos recurrentes.
  - **Notificación por email al Propietario (Owner)** ([purchase-notification-email.ts](/src/features/billing/purchase-notification-email.ts)): notificación automática por Resend a los owners del tenant informando la transacción delegada, los nuevos límites y confirmando que el rol de Owner permanece inalterado.
  - **GET /api/billing/checkout/context** ([route.ts](/src/app/api/billing/checkout/context/route.ts)): contexto de compra liviano (`getCheckoutContext` en [service.ts](/src/features/billing/service.ts)) con perfil, catálogo de planes, plan actual, autorización de compra del workspace y dirección de facturación guardada.
  - **POST /api/billing/checkout/address** ([route.ts](/src/app/api/billing/checkout/address/route.ts)): persiste la dirección de facturación del comprador vía `savePurchaseAddress` + RPC `upsert_billing_purchase_address` (security-definer, re-chequea `authorize_billing_checkout`, audita `billing.purchase.address.upserted`).
  - **Migración [2026-08-16T14-00-00_billing_purchase_address.sql](/supabase/migrations/2026-08-16T14-00-00_billing_purchase_address.sql)**: tabla `billing_purchase_addresses` con clave única `(user_id, workspace_id)`, `set_updated_at`, RLS restrictiva (lectura solo propia) y RPC de escritura.
  - Flujo de checkout por autorización: **dueño** reutiliza el Stripe Customer del tenant (`customer`); **delegado** (`approved_member`/`all_active_member`) usa `customer_email` con cliente de pago nuevo, sin tocar el cliente del tenant.
  - Los botones de compra de [pricing/index.tsx](/src/views/pages/pricing/index.tsx), [current-plan-section.tsx](/src/views/pages/user-settings/billing/current-plan-section.tsx) y [billing-tab.tsx](/src/views/apps/users/view/tabs/billing-tab.tsx) enrutan al wizard (`/pages/billing/upgrade?plan=<code>`).

- **Gating comercial del sidebar (candado + tag de plan real)** ([Sidebar.tsx](/src/components/layout/Sidebar.tsx), [permissions.ts](/src/configs/permissions.ts) y [navConfig.tsx](/src/configs/navConfig.tsx)):
  - Las apps del grupo **Apps** cuyo módulo no está incluido en el plan del tenant ya **no se ocultan**: se muestran atenuadas con **candado** (`LockKeyholeIcon`) y un **badge con el nombre del plan mínimo real** que las incluye (ej. `Team`), calculado dinámicamente desde el catálogo público `/api/billing/plans` ([plan-catalog.ts](/src/lib/billing/plan-catalog.ts) y [use-plan-catalog.ts](/src/hooks/use-plan-catalog.ts)).
  - El clic en una app bloqueada conduce directamente a `/pages/pricing`, en sintonía con el guard de dominio existente (`requireModuleAccess` → `redirect('/pages/pricing')` en los layouts de apps).
  - Infraestructura **genérica y gobernada por base de datos**: `MenuItem.moduleKey` en `navConfig.tsx` declara el requisito por app; `getAppItemAccess` devuelve `allowed | locked | hidden` (hidden se mantiene para items bloqueados por `capability` RBAC); sin parpadeo de candados durante la carga del snapshot de acceso.
  - `Projects` queda sujeta al módulo **`kanban`** (ruta `/apps/kanban`) e `Investigator` al módulo `investigator`, cerrando el hueco por el que `Projects` se mostraba siempre aunque el plan no la incluyera.
- **Migración SQL [2026-08-16T12-00-00_sidebar_module_gating.sql](/supabase/migrations/2026-08-16T12-00-00_sidebar_module_gating.sql)**: registra el módulo `kanban` en `public.platform_modules` (idempotente, `on conflict do nothing`). Los entitlements `modules.<key>` por plan se siguen gestionando desde `/apps/platform/billing`; al desactivarlos, el candado aparece automáticamente en el sidebar sin tocar código.
- **Documento Maestro ([PLAN_MAESTRO_IMPLEMENTACION.md](/doc/plans/PLAN_MAESTRO_IMPLEMENTACION.md))**: sección 21 *Gating comercial del sidebar* con estados del ítem, flujo de datos, requisitos de catálogo y procedimiento para incorporar apps futuras.
- **Pruebas unitarias ([sidebar-access.test.ts](/tests/config/sidebar-access.test.ts))**: estados `allowed/locked/hidden`, selección del plan mínimo (periodo mensualizado, exclusión de one-time, null sin catálogo).

### Updated

- **Pruebas legacy del sidebar migradas a la nueva semántica ([permissions.test.ts](/tests/apps/investigator/permissions.test.ts))**: los 4 tests basados en `hasAppItemPermission` (mecanismo por label del template) se reescribieron contra `getAppItemAccess`, corrigiendo referencias a ítems/grupos que ya no existen (`Orders`, `Dashboard & Layouts`) y documentando el comportamiento real: sin el módulo requerido la app **se bloquea** (`locked`), no se oculta. Se eliminó `hasAppItemAccess` de [permissions.ts](/src/configs/permissions.ts), reemplazada por `getAppItemAccess` en el sidebar (sin importadores restantes).

### Fixed

- **URL del endpoint de trial en [pricing/index.tsx](/src/views/pages/pricing/index.tsx)**: el botón *Start free trial* apuntaba a `/api/billing/trial/start` (inexistente) en lugar de `/api/billing/access/trial`; ahora usa la ruta real.
- **Nuevo error `TRIAL_ALREADY_USED`** ([errors.ts](/src/features/billing/errors.ts)): `start_trial` reutiliza el grant histórico del tenant, así que un estado distinto de `active`/`pending` devuelve `billing.trialAlreadyUsed` en vez de un genérico `TRIAL_UNAVAILABLE`.
- **Aplicación de la migración pendiente y grant a `authenticated`** ([2026-08-16T14-00-00_billing_purchase_address.sql](/supabase/migrations/2026-08-16T14-00-00_billing_purchase_address.sql)): la migración no estaba aplicada en la BD de Supabase, por lo que `GET /api/billing/checkout/context` fallaba con 500 `billing.internalError` (relación `billing_purchase_addresses` inexistente). Se aplicó vía Management API y se añadió `grant select ... to authenticated` (la convención del repo) para que la lectura por sesión (PostgREST) funcione; las escrituras siguen solo por el RPC security-definer.

### Updated

- **Wizard de upgrade adaptado al diseño de alta fidelidad "Basic Icons - Horizontal"** ([index.tsx](/src/views/pages/billing/upgrade/index.tsx)):
  - **Layout de ancho completo (`w-full`)**: se eliminó la restricción `max-w-4xl` para que la vista del asistente ocupe naturalmente toda el área central del diseño junto al resto de módulos del ERP, envuelto en un contenedor principal limpio con paddings responsivos.
  - **Título y subtítulo de página**: añadidos `Upgrade Your Plan` y descripción contextual, eliminando etiquetas de placeholder de template.
  - **Stepper horizontal con iconos**: layout en línea centrado con círculos de estado activo (`bg-foreground text-background`), inactivo y completado, textos alineados a la derecha del icono y separadores `ChevronRightIcon`.
  - **Tarjetas de planes verticales centradas (Paso 3)**: grid responsivo con nombre superior, descripción centrada, precio grande centrado (`$XX /unidad`) e indicador de radio circular centrado en la base con borde destacado al seleccionar.
  - **Footer de navegación**: botones estilizados *Previous* (outline), *Next* (foreground/background) y *Proceed to payment* (emerald-600) para redirección segura a Stripe Checkout.
- **Migración [2026-08-16T15-00-00_billing_purchase_personal_info.sql](/supabase/migrations/2026-08-16T15-00-00_billing_purchase_personal_info.sql)**: añade `first_name`, `last_name` y `mobile` a `billing_purchase_addresses` y extiende la RPC `upsert_billing_purchase_address` con los 3 parámetros nuevos (auditoría sigue sin PII: `country`, `hasStreet` y ahora `hasPersonalInfo`). Aplicada vía Management API.
- **Contexto de checkout enriquecido** ([service.ts](/src/features/billing/service.ts) y [types.ts](/src/lib/billing/types.ts)): `CheckoutProfile` ahora incluye `firstName`, `lastName`, `mobile` y `country` (desde `user_metadata` de Supabase Auth, resuelto en servidor) y `CheckoutAuthorization` incluye `workspaceName` para el paso de Account Details.

### Removed

- `hasAppItemAccess` de `src/configs/permissions.ts` (código muerto propio del feature).

### Security

- Nota de entorno: `react-doctor` no puede ejecutar su fase de lint en este proyecto (scope `full` intenta `readFileSync` incondicional de `index.html` raíz, `ENOENT` garantizado en Next.js; el mensaje "oxlint native binding not found" es un header genérico de sus workers). El resto del análisis se ejecuta con `npx react-doctor@latest --no-lint` (dead-code, supply-chain y security scan: 515 archivos). Los 24 warnings de mantenibilidad (`deslop/unused-export` ×16, `deslop/unused-file` ×8) y el warning de seguridad (`tenant-static-proxy-risk` en `src/app/api/workspace/avatar/route.ts:92`) son preexistentes.

## v0.0.5 (2026-08-14)

### Added

- **Arquitectura Unificada y Dinámica de Módulos, Planes y Pricing ([billing/index.tsx](/src/views/apps/platform/billing/index.tsx) y [pricing/index.tsx](/src/views/pages/pricing/index.tsx))**:
  - Transformación de la pestaña **Módulos** en el panel de administración (`/apps/platform/billing`), incorporando la columna interactiva de *Planes que lo incluyen* con badges en tiempo real de los planes comerciales que tienen habilitado cada módulo del catálogo (`public.platform_modules`).
  - Rediseño integral del modal de creación y edición de planes en la pestaña **Catálogo de Planes**, sustituyendo la digitación manual de claves técnicas por un **Selector Inteligente de Módulos y Límites**:
    - Toggles visuales por cada aplicación activa de NovaStore (*App Investigator*, *App Kanban*, etc.) que gestionan automáticamente los entitlements `modules.<key>`.
    - Atajos rápidos con un solo clic para añadir límites comunes de plataforma (*Investigaciones activas*, *Exportaciones PDF/mes*, *Almacenamiento*, *Colaboradores*, *Equipos*, *Proyectos Kanban*, *Tareas Kanban*).
    - Soporte completo para agregador manual de claves para entitlements técnicos avanzados.
  - Motor de agrupación y renderizado dinámico en la página pública de precios ([`pricing/index.tsx`](/src/views/pages/pricing/index.tsx)), clasificando automáticamente las aplicaciones y límites configurados en la base de datos sin necesidad de tocar código ante la adición de nuevos módulos al ecosistema.

- **Integración de Logotipos Corporativos Oficiales de NovaStore ([logo.tsx](/src/assets/svg/logo.tsx), [Sidebar.tsx](/src/components/layout/Sidebar.tsx) y [delegation-email.ts](/src/features/billing/delegation-email.ts))**:
  - Incorporación de los logotipos oficiales de NovaStore en `public/images/brands/`:
    - `novastore_icon_logo_color.png`: Versión multicolor para **Light Mode** y correos transaccionales (notificaciones de compras y bienvenida).
    - `novastore_icon_logo_gray.png`: Versión monocromática para **Dark Mode**, en armonía con la paleta minimalista de shadcn/ui.
  - Actualización del componente reactivo [`<Logo />`](/src/assets/svg/logo.tsx) con conmutación automática de tema claro/oscuro (`dark:hidden` / `dark:block`).
  - Actualización de plantillas de correo de delegación de compras ([`delegation-email.ts`](/src/features/billing/delegation-email.ts)) e invitaciones ([`invitation-email.ts`](/src/features/users/invitation-email.ts)) para enlazar directamente el isotipo en color.
- **Motor 100% Dinámico de Presentación de Planes y Límites por Aplicación ([pricing/index.tsx](/src/views/pages/pricing/index.tsx))**:
  - Desacoplamiento total de códigos o nombres de planes fijos (`basic`, `team`, etc.).
  - Motor reactivo gobernado por la base de datos que renderiza exclusivamente las capacidades (`features`) y límites cuantitativos (`limits`) configurados en `public.plan_entitlements` mediante el módulo de administración (`/apps/platform/billing`).
  - Agrupación automática por aplicaciones del ecosistema:
    - 🔍 **App Investigator**: Creación de matrices estratégicas (EFI, EFE, DAFO, CAME, QSPM), límite dinámico de investigaciones activas simultáneas, exportaciones de informes en PDF al mes y almacenamiento en la nube (en MB/GB).
    - 📋 **App Kanban**: Tableros ágiles, iniciativas CAME, proyectos y tareas dinámicas.
    - 🏢 **Espacio de Trabajo & Equipos**: Límite de colaboradores por workspace y equipos de trabajo (*Teams*).
  - Formateo dinámico de unidades y etiquetas en tiempo real sin requerir cambios de código ante la creación o edición de planes.
- **Resolución Completa de Colaboradores y Notificaciones por Correo en Delegación de Compras ([service.ts](/src/features/billing/service.ts), [delegation-email.ts](/src/features/billing/delegation-email.ts) y [purchase-delegation-section.tsx](/src/views/pages/user-settings/billing/purchase-delegation-section.tsx))**:
  - Corrección de la consulta de perfiles solicitando exclusivamente columnas existentes en `public.profiles` (`id, display_name, avatar_url, status`) e hidratación segura de correos electrónicos vía `auth.admin.getUserById`, solventando el fallo SQL `42703 (column profiles.email does not exist)`.
  - Migración SQL correctiva [`2026-08-15T18-00-00_fix_purchase_delegation_rpc_ambiguity.sql`](/supabase/migrations/2026-08-15T18-00-00_fix_purchase_delegation_rpc_ambiguity.sql) añadiendo `#variable_conflict use_column` y alias explícitos en `grant_billing_purchase_delegation` y `revoke_billing_purchase_delegation`, eliminando la ambigüedad de columnas PostgreSQL (`ERROR 42702`).
  - Envío automático de correo transaccional de notificación (`sendPurchaseDelegationEmail`) al colaborador autorizado (informando nombre de quien autoriza, nombre del espacio de trabajo, facultades concedidas y botón directo a `/pages/pricing`).
  - Resolución dinámica del identificador de workspace en el frontend para poblar el selector de miembros elegibles de forma inmediata y reactiva.
- **Panel Interactivo de Delegación de Compras ([purchase-delegation-section.tsx](/src/views/pages/user-settings/billing/purchase-delegation-section.tsx))**:
  - Implementación visual interactiva para la política de compra `Owner & Specifically Delegated Members` (`approved_members`) en `/pages/user-settings?setting=billing`.
  - Selector de colaboradores del espacio de trabajo con visualización de avatar, nombre y correo.
  - Concesión de capacidad de compra delegada mediante `POST /api/billing/purchase-delegations`.
  - Lista de colaboradores autorizados con tarjeta de usuario enriquecida, fecha de delegación y botón para revocar la autorización (`DELETE /api/billing/purchase-delegations/[id]`).
- **Soporte de Etiquetas (`tags`) y Categorización Multidimensional en Equipos ([2026-08-15T13-50-00_teams_tags_column.sql](/supabase/migrations/2026-08-15T13-50-00_teams_tags_column.sql))**:
  - Migración SQL agregando `tags text[] NOT NULL DEFAULT '{}'` a `public.teams`.
  - Gestor de etiquetas interactivo con badges y soporte de teclado (`Enter`/coma) en [`CreateTeamDialog`](/src/views/pages/user-settings/workspace/team/create-team-dialog.tsx) y [`EditTeamDialog`](/src/views/pages/user-settings/workspace/team/edit-team-dialog.tsx).
  - Persistencia de etiquetas en `/api/teams` y `/api/teams/[id]`.
  - Hidratación relacional de miembros asignados (`team_members` con `profiles`) y etiquetas reales de cada equipo en [`/api/user/profile-overview`](/src/app/api/user/profile-overview/route.ts), renderizando avatares apilados y badges de tags en la pestaña de Teams del perfil de usuario ([`teams/index.tsx`](/src/views/pages/user-profile/teams/index.tsx)).
- **Visibilidad y Colaboración de Perfiles en el Tenant ([2026-08-15T13-00-00_profiles_tenant_read_policy.sql](/supabase/migrations/2026-08-15T13-00-00_profiles_tenant_read_policy.sql))**: Implementada y aplicada la política de seguridad RLS `profiles_select_tenant_members` en `public.profiles` para permitir que los miembros de una misma organización puedan ver los nombres y avatares mutuos en asignaciones de equipos (`teams`), proyectos e investigaciones.
- **Edición Completa de Datos de Equipos ([edit-team-dialog.tsx](/src/views/pages/user-settings/workspace/team/edit-team-dialog.tsx))**: Modal interactivo para actualizar nombre, slug, descripción y logotipo del equipo (con compresión client-side WebP) integrado en el menú de opciones de cada tarjeta en `workspace-teams.tsx`.
- **Gobernanza y Gestión de Miembros de Equipos ([manage-team-members-dialog.tsx](/src/views/pages/user-settings/workspace/team/manage-team-members-dialog.tsx), [members/route.ts](/src/app/api/teams/[id]/members/route.ts) y [teams/[id]/route.ts](/src/app/api/teams/[id]/route.ts))**: Modal interactivo de asignación de miembros por equipo en `/pages/user-settings?setting=workspace`, con selector de colaboradores de la organización, asignación y cambio de roles (`Líder`, `Admin`, `Miembro`), remoción de miembros y eliminación de equipos con confirmación.
- **Capacidades RBAC de Equipos ([capabilityManifest.ts](/src/features/access/capabilityManifest.ts))**: Declaración formal de capacidades funcionales `teams.read`, `teams.create`, `teams.update`, `teams.members.manage` y `teams.delete` con asignación predeterminada a roles `owner` y `admin`.
- **Actualización de Documento Maestro ([PLAN_MAESTRO_NOVASTORE_FULL_2026-08-07.md](/doc/plans/PLAN_MAESTRO_NOVASTORE_FULL_2026-08-07.md))**: Decisiones 19 y 20 incorporando gobernanza de equipos y arquitectura de URLs jerárquicas contextuales `/[tenant]/[workspace]/[team]/...`.
- **Documento Maestro de Rutas Jerárquicas y Equipos ([PLAN_MAESTRO_RUTAS_JERARQUICAS_Y_TEAMS.md](/doc/plans/PLAN_MAESTRO_RUTAS_JERARQUICAS_Y_TEAMS.md))**: Especificación arquitectónica para deep-linking multi-tenant con esquema canónico `/[tenant]/[workspace]/[team]/[app]/...`, breadcrumbs dinámicos y resolución de contexto.
- **Utilidad de Compresión y Redimensionamiento Client-Side ([image-compression.ts](/src/utils/image-compression.ts))**: Procesador visual en el navegador basado en HTML5 Canvas que ajusta automáticamente las imágenes seleccionadas (incluso fotos pesadas de 5 MB+) a una resolución óptima (512x512 para avatares, 800x800 para logos), centrado/recorte proporcional 1:1 y exportación a formato WebP optimizado (< 80 KB) con calidad 85% antes de enviarse al servidor.
- **Sincronización Reactiva Global sin F5 en Todo el Frontend**: Sistema de eventos unificado bajo el namespace canónico `novastore:*` (`novastore:profile-updated` y `novastore:workspace-updated`). Permite que la barra de navegación ([ProfileDropdown](/src/components/shared/ProfileDropdown.tsx) vía [useCurrentUser](/src/hooks/use-current-user.ts)), la cabecera de perfil ([useUserProfileData](/src/views/pages/user-profile/use-user-profile-data.tsx)), las pestañas de Teams y los formularios de configuración se actualicen instantáneamente en tiempo real al subir/eliminar avatares o modificar detalles del espacio de trabajo.
- **Purga Automática de Archivos Huérfanos en Storage ([avatar/route.ts](/src/app/api/user/avatar/route.ts) y [workspace/avatar/route.ts](/src/app/api/workspace/avatar/route.ts))**: Mecanismo de limpieza atómica previa en el servidor que elimina cualquier archivo anterior con extensiones distintas (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) antes de subir un nuevo avatar o logo, garantizando exactamente 1 archivo activo por usuario/workspace y liberando cuota de almacenamiento.

- **Aplicación Kanban (`/apps/kanban`)**: Tablero ágil para gestión de proyectos, iniciativas CAME y tareas operativas ([kanban/index.tsx](/src/views/apps/kanban/index.tsx)), con columnas dinámicas (*Backlog, In Progress, Review, Done* y columnas personalizables), modal de creación/edición de tarjetas ([card-form-dialog.tsx](/src/views/apps/kanban/components/card-form-dialog.tsx)) con selector de prioridad, portada/imagen, miembros asignados (`profiles`), fecha límite (`due_date`) y filtros por proyecto y prioridad.
- **Migración SQL de Tablero Kanban ([2026-08-14T04-00-00_kanban_foundation.sql](/supabase/migrations/2026-08-14T04-00-00_kanban_foundation.sql))**: Estructura relacional tenant-scoped y workspace-scoped para `public.kanban_columns` y `public.kanban_tasks` con políticas RLS e inicialización automática de columnas.
- **Pestaña `Teams` en User Profile (`/pages/user-profile?view=teams`)**: Rejilla responsive de 3 columnas ([teams/index.tsx](/src/views/pages/user-profile/teams/index.tsx)) con tarjetas de Workspaces (`workspaces`), avatares apilados de miembros participantes (`+N`), descripciones de área, badges temáticos y selector de favoritos.
- **Pestaña `Projects` en User Profile (`/pages/user-profile?view=projects`)**: Rejilla responsive de 3 columnas ([projects/index.tsx](/src/views/pages/user-profile/projects/index.tsx)) con expedientes de investigación estratégica (`investigations`), indicadores cuantitativos EFI/EFE, horas estimadas, barra de avance calculada en vivo con el tablero Kanban (`Tasks: X/Y • % Completed`) y acceso directo al espacio de trabajo.
- **Endpoint Consolidado de Perfil (`/api/user/profile-overview`)**: Servicio unificado que recopila de forma reactiva y tenant-scoped los datos de identidad (`profiles`), colegas del tenant (`memberships`), equipos (`workspaces`), proyectos (`investigations`), métricas de tareas (`kanban_tasks`) y línea de tiempo de auditoría (`audit_logs`).
- **Dashboard Estratégico de Investigaciones (`/dashboard/investigations`)**: Centro de mando y analítica multiexpediente para NovaInvestigator ([dashboard/investigations/page.tsx](/src/app/(pages)/dashboard/investigations/page.tsx)) con redirección canónica permanente (308) a nivel de servidor en [`next.config.ts`](/next.config.ts), integrando KPIs consolidados (total de expedientes, EFI/EFE promedio, tasa de avance CAME).

### Updated

- **Rediseño Integral de UX/UI en el Diálogo de Asignación de Miembros de Equipos ([manage-team-members-dialog.tsx](/src/views/pages/user-settings/workspace/team/manage-team-members-dialog.tsx))**:
  - Eliminación de UUIDs técnicos en el selector cerrado, sustituidos por la representación visual canónica: avatar circular y nombre completo (*"Daniel Treasure Espinosa"*).
  - Distribución responsive en cuadrícula de 12 columnas (6 col para usuario, 3 col para rol en español con íconos temáticos y 3 col para el botón `+ Añadir`).
  - Despliegue de menús flotantes hacia abajo (`side="bottom"` y `alignItemWithTrigger={false}`) evitando solapamientos con controles adyacentes.
  - Corrección de la alineación del chevron en el selector de usuarios y normalización de la separación horizontal de botones de acción (`gap-2.5`) en [`CreateTeamDialog`](/src/views/pages/user-settings/workspace/team/create-team-dialog.tsx) y [`EditTeamDialog`](/src/views/pages/user-settings/workspace/team/edit-team-dialog.tsx).

- **Suite de Pruebas Automatizadas con TestSprite MCP y Validación de Producción (`next build` & `next start`)**:
  - Compilación exitosa del bundle de producción de Next.js 16 con Turbopack para las 101 rutas del sistema con estricta conformidad de TypeScript.
  - Levantamiento del servidor de producción multihilo en el puerto `4101` para soportar alta concurrencia de pruebas E2E.
  - Ejecución de la suite de pruebas TestSprite (18 casos generados en Playwright) cubriendo autenticación, 2FA/TOTP con códigos de respaldo, cambio de contraseñas, persistencia de Workspaces/Logos en Supabase Storage, creación de Teams y vistas de perfil.
  - Generación del reporte consolidado [testsprite-mcp-test-report.md](/testsprite_tests/testsprite-mcp-test-report.md) estructurado en 4 secciones normativas.
- **Eliminación Total de Datos Mock y Fallbacks Sintéticos en User Profile ([profile-overview/route.ts](/src/app/api/user/profile-overview/route.ts))**:
  - Eliminados todos los valores hardcoded y datos ficticios (`La Habana, Cuba`, `(+53) 5 123-4567`, `Español, English`, `investigador.novasuite`, tags fijos, estadísticas sintéticas y proyectos/eventos mock inyectados cuando las tablas estaban vacías).
  - Los componentes de la interfaz de usuario ([`ProjectsTab`](/src/views/pages/user-profile/projects/index.tsx), [`TeamsTab`](/src/views/pages/user-profile/teams/index.tsx), [`ConnectionsCard`](/src/views/pages/user-profile/connections/index.tsx), [`ActivityTimeline`](/src/views/pages/user-profile/profile/activity-timeline.tsx) y [`AboutSection`](/src/views/pages/user-profile/profile/about-section.tsx)) ahora presentan exclusivamente datos reales autenticados de Supabase o sus estados vacíos nativos legítimos (*"No hay proyectos registrados"*, *"No registrado"*, *"No especificado"*).
- **Refactorización Integral de Calidad de Código y Cero `as any` (Estándar [skills.sh](https://skills.sh))**:
  - Eliminación total de casts `as any` en todo el repositorio (`src/`), adoptando tipado estricto en la capa de datos de Supabase y Prisma.
  - Creado [`src/features/kanban/db-types.ts`](/src/features/kanban/db-types.ts) con tipado exhaustivo de esquemas para tablas `kanban_columns` y `kanban_tasks` y el cliente fuertemente tipado `asKanbanClient(supabase)`.
  - Refactorizadas las rutas API [`/api/kanban`](/src/app/api/kanban/route.ts), [`/api/kanban/tasks`](/src/app/api/kanban/tasks/route.ts), [`/api/kanban/tasks/[id]`](/src/app/api/kanban/tasks/%5Bid%5D/route.ts), [`/api/user/profile-overview`](/src/app/api/user/profile-overview/route.ts), [`/api/user/account`](/src/app/api/user/account/route.ts) y [`/api/user/account/summary`](/src/app/api/user/account/summary/route.ts).
  - Corregido el tipado de visualizaciones del Dashboard ([positioning-matrix.tsx](/src/views/dashboards/investigations/components/positioning-matrix.tsx), [recent-investigations-table.tsx](/src/views/dashboards/investigations/components/recent-investigations-table.tsx), [investigation-summary-sheet.tsx](/src/views/dashboards/investigations/components/investigation-summary-sheet.tsx), [came-actions-chart.tsx](/src/views/dashboards/investigations/components/came-actions-chart.tsx) y [factors-distribution-chart.tsx](/src/views/dashboards/investigations/components/factors-distribution-chart.tsx)) consumiendo interfaces nativas del dominio (`Quadrant`, `CameEnrichedAction`).
- **Estandarización Jerárquica del Bucket de Almacenamiento `avatars` ([avatar/route.ts](/src/app/api/user/avatar/route.ts))**:
  - Reorganizada la ruta de almacenamiento de avatares de usuario al espacio aislado `users/${user.id}/avatar.${fileExt}` (con fallback a `/uploads/users/`), unificando la jerarquía con `workspaces/${workspace.id}/logo.${fileExt}` y `teams/${teamId}/avatar.${fileExt}` para total aislamiento Multi-tenant y Multi-workspace.

- **Reubicación de Email & Password en la pestaña Seguridad ([security/index.tsx](/src/views/pages/user-settings/security/index.tsx) y [general/index.tsx](/src/views/pages/user-settings/general/index.tsx))**: Trasladada la sección de gestión de correo electrónico, cambio de contraseña y recuperación de contraseña desde la pestaña *General* hacia la pestaña *Seguridad* (junto a Two-Factor Authentication / 2FA), unificando todos los controles de acceso y credenciales de usuario.
- **Persistencia Integral de Workspace, Teams y Logos en Supabase Storage ([workspace](/src/app/api/workspace) y [teams](/src/app/api/teams))**:
  - Creada y ejecutada la migración SQL ([2026-08-14T21-30-00_workspace_teams_schema.sql](/supabase/migrations/2026-08-14T21-30-00_workspace_teams_schema.sql)) incorporando `avatar_url`, `description` y `timezone` en `workspaces`, `logo_url` y `description` en `tenants`, y creando las tablas relacionales `teams` y `team_members` con RLS y políticas de Supabase Storage.
  - Implementados los endpoints `GET`/`PATCH` `/api/workspace` y `POST`/`DELETE` `/api/workspace/avatar` para carga y actualización en tiempo real de nombre, App ID, timezone, slug, descripción y logo del espacio de trabajo con límite estricto de 500 KB.
  - Conectadas las vistas de configuración ([workspace-name.tsx](/src/views/pages/user-settings/workspace/workspace-name.tsx) y [workspace-detail.tsx](/src/views/pages/user-settings/workspace/workspace-detail.tsx)) y la pestaña de equipos ([teams/index.tsx](/src/views/pages/user-profile/teams/index.tsx)) con la base de datos real y Skeletons de carga.
- **Arquitectura de Avatares con Supabase Storage y Límite de 500KB ([avatar/route.ts](/src/app/api/user/avatar/route.ts) y [personal-info.tsx](/src/views/pages/user-settings/general/personal-info.tsx))**: Implementado el almacenamiento en la nube en el bucket público `avatars` de Supabase Storage con límite estricto de **500 KB** por archivo (PNG, JPG, WebP, GIF), persistencia de URLs públicas cortas (~80 bytes) en `profiles.avatar_url`, aislamiento completo de `user_metadata` en Supabase Auth y fallback local automático.
- **Eliminación definitiva de datos demo (`fake-db`) en User Profile (`/pages/user-profile`)**: Reemplazo total por datos vivos de Supabase Auth, profiles y memberships en las 4 pestañas: *Profile, Teams, Projects y Connections*.
- **Rediseño de la pestaña `Connections` (`/pages/user-profile?view=connections`)**: Rejilla de tarjetas de colegas del tenant ([connections/index.tsx](/src/views/pages/user-profile/connections/index.tsx)) con avatar centrado, rol institucional, badges de competencias, métricas verticales (Projects, Tasks de Kanban, Connections) y botón de enlace directo por correo (`MailIcon`).
- **Header Unificado de User Profile ([index.tsx](/src/views/pages/user-profile/index.tsx))**: Despliegue de avatar real, nombre completo (`profiles.display_name`), cargo institucional (`institutional.role`), tenant activo y fecha de registro formateada.
- **Reactivación del enlace Kanban en el menú lateral ([navConfig.tsx](/src/configs/navConfig.tsx))**: Ubicado en el grupo **Apps** y enlazado a las rutas locales del User Profile.
- Reubicación de los módulos **Users** y **Roles & Permissions** en el grupo **Platform** ([navConfig.tsx](/src/configs/navConfig.tsx) y [permissions.ts](/src/configs/permissions.ts)), restringiendo su visibilidad y acceso exclusivamente a Super Admins (`sa`) y Administradores de Tenant (`admin` / `owner`) mediante validación estricta de capacidades (`users.invite`, `access.manage`), dejando el grupo **Apps** reservado para el software de negocio (`Investigator`).
- **Matriz de Posicionamiento Estratégico Cuadrangular (EFI vs EFE / Matriz IE)**: Gráfico interactivo con Recharts ([positioning-matrix.tsx](/src/views/dashboards/investigations/components/positioning-matrix.tsx)) que clasifica cada expediente en los cuadrantes FO (Ofensivo), DO (Adaptativo), FA (Defensivo) y DA (Supervivencia).
- **Módulos Analíticos de Balance DAFO y Monitor CAME**: Visualizaciones de distribución de fortalezas, debilidades, oportunidades y amenazas ([factors-distribution-chart.tsx](/src/views/dashboards/investigations/components/factors-distribution-chart.tsx)) y desglose de iniciativas operativas por tipología CAME y prioridad ([came-actions-chart.tsx](/src/views/dashboards/investigations/components/came-actions-chart.tsx)).
- **Sheet Lateral de Dictamen Académico y Plan CAME (`InvestigationSummarySheet`)**: Formato editorial y metodológico ([investigation-summary-sheet.tsx](/src/views/dashboards/investigations/components/investigation-summary-sheet.tsx)) estructurado para sustentación de tesis y reportes de investigación, con prosa explicativa de matrices EFI/EFE, justificación de la decisión QSPM y plan de intervención CAME detallado (acciones, objetivos, responsables, metas e indicadores).
- **Feed Central de Expedientes**: Tabla interactiva con búsqueda en tiempo real, badges semánticos de orientación y acceso directo a cada etapa de análisis ([recent-investigations-table.tsx](/src/views/dashboards/investigations/components/recent-investigations-table.tsx)).
- Soporte para planes de pago único **Lifetime** (vitalicios con acceso permanente sin expiración) y planes de pago único **Temporales** (acceso de 24h u otra duración configurable en horas/días por el Super Admin).
- Migración SQL forward-only ([2026-08-14T03-00-00_plan_duration_seconds.sql](/supabase/migrations/2026-08-14T03-00-00_plan_duration_seconds.sql)) que añade `duration_seconds` a la tabla `public.plans`.
- Interfaz en el panel de administración ([platform/billing](/src/views/apps/platform/billing/index.tsx)) para configurar el tipo de acceso único (*Lifetime* vs *Temporal*) y la cantidad de horas asignadas.
- Renderizado de badges diferenciados (*Lifetime* / *24h pass*) y etiquetas dinámicas en la página de precios ([pricing/index.tsx](/src/views/pages/pricing/index.tsx)).
- Activación dinámica de grants en el webhook de Stripe ([service.ts](/src/features/billing/service.ts)), calculando `expiresAt` con base en `duration_seconds` del plan comprado o dejándolo `null` para compras vitalicias.
- Reubicación de los módulos **Users** y **Roles & Permissions** en el grupo **Platform** ([navConfig.tsx](/src/configs/navConfig.tsx) y [permissions.ts](/src/configs/permissions.ts)), restringiendo su visibilidad y acceso exclusivamente a Super Admins (`sa`) y Administradores de Tenant (`admin` / `owner`) mediante validación estricta de capacidades (`users.invite`, `access.manage`), dejando el grupo **Apps** reservado para el software de negocio (`Investigator`).
- Actualización de la documentación maestra en [`PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md`](/doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md) (Sección 9.23: Gobernanza del Shell y acceso administrativo) y saneamiento de duplicaciones en [`PLAN_MAESTRO_IMPLEMENTACION.md`](/doc/plans/PLAN_MAESTRO_IMPLEMENTACION.md).
- Inactivadas las secciones demo restantes en el menú de navegación lateral ([navConfig.tsx](/src/configs/navConfig.tsx)) desde *Reset Password / Two Steps* y *Error Pages* hasta *Forms & Tables*, *Components & Charts* y *Miscellaneous*, dejando activo únicamente el árbol operativo funcional de NovaStore ERP.
- Inactivada la inyección de aplicaciones demo externas (`PropXYZ`, `CommerceD`, etc.) en el Sidebar ([Sidebar.tsx](/src/components/layout/Sidebar.tsx)), preservando intacta la infraestructura subyacente para futuras aplicaciones y módulos dinámicos del ecosistema NovaStore ERP.
- Ampliación del ancho del **Sheet Lateral de Dictamen Metodológico y Plan CAME** a `max-w-5xl` ([investigation-summary-sheet.tsx](/src/views/dashboards/investigations/components/investigation-summary-sheet.tsx) y [sheet.tsx](/src/components/ui/sheet.tsx)), permitiendo una lectura editorial cómoda y espaciosa sin colisiones en pantalla.
- Rediseño de la **Matriz de Posicionamiento Estratégico** ([positioning-matrix.tsx](/src/views/dashboards/investigations/components/positioning-matrix.tsx)), eliminando textos flotantes superpuestos en los ejes, integrando micro-fondos y etiquetas centradas con `ReferenceArea` nativo de Recharts, fijando la escala metodológica estricta `1.00 - 4.00` (con ticks legibles cada 0.5) y ampliando márgenes de respiración para los ejes X e Y.
- Reorganización de la UI del diálogo de edición de planes comerciales ([platform/billing](/src/views/apps/platform/billing/index.tsx)) con disposición compacta de identidad (Código y Nombre en 2 columnas), fila comercial unificada (Precio, Intervalo de Cobro y Moneda en 3 columnas) y controles de acceso temporal lado a lado.
- Rediseño de la barra de herramientas y filtro de la pestaña **Facturas de Billing** ([platform/billing](/src/views/apps/platform/billing/index.tsx)), integrando contador de resultados, etiqueta horizontal (`Filtrar por tenant:`), selector de ancho adaptado (`w-full`) y etiquetas formateadas en español ("Todos los tenants").
- Mejora del selector de tenant en la pestaña **Entitlements** con ancho simétrico y etiquetas formateadas.
- Actualización de los enlaces de **User Settings** en el sidebar ([navConfig.tsx](/src/configs/navConfig.tsx)) apuntando a las rutas internas reales (`/pages/user-settings?setting=...`), eliminando URLs externas de plantilla y comentando los módulos futuros de Notificaciones e Integraciones.
- Rediseño lineal de la sección **Usage & Limits** ([usage-limits-section.tsx](/src/views/pages/user-settings/billing/usage-limits-section.tsx)) con barras de progreso continuas a ancho completo, divisores sutiles (`divide-y`) y desglose claro de consumo versus capacidad incluida.

### Fixed

- **Control de Acceso Comercial y Blindaje en 3 Capas para App Kanban ([apps/kanban/layout.tsx](/src/app/(pages)/apps/kanban/layout.tsx) y [/api/kanban/*](/src/app/api/kanban))**:
  - Implementado `KanbanLayout` con el guardián de ruta `requireModuleAccess('kanban')`, redirigiendo automáticamente a `/pages/pricing` si el plan activo del tenant no incluye el módulo `modules.kanban`.
  - Protegidos los Route Handlers (`/api/kanban`, `/api/kanban/tasks`, `/api/kanban/tasks/[id]`) con `requireModuleAccess('kanban')`, garantizando que únicamente tenants con planes comerciales habilitados puedan consultar o manipular tableros ágiles e iniciativas CAME.

- **Soporte de Cuotas Ilimitadas y Corrección de Validación de Entitlements en Planes Comerciales ([admin-service.ts](/src/features/billing/admin-service.ts) y [entitlements.ts](/src/lib/billing/entitlements.ts))**:
  - Flexibilizada la validación `validatePlanEntitlements` para admitir `limitValue: null` (acceso ilimitado) en planes comerciales como *Lifetime* o *Enterprise*, solventando el error HTTP 400 (*"El límite ... requiere un valor entero"*).
  - Actualizado el reconocedor de límites canónicos `isLegacyLimitKey` para soportar sufijos `_max` (`kanban.projects_max`, `kanban.tasks_max`).
  - Unificada la clave canónica del módulo Kanban en `public.platform_modules` como `kanban`.

- **Resolución de Error 500 al Guardar Módulos de Plataforma ([admin-service.ts](/src/features/billing/admin-service.ts))**: Corregida la inserción de registros de auditoría (`public.audit_logs`) en la creación y edición de módulos de plataforma (`public.platform_modules`). Al ser `module_key` una clave alfanumérica (tipo `text`) y la columna `audit_logs.entity_id` de tipo `UUID`, PostgreSQL generaba el error `22P02 (invalid input syntax for type uuid: "investigator")`. Se ajustó para enviar `entity_id = null` e incluir la clave del módulo en `metadata: { module_key }`, permitiendo que las actualizaciones de módulos se confirmen inmediatamente con éxito (HTTP 200) y sin errores en los toasts de la interfaz.
- **Políticas RLS de Modificación para Workspaces y Tenants ([2026-08-14T23-00-00_workspaces_tenants_update_policies.sql](/supabase/migrations/2026-08-14T23-00-00_workspaces_tenants_update_policies.sql))**: Ampliadas las políticas de seguridad RLS `workspaces_update_managed` y `tenants_update_managed` en PostgreSQL, permitiendo a los creadores, administradores y miembros activos del tenant actualizar los datos y logos de sus respectivos workspaces y tenants sin bloqueos de permisos.
- **Aprovisionamiento Automático de Perfiles y Blindaje de Persistencia ([2026-08-14T22-30-00_handle_new_user_trigger.sql](/supabase/migrations/2026-08-14T22-30-00_handle_new_user_trigger.sql), [avatar/route.ts](/src/app/api/user/avatar/route.ts) y [profile/route.ts](/src/app/api/user/profile/route.ts))**: Creado el trigger automático `handle_new_user` en PostgreSQL para que todo usuario registrado en `auth.users` genere inmediatamente su fila en `public.profiles`. Sincronizado el perfil y avatar existente de Daniel desde Supabase Storage, y actualizados los endpoints de backend para emplear operaciones defensivas `.upsert()`.
- **Habilitación de Política RLS de Actualización en Perfiles ([2026-08-14T22-00-00_profiles_update_policy.sql](/supabase/migrations/2026-08-14T22-00-00_profiles_update_policy.sql))**: Creada la política `profiles_update_own` en `public.profiles` (`USING (id = auth.uid()) WITH CHECK (id = auth.uid())`) permitiendo a cualquier usuario autenticado actual o futuro actualizar su propia información y avatar de forma persistente y segura.
- **Saneamiento de Metadatos de Usuario en Supabase Auth ([scripts/clean-user-metadata.ts](/scripts/clean-user-metadata.ts))**: Ejecutada la purga de más de 67 KB de cadenas Base64 residuales almacenadas en `raw_user_meta_data` en las cuentas de usuario afectadas, resolviendo de raíz los timeouts de 15s y errores 500 durante la generación y firma de tokens JWT al iniciar sesión.
- **Mapeo Robusto de Errores de Autenticación de Supabase y Estandarización de `logger` ([supabase-auth-errors.ts](/src/app/api/auth/_lib/supabase-auth-errors.ts) e [http.ts](/src/app/api/auth/_lib/http.ts))**: Mapeados los códigos estándar `invalid_grant` y variantes de mensajes (`Invalid login credentials`) a `AuthError.invalidCredentials()`, evitando que credenciales incorrectas se transformen erróneamente en errores internos 500 (*temporary server problem*), y migrado el registro de diagnósticos al logger estructurado canónico [`logger`](/src/lib/logger/index.ts) cumpliendo la política estricta de 0 `console.*` con saneamiento automático de PII.
- **Resolución de Error 500 y Optimización de Inicio de Sesión ([login/route.ts](/src/app/api/auth/login/route.ts) y [rate-limit.ts](/src/app/api/auth/_lib/rate-limit.ts))**: Corregido el error que desautenticaba e interrumpía el login de usuarios ya registrados (al esperar erróneamente un registro pendiente en `completePendingRegistration`), y agregado un temporizador de seguridad defensivo de 2 segundos en el rate limiting para evitar bloqueos prolongados si la RPC de base de datos tiene latencia.
- **Habilitación de Orígenes de Red Local y Eliminación de Advertencia de Metadatos ([next.config.ts](/next.config.ts) y [layout.tsx](/src/app/layout.tsx))**: Añadidos los rangos `10.2.0.2` y `10.*.*.*` en `allowedDevOrigins` para permitir desarrollo sin bloqueos cross-origin desde la red local, y configurada la propiedad `metadataBase` en el layout raíz.
- **Seguridad en Formularios de Autenticación y Sanitización de Credenciales en URL ([auth](/src/views/pages/auth))**: Corregido el riesgo de exposición de contraseñas en URL (originado cuando el navegador aplicaba el método HTML por defecto `GET` si el submit ocurría antes de hidratar o ante una recarga) fijando explícitamente `method="POST" action="#"` en todos los formularios de acceso ([login-form.tsx](/src/views/pages/auth/login/login-form.tsx), [register-form.tsx](/src/views/pages/auth/register/register-form.tsx), [reset-password-form.tsx](/src/views/pages/auth/reset-password/reset-password-form.tsx), [two-steps-form.tsx](/src/views/pages/auth/two-steps/two-steps-form.tsx)) y agregando una rutina de sanitización inmediata que purga parámetros sensibles del historial de navegación.
- **Resolución de Error `HTTP 431 Request Header Fields Too Large` ([avatar/route.ts](/src/app/api/user/avatar/route.ts) y [package.json](/package.json))**: Eliminado el almacenamiento de cadenas de imágenes en base64 dentro de `user_metadata` en Supabase Auth (el cual inflaba el JWT a cientos de kilobytes provocando que `@supabase/ssr` creara múltiples cookies fragmentadas que superaban el límite de cabeceras de Node.js) y ampliado el límite de cabeceras HTTP del servidor de desarrollo a 64KB (`--max-http-header-size=65536`).
- **Eliminación total de datos mock y sustitución por Skeletons y Empty States canónicos ([user-profile](/src/views/pages/user-profile))**: Purgados por completo los arreglos mock de `use-user-profile-data.tsx`, implementados componentes de carga pulsante (`Skeleton`) durante la consulta a la BD y agregados estados vacíos explícitos y elegantes con íconos para *Teams*, *Projects*, *Connections* y *Activity Timeline* cuando no existan registros creados en el espacio de trabajo.
- **Sincronización integral y persistencia del Avatar y Perfil de Usuario**: Corregida la persistencia en `/api/user/avatar` y `/api/user/profile` actualizando simultáneamente `profiles` y los metadatos de Supabase Auth (`user_metadata`), e integrando el despachador de eventos `novastore:profile-updated` para sincronizar en tiempo real el menú de usuario superior ([ProfileDropdown.tsx](/src/components/shared/ProfileDropdown.tsx)), la pestaña General de configuración ([personal-info.tsx](/src/views/pages/user-settings/general/personal-info.tsx)) y la vista de perfil ([user-profile](/src/views/pages/user-profile)).
- **Eliminación de error de consola `asChild` en DOM de React**: Reemplazados los atributos `asChild` incompatibles con `@base-ui/react` por la sintaxis canónica `render={<Link ... />}` y `render={<a ... />}` en [connections.tsx](/src/views/pages/user-profile/profile/connections.tsx), [teams.tsx](/src/views/pages/user-profile/profile/teams.tsx) y [connections/index.tsx](/src/views/pages/user-profile/connections/index.tsx).
- **Incorporación del componente shadcn `Calendar` ([calendar.tsx](/src/components/ui/calendar.tsx))**: Implementado el componente canónico de calendario y selector de fechas basado en `date-fns` y tokens del sistema de diseño para el modal de tarjetas Kanban ([card-form-dialog.tsx](/src/views/apps/kanban/components/card-form-dialog.tsx)), resolviendo el error `Module not found: Can't resolve '@/components/ui/calendar'` y armonizando el `PopoverTrigger` con `@base-ui/react`.
- **Restauración 100% fiel de los tokens y diseño de la plantilla AdminCN en User Profile ([user-profile](/src/views/pages/user-profile))**: Revertidos los estilos ad-hoc, eliminados los colores arbitrarios en los íconos de *About* y *Overview* (restableciendo el estilo monocromático estándar `<Icon className='size-4' />`), restaurada la tipografía (`font-medium` en lugar de `font-bold`), recuperados los paddings nativos de las tarjetas (`CardContent space-y-5`) y alineadas las pestañas *Teams*, *Projects* y *Connections* con los componentes originales (`AvatarGroup`, `Progress`, `Pagination`, `Separator`).
- Corregido error de compilación `Expected '>', got 'ident'` en Next.js Turbopack ([use-user-profile-data.tsx](/src/views/pages/user-profile/use-user-profile-data.tsx)) migrando la extensión de `.ts` a `.tsx` para el parser de componentes JSX y React Context Providers.
- Corregido error `TypeError: Cannot read properties of undefined (reading 'toFixed')` en el Dashboard de Investigaciones ([recent-investigations-table.tsx](/src/views/dashboards/investigations/components/recent-investigations-table.tsx), [positioning-matrix.tsx](/src/views/dashboards/investigations/components/positioning-matrix.tsx) y [kpi-cards.tsx](/src/views/dashboards/investigations/components/kpi-cards.tsx)) alineando el acceso al puntaje ponderado con la propiedad canónica `total` de `EfiResult` y `EfeResult` con fallbacks defensivos a cero.
- Corregido el error 400 en `PATCH /api/billing/purchase-policy` en la sección **Purchase Delegation** ([purchase-delegation-section.tsx](/src/views/pages/user-settings/billing/purchase-delegation-section.tsx)) alineando el cuerpo de la petición con la propiedad `policy`, usando el enum canónico `all_active_members`, formateando las etiquetas legibles en `SelectValue` y gestionando la autorización del workspace owner con `canManage`.

## v0.0.4 (2026-08-14)

### Added

- Estandarización completa de alertas y notificaciones con `sonner` (`toast.success` y `toast.error`) en todas las vistas de administración, usuario y formularios.

### Fixed

- Corregida la edición de precios en el modal de planes comerciales ([platform/billing/index.tsx](/src/views/apps/platform/billing/index.tsx)) para ingresar valores en unidades mayores (decimales) con conversión automática a `amountMinor`, eliminando el error `billing.validationError`.
- Resuelto el conflicto de validación en `admin-service.ts` reconociendo el entitlement comercial `investigations.export_pdf` mapeado a la capability funcional `investigations.export`, permitiendo la edición de planes como Basic e Individual.
- Reemplazados todos los llamados legacy a `window.alert()` y `alert()` por notificaciones toast de Sonner.

### Updated

- Actualizado el [Plan Maestro](/doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md) (secciones 9.9, 9.9.1, 9.16 y 12.2) especificando formalmente el soporte de planes de pago único `one_time`: modalidad **Lifetime** (`duration_seconds = null`) vs modalidad **Temporal 24h configurable** (`duration_seconds > 0`).
- Limpieza de estados redundantes de banners en `registration-cleanup`, `invitations` y `platform/billing`.

## v0.0.3 (2026-08-14)

### Added

- Completado el Centro Único multiámbito de Roles y Permissions para roles platform, globales tenant y tenant.
- Añadida la gestión explícita de capacidades tenant mediante `platform.access.capabilities.manage`, con RPC forward, locking y auditoría.

### Fixed

- El endpoint legacy de desactivación de roles ahora delega en el servicio unificado y respeta el ámbito real del rol, las capacidades y la protección del último `super_admin`.
- Aplicada la migración `unified_access_capability_manager` en Supabase; `replace_role_capabilities` ya reconoce el gestor de capacidades platform sin exponer ejecución a `anon`.
- Endurecida la policy RLS de `role_capabilities` para impedir también por inserción directa cualquier capacidad `platform.*` o `billing.plans.manage` en roles tenant/global.

### Updated

- Actualizado el plan maestro con el estado remoto de migraciones, grants, advisors y capacidades platform reales de Daniel. PR: pendiente de apertura.

## v0.0.2 (2026-08-13)

### Added

- Añadida la administración global de módulos de NovaStore, políticas de trial y entitlements de `modules.*`, `actions.*` y `limits.*` para planes y trial.
- Añadida cobertura contractual para validación de módulos, namespaces comerciales, acciones de plataforma y filtrado de módulos inactivos.

### Fixed

- Los módulos inactivos ya no producen navegación ni acceso efectivo aunque existan snapshots históricos.
- Los trials rechazan acciones `platform.*` y la lectura autenticada del catálogo global queda limitada a módulos activos.

### Updated

- Actualizado el plan maestro con el estado real de implementación, la migración de endurecimiento y las validaciones remotas pendientes. PR: pendiente de apertura.

## v0.0.1 (2026-08-12)

### Added

- Enforced minimum seven-year legal retention deadlines for audit logs, invoices, payment evidence, and VID records.
- Added irreversible post-retention VID metadata redaction without physical deletion during the legal period.
- Added an append-only, service-role-only archive manifest for expired regulated records.

### Fixed

- Retention jobs now surface database errors instead of reporting successful cleanup after a failed operation.

## v0.0.0 (2026-07-10)

### Added

#### Initial release

- Dashboard
  - Orders Dashboard
- Apps
  - Mail
  - Calendar
  - Users
- Pages
  - User Settings
  - User Profile
  - Login Page
  - Register Page
