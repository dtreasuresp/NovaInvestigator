# IMPLEMENTACIÓN CORRECTA DEL STRATEGIC EXECUTION WORKSPACE EN NOVARESEARCH

## CONTEXTO Y OBJETIVO

Necesito que revises e implementes la evolución del módulo actual de Kanban/Projects de NovaResearch.

IMPORTANTE: **no debes rediseñar ni duplicar la arquitectura existente sin revisar primero el código real del repositorio**.

Antes de modificar cualquier archivo, inspecciona la implementación actual relacionada con:

- `kanban_tasks`
- `kanban_columns`
- Investigations
- CAME
- API routes de Kanban
- vistas actuales del módulo Kanban/Projects
- herramientas de NovAi relacionadas con Kanban
- modelos y tipos existentes
- migraciones SQL relacionadas

El objetivo es evolucionar el módulo actual hacia un:

# STRATEGIC EXECUTION WORKSPACE

No queremos construir simplemente otro Jira, Linear o Monday.

NovaResearch debe permitir ejecutar estrategias derivadas de investigaciones con trazabilidad metodológica.

---

# RESTRICCIÓN ARQUITECTÓNICA CRÍTICA

El código actual ya contiene una arquitectura que debes respetar y extender.

Actualmente existe una relación similar a:

```text
kanban_tasks.project_id
        ↓
investigations.id
```

Esto significa que, en el estado actual del sistema:

```text
"Project" ≈ Investigation utilizada como contexto de ejecución
```

NO asumas que existe una entidad independiente llamada `projects`.

## PROHIBIDO

No hagas ninguna de estas cosas sin una justificación arquitectónica explícita y previa:

- Crear una tabla `projects` duplicada.
- Duplicar información existente en `investigations`.
- Crear otro sistema de CAME paralelo.
- Copiar datos de investigaciones hacia nuevas entidades innecesarias.
- Romper las relaciones existentes de Kanban.
- Cambiar IDs existentes.
- Crear mocks cuando ya existan datos reales en el backend.
- Reemplazar APIs existentes sin necesidad.

Primero reutiliza y extiende.

---

# MODELO CONCEPTUAL OBJETIVO

La arquitectura de NovaResearch debe evolucionar hacia esta trazabilidad:

```text
EVIDENCE
   ↓
STRATEGIC FACTORS
   ↓
EFI / EFE
   ↓
DAFO
   ↓
QSPM / STRATEGIC ANALYSIS
   ↓
CAME ACTION
   ↓
INVESTIGATION EXECUTION CONTEXT
   ↓
KANBAN ACTIVITY
   ↓
EXECUTION
   ↓
OUTCOME / RESULT
```

La trazabilidad debe poder navegarse en ambas direcciones.

Por ejemplo:

```text
Task
 ↓
CAME Action
 ↓
Strategic Factor
 ↓
Evidence
 ↓
Source Document
```

Y también:

```text
Evidence
 ↓
Factor
 ↓
Strategy
 ↓
CAME Action
 ↓
Execution Activities
 ↓
Execution Status
```

Este es uno de los principales diferenciadores de NovaResearch.

---

# FASE 0 — AUDITORÍA DEL REPOSITORIO

Antes de implementar, realiza una auditoría del código existente.

Debes localizar específicamente:

## 1. Kanban

Busca:

- Definición SQL de `kanban_tasks`.
- Definición SQL de `kanban_columns`.
- APIs:
  - `/api/kanban`
  - `/api/kanban/tasks`
- Componentes:
  - `kanban-board.tsx`
  - columnas
  - tarjetas
  - formularios.
- Tipos TypeScript.

## 2. Investigations

Identifica:

- Tabla.
- Campos disponibles.
- Metadata.
- Estado.
- Relaciones existentes.

## 3. CAME

LOCALIZA exactamente:

- Dónde se almacenan las acciones CAME.
- Qué estructura tienen.
- Qué ID utilizan.
- Si existe una tabla SQL.
- Si viven dentro de `state`.
- Si forman parte de una estructura JSON.
- Si existe API para obtenerlas.

IMPORTANTE:

Actualmente puede existir:

```text
kanban_tasks.came_action_id
```

pero debes verificar si este campo tiene una relación real con una entidad CAME o si actualmente es solamente una referencia textual.

No inventes una arquitectura CAME.

Encuentra la implementación real primero.

---

# FASE 1 — CORREGIR EL PROJECT / INVESTIGATION SWITCHER

Existe un problema UX donde el selector puede mostrar el UUID interno de una investigación/proyecto.

Ejemplo incorrecto:

```text
ae3d0ee9-d087-49ac...
```

Esto NUNCA debe mostrarse como nombre visual.

## Implementar

Un selector robusto.

Estados:

### Loading

Mostrar skeleton o loading state.

### Selected

Mostrar:

- Nombre real.
- Organización si existe.
- Badge de estado.

### Not Found

Mostrar:

```text
Investigation not available
```

Nunca el UUID.

### No Selection

Mostrar:

```text
All Investigations
```

o el texto correspondiente al contexto actual.

## REGLA

No depender únicamente de que el componente primitivo:

```tsx
<SelectValue />
```

resuelva automáticamente el label.

Resuelve explícitamente la entidad seleccionada desde el estado:

```ts
const selectedInvestigation =
  investigations.find(
    investigation => investigation.id === selectedId
  )
```

Utiliza el título real como representación visual.

Mantén la sincronización con:

- Estado React.
- URL params, si existen.
- Datos cargados asíncronamente.

Evita estados inconsistentes durante la carga.

---

# FASE 2 — CREAR EL STRATEGIC EXECUTION HEADER

No crear un "Project Header" genérico.

Crear:

```text
StrategicExecutionHeader
```

o un nombre equivalente consistente con el código existente.

Debe representar:

```text
Investigation
+
Strategic Execution Context
```

## Contenido

### Identidad

```text
Nombre de la Investigación
Status
Organization
```

### Objetivo estratégico

Si existe en datos reales.

No inventar un objetivo.

Si todavía no existe el campo, identifica el mejor lugar arquitectónico para almacenarlo antes de añadirlo.

### KPIs

Calcular desde datos reales:

#### Execution Progress

```text
Completed Tasks / Total Tasks
```

No hardcodear.

#### Overdue Activities

```text
Tasks where:

due_date < now
AND status != completed
```

Determina correctamente cuál columna representa "Done" según el modelo actual.

No asumir IDs.

#### Team

Derivado de:

```text
assignee_ids
```

y/o miembros reales del tenant.

#### Strategic Coverage

Si la relación CAME es verificable:

```text
CAME Actions with Activities
/
Total Selected CAME Actions
```

Si todavía no existe información suficiente, NO inventar este KPI.

---

# FASE 3 — CREAR LA NAVEGACIÓN DEL EXECUTION WORKSPACE

Crear navegación por vistas.

La estructura recomendada:

```text
Overview
Board
Activities
Strategy
Budget
```

No implementar todas las vistas con datos falsos.

Cada vista debe usar datos reales o mostrar un estado claro de:

```text
Not configured yet
```

cuando el dominio todavía no tenga soporte.

---

# VISTA 1 — OVERVIEW

Esta debe ser la vista inicial.

Actualmente abrir directamente un Kanban no ofrece una visión ejecutiva.

Crear:

```text
ExecutionOverview
```

Debe mostrar:

```text
Execution Progress
Budget Health
Overdue Activities
Team
Strategic Coverage
```

Solo incluir métricas respaldadas por datos reales.

También incluir:

```text
Execution Risks
```

Ejemplos:

- Actividades vencidas.
- Actividades urgentes.
- Actividades sin responsable.
- Cuellos de botella por columna.

Estos datos ya pueden derivarse de:

```text
kanban_tasks
kanban_columns
```

---

# VISTA 2 — BOARD

Reutilizar el Kanban existente.

NO duplicar:

- Columnas.
- Drag and drop.
- Card components.
- APIs.

Adaptar la experiencia actual al nuevo Execution Workspace.

El Kanban debe filtrarse por la Investigation seleccionada.

---

# VISTA 3 — ACTIVITIES

Crear una tabla ejecutiva basada en las tareas reales.

Columnas recomendadas:

```text
Activity
Status
Priority
Assignee
Due Date
CAME Action
Strategic Context
```

Agregar:

- Sorting.
- Filtering.
- Search.
- Navegación hacia detalles.

Evitar una tabla puramente decorativa.

---

# VISTA 4 — STRATEGY

Esta es una de las partes más importantes.

NO crear una visualización CAME falsa.

Primero determina cómo NovaResearch almacena realmente las acciones CAME.

Después construir:

```text
CAME Action
     ↓
Associated Activities
     ↓
Execution Progress
```

Ejemplo:

```text
[M] Improve Organizational Capability

Activities:
████████░░ 4 / 5 completed

Related Strategic Factor:
D-07

Evidence:
3 supporting evidence items
```

Cada nivel debe enlazar con datos reales cuando la arquitectura existente lo permita.

---

# TRAZABILIDAD BIDIRECCIONAL

Implementar, cuando los datos existentes lo permitan:

## Desde una tarea

```text
Task
 → CAME Action
 → Strategic Factor
 → Evidence
```

## Desde una acción estratégica

```text
CAME Action
 → Activities
 → Execution Status
```

Esto debe ser navegable mediante:

- Drawer.
- Detail panel.
- Links internos.

No mostrar únicamente IDs técnicos.

---

# FASE 4 — PRESUPUESTO

IMPORTANTE:

NO inventar todavía un modelo financiero complejo.

Antes de crear Budget, inspecciona si NovaResearch ya tiene:

- Costos.
- Presupuestos.
- Billing relacionado.
- Financial metadata.
- Campos en Investigations.

Si NO existe un modelo financiero para ejecución estratégica:

Primero crear una propuesta técnica.

NO implementar automáticamente una estructura arbitraria.

El modelo futuro podría incluir:

```text
Approved Budget
Allocated
Committed
Actual
Forecast
Remaining
```

Pero esto debe diseñarse correctamente según el dominio real.

---

# FASE 5 — CONFIGURACIÓN

NO crear un `ProjectSettingsDrawer` que duplique campos de Investigation.

Separar claramente:

## Investigation Settings

Datos propios de la investigación.

## Execution Settings

Configuración propia de la ejecución:

- Columnas.
- Workflow.
- Defaults.
- Execution-specific metadata.

Solo crear nuevas entidades/campos cuando exista una verdadera necesidad de dominio.

---

# NOVAI — ACTUALIZACIÓN NECESARIA

NovaResearch ya posee integración entre NovAi y Kanban.

Actualmente existen herramientas similares a:

```text
get_kanban_board_summary
```

Revisa las herramientas existentes.

El objetivo es que NovAi pueda responder consultas contextuales como:

```text
¿Cuál es el estado de ejecución de la investigación FCBC?
```

y no solamente:

```text
¿Cuál es el estado global del Kanban del tenant?
```

## Mejorar herramientas para soportar contexto

Ejemplo conceptual:

```text
get_execution_summary({
  investigationId
})
```

Debe obtener:

- Total tasks.
- Completed.
- In progress.
- Overdue.
- Urgent.
- Unassigned.
- Bottlenecks.
- CAME coverage, si existe relación real.

NO exponer todas las tareas del tenant cuando el usuario pregunta por una investigación específica.

---

# MODELO DE DATOS — PRINCIPIOS

Antes de crear cualquier tabla nueva, responde:

```text
¿Este concepto ya existe?
```

Si sí:

```text
REUTILIZAR
```

Si existe parcialmente:

```text
EXTENDER
```

Solo crear:

```text
NEW ENTITY
```

cuando sea conceptualmente independiente.

---

# DEFINICIÓN DE ÉXITO

Al terminar, NovaResearch debe permitir:

```text
Seleccionar una Investigation
        ↓
Ver su Execution Overview
        ↓
Ver progreso real
        ↓
Gestionar actividades Kanban
        ↓
Ver acciones CAME relacionadas
        ↓
Entender qué estrategia está siendo ejecutada
        ↓
Navegar hacia factores y evidencia cuando la arquitectura existente lo permita
```

---

# UX

Inspiración:

- Linear.
- Jira.
- Monday.
- Modern SaaS dashboards.

Pero NO copiar simplemente sus patrones.

La interfaz debe reflejar que NovaResearch es:

```text
Evidence-Based Strategic Research
+
Strategic Analysis
+
Execution Governance
```

No simplemente:

```text
Task Management
```

---

# REQUISITOS TÉCNICOS

Mantener:

- TypeScript estricto.
- Arquitectura existente.
- RLS.
- Tenant isolation.
- RBAC existente.
- APIs consistentes.
- Componentes reutilizables.
- Datos reales.
- Estados loading/error/empty.
- No mocks en producción.

No romper:

- Investigations.
- NovAi.
- Kanban existente.
- CAME.
- Migraciones existentes.

---

# PROCESO DE TRABAJO OBLIGATORIO

## PASO 1

Audita el código existente.

## PASO 2

Entrega un diagnóstico con:

```text
Current Architecture
Existing Relationships
CAME Storage Location
Execution Data Available
Missing Domain Concepts
```

## PASO 3

Propón el plan exacto de modificaciones.

## PASO 4

Implementa reutilizando el código existente.

## PASO 5

Verifica:

- Build.
- TypeScript.
- Lint.
- Rutas.
- Integridad de tipos.
- RLS si se modificó base de datos.

---

# FORMATO DE RESPUESTA FINAL

Después de implementar, reporta:

## 1. Architecture Before

## 2. Architecture After

## 3. Files Modified

## 4. Database Changes

## 5. API Changes

## 6. NovAi Changes

## 7. Traceability Implemented

Representar:

```text
Investigation
 ↓
CAME
 ↓
Activity
 ↓
Execution
```

y cualquier trazabilidad adicional realmente disponible.

## 8. Remaining Limitations

Ser completamente honesto.

Si CAME todavía no tiene una relación estructurada con Evidence, dilo.

NO inventes funcionalidades que no existen.

---

# PRINCIPIO FINAL

La prioridad NO es construir una interfaz bonita rápidamente.

La prioridad es construir correctamente la capa de:

# STRATEGIC EXECUTION GOVERNANCE

sobre la arquitectura real de NovaResearch.

El resultado debe permitir responder a una pregunta fundamental:

> ¿Qué evidencia y qué análisis estratégico justifican esta actividad, y cuál es el estado real de ejecución de la estrategia resultante?

Ese debe ser el criterio arquitectónico principal durante toda la implementación.