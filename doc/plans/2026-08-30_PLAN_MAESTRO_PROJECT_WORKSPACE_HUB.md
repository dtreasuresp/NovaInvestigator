# PLAN MAESTRO: NovaResearch Project Workspace Hub & Strategic Management Suite

**Fecha de Creación:** 30 de Agosto de 2026  
**Versión de Especificación:** v1.0.0  
**Estado:** Propuesta Técnica / Especificación de Arquitectura  
**Ámbito:** `src/views/apps/projects/`, `src/features/projects/`, `src/app/api/projects/`, `src/views/apps/projects/kanban/`  

---

## 1. Resumen Ejecutivo y Diagnóstico

### 1.1 Contexto Actual
El módulo de proyectos (`/apps/projects`) fue concebido para albergar proyectos estratégicos derivados de matrices CAME de la aplicación Research, así como proyectos independientes creados en blanco. Sin embargo, su estado actual presenta fricciones severas de experiencia de usuario (UX) y limitaciones arquitectónicas:

1. **Bug Visual en el Selector de Proyectos:** El dropdown superior renderiza el identificador UUID crudo (`ae3d0ee9-d087-49ac-abbd-3...`) cuando la vista carga con el parámetro `?project=<uuid>`, debido a la falta de resolución explícita de hijos en el componente primitivo `<SelectValue />` de `@base-ui/react`.
2. **Ausencia de Hub de Gestión y Configuración:** Una vez creado el proyecto, no existe una interfaz para editar sus metadatos (nombre, descripción, objetivo estratégico, líder, fechas, presupuesto tope) ni para incorporar nuevas acciones CAME sin tener que reiniciar el wizard desde Research.
3. **Monovista Rígida:** La aplicación solo ofrece un tablero Kanban plano, careciendo de vistas multidimensionales estándar en suites modernas de gestión de proyectos (*Linear, Jira Discovery, Monday.com, ClickUp*), tales como vista de lista/tabla, matriz de alineación estratégica CAME, desglose financiero y vista portafolio multi-proyecto.

### 1.2 Objetivo Estratégico
Transformar el módulo `/apps/projects` en una **Suite de Gestión y Gobernanza de Proyectos Estratégicos (Project Workspace Hub)** de clase empresarial, dotada de:
- **Cabecera de Proyecto Inteligente (`ProjectWorkspaceHeader`):** Selector estilizado con avatar y búsqueda, enlace bidireccional a la investigación de origen, indicadores clave en tiempo real (% de avance, medidor de salud presupuestaria, equipo de trabajo) y barra de acciones rápidas.
- **Drawer de Edición y Gobernanza (`ProjectSettingsDrawer`):** Panel lateral para actualizar datos generales, recalibrar presupuestos, reasignar líderes y vincular dinámicamente nuevas acciones CAME de la investigación.
- **Vistas Multidimensionales (Tabs de Navegación):**
  - 📊 **Tablero Kanban (Board):** Flujo ágil de trabajo con columnas arrastrables, filtros avanzados, asignación múltiple de miembros y costos por tarjeta.
  - 📋 **Lista / Tabla de Actividades (Table):** Edición rápida en línea, ordenamiento por prioridad, responsable, fecha de vencimiento y presupuesto asignado.
  - 🎯 **Alineación Estratégica CAME (Strategy Alignment):** Matriz de correspondencia entre acciones CAME (C, A, M, E), diagnósticos de origen y tareas Kanban ejecutoras.
  - 💰 **Control Financiero & Presupuesto (Budget Breakdown):** Desglose visual de asignación por actividad, saldos y gráfico de distribución.
  - 🌐 **Vista Portafolio (Portfolio Overview):** Resumen ejecutivo en tarjetas/mosaico cuando se selecciona la vista global de proyectos del tenant.

---

## 2. Arquitectura de UI & Diseño de Componentes (SODA)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  src/views/apps/projects/                                                              │
│  ├── index.tsx                         # Controlador de vista principal                │
│  ├── components/                                                                       │
│  │   ├── project-workspace-header.tsx  # Cabecera con selector, KPIs y acciones        │
│  │   ├── project-switcher.tsx          # Selector enriquecido (Nombre, Estado, Nuevo)  │
│  │   ├── project-kpi-bar.tsx           # % Avance, Medidor Presupuesto, Team Avatars   │
│  │   ├── project-settings-drawer.tsx   # Panel de edición integral y CAME sync         │
│  │   ├── project-portfolio-view.tsx    # Cuadrícula resumen multi-proyecto             │
│  │   ├── project-table-view.tsx        # Tabla de actividades interactiva              │
│  │   ├── project-came-alignment.tsx    # Matriz de trazabilidad estratégica CAME       │
│  │   ├── project-budget-view.tsx       # Desglose financiero y distribución            │
│  │   └── project-creation-wizard.tsx   # Wizard canónico de creación (5 pasos)         │
│  └── kanban/                           # Submódulo del Tablero Kanban                  │
│      ├── index.tsx                                                                     │
│      └── components/                                                                   │
│          ├── kanban-board.tsx                                                          │
│          ├── kanban-column.tsx                                                         │
│          ├── kanban-card.tsx                                                           │
│          └── card-form-dialog.tsx                                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación Detallada de Módulos

### 3.1 Cabecera de Proyecto Inteligente (`ProjectWorkspaceHeader`)
- **Project Switcher:**
  - Desplegable con búsqueda integrada (`Command` / `Popover`).
  - Renderizado garantizado del nombre real del proyecto y badge de prioridad (`Urgente`, `Alta`, `Media`, `Baja`) y estado (`Activo`, `En Planificación`, `En Pausa`, `Completado`).
  - Opción destacada `➕ Nuevo Proyecto` y `🌐 Todos los Proyectos (Vista Portafolio)`.
- **Vínculo con Research:**
  - Si el proyecto es derivado de CAME, botón con icono de enlace externo: `Expediente: [Organización / Título] ↗` apuntando a `/apps/investigator?id=<investigationId>`.
- **KPIs en Tiempo Real:**
  - **Progreso General:** Barra de progreso visual con conteo de tareas (`X / Y tareas completadas - Z%`).
  - **Salud Presupuestaria:** Medidor con porcentaje de consumo (`$ Asignado` vs `$ Tope`) con semáforo de color:
    - 🟢 Verde: Consumo $\le 85\%$ del tope.
    - 🟡 Amarillo: Consumo entre $86\%$ y $100\%$.
    - 🔴 Rojo: Sobreasignación $> 100\%$ (alerta de déficit).
  - **Equipo de Trabajo:** Grupo de avatares superpuestos con tooltip de rol (`👑 Líder`, `Colaboradores`).
- **Botones de Acción:**
  - `⚙️ Ajustes del Proyecto`: Abre el `ProjectSettingsDrawer`.
  - `➕ Nueva Actividad`: Añade una tarjeta directamente en el tablero o tabla.
  - `📄 Exportar Informe`: Descarga reporte DOCX/PDF del estado del proyecto.

### 3.2 Drawer de Edición y Gobernanza (`ProjectSettingsDrawer`)
Diseñado como un Sheet / Drawer lateral accesible en cualquier momento:
- **Pestaña 1 (Datos Generales):** Nombre (máx. 300 caracteres con contador), Descripción (máx. 4000), Objetivo Estratégico (máx. 4000), Prioridad, Fechas de Inicio/Fin y Estado del Proyecto.
- **Pestaña 2 (Gobernanza & Equipo):** Selector de Líder del Proyecto y lista de miembros asignados con sus roles.
- **Pestaña 3 (Presupuesto):** Modo presupuestario (`action_based` o `total_first`) y ajuste del Presupuesto Total Tope.
- **Pestaña 4 (Acciones CAME Vinculadas):**
  - Lista de acciones CAME ya importadas con su snapshot metodológico.
  - Botón `➕ Importar más acciones CAME` que consulta `/api/investigations/[id]/came/eligible-actions` para incorporar nuevas acciones no seleccionadas previamente y convertirlas automáticamente en tareas Kanban.
- **Zona de Peligro:** Opciones para archivar o cancelar el proyecto con confirmación segura.

### 3.3 Vistas de Trabajo Multidimensionales (Tabs)

#### Tab 1: Tablero Kanban (`KanbanBoard`)
- Columnas configurables (`Backlog`, `En Proceso`, `Revisión`, `Completado`).
- Tarjetas con: Título, Badge de acción CAME (`ACC-F-01`), Prioridad con color distintivo, Fecha límite, Avatares de responsables múltiples, Costo/Presupuesto de la actividad.
- Filtros reactivos por texto, responsable, prioridad y etiquetas.

#### Tab 2: Lista Tabular de Actividades (`ProjectTableView`)
- Componente basado en TanStack Table.
- Columnas: Estado (Columna Kanban), Código CAME, Título de la Actividad, Responsables, Fecha Límite, Prioridad, Presupuesto Asignado ($), Acciones Rápidas (Editar, Mover, Eliminar).
- Edición rápida in-line de fechas y responsables.

#### Tab 3: Alineación Estratégica CAME (`ProjectCameAlignmentView`)
- Matriz de correspondencia:
  - **Acción CAME:** Tipo (`C`, `A`, `M`, `E`), Código (`ACC-D-01`), Acción propuesta, Problema/Factor de origen, Responsable institucional.
  - **Actividades Kanban Asociadas:** Listado de tarjetas Kanban que ejecutan esa acción con su estado actual de avance.
  - **Presupuesto Asignado:** Suma de los presupuestos de las actividades vinculadas a esa acción.

#### Tab 4: Vista Portafolio (`ProjectPortfolioView`)
- Activada cuando el selector de proyectos está en `"all"` o se pulsa la pestaña de portafolio.
- Cuadrícula de tarjetas con métricas consolidadas:
  - Total de proyectos activos, en planificación y completados.
  - Presupuesto global comprometido vs disponible en el tenant.
  - Tarjetas de proyecto individuales con barra de progreso, presupuesto, líder y botón de acceso rápido.

---

## 4. Endpoints y Capa de Dominio (Backend & API)

### 4.1 Modificaciones en `src/features/projects/`
1. **`service.ts` / `repository.ts`:**
   - Implementar `updateProject(tenantId, projectId, patch)` con soporte para actualizar datos generales, líder, presupuesto y estado.
   - Implementar `syncProjectCameActions(tenantId, projectId, newActionIds)` para agregar nuevas acciones CAME a un proyecto existente y generar sus tareas Kanban correspondientes en una sola transacción.
2. **`schema.ts`:**
   - Validar payloads de actualización con `updateProjectSchema`.
   - Validar payloads de importación adicional con `syncProjectCameActionsSchema`.
3. **`http.ts` / Route Handlers:**
   - Endpoint `PATCH /api/projects/[id]` para actualización integral.
   - Endpoint `POST /api/projects/[id]/came-sync` para sincronización de acciones adicionales.

---

## 5. Plan de Ejecución por Fases

| Fase | Alcance | Entregables |
| :--- | :--- | :--- |
| **Fase 1: Fix del Switcher & Header Inteligente** | Resolver el bug visual del UUID en el dropdown y construir `ProjectWorkspaceHeader` con selector enriquecido, KPIs de avance/presupuesto y enlaces. | `project-switcher.tsx`, `project-workspace-header.tsx`, actualización de `kanban-board.tsx`. |
| **Fase 2: Drawer de Edición y Gobernanza** | Crear `ProjectSettingsDrawer` y endpoints `PATCH /api/projects/[id]` para permitir edición completa y sincronización de nuevas acciones CAME. | `project-settings-drawer.tsx`, `src/features/projects/service.ts`, tests unitarios. |
| **Fase 3: Vistas Multidimensionales (Tabs)** | Implementar la navegación por pestañas: Tablero Kanban, Lista Tabular, Matriz de Alineación CAME y Vista Portafolio Global. | `project-table-view.tsx`, `project-came-alignment.tsx`, `project-portfolio-view.tsx`. |
| **Fase 4: Verificación & CI** | Pruebas de integración, verificación de accesibilidad, actualización de `CHANGELOG.md` y suite de tests. | Tests pasando al 100%, changelog actualizado. |

---

## 6. Criterios de Aceptación y Validación

1. **Selector de Proyectos:**
   - El selector nunca debe mostrar un código UUID crudo; siempre debe mostrar el nombre completo del proyecto con fallback visual de carga o estado vacío.
2. **Edición Integral:**
   - El usuario puede modificar nombre, objetivo, líder, presupuesto y fechas de cualquier proyecto directamente desde `/apps/projects` sin regresar a Research.
3. **Sincronización CAME:**
   - Posibilidad de incorporar acciones CAME pendientes al proyecto activo conservando la trazabilidad metodológica.
4. **Calidad y Rendimiento:**
   - Cumplimiento de estándares de diseño (`frontend-design`, shadcn/ui, tokens de Tailwind v4).
   - Tipado estricto de TypeScript (`tsc --noEmit` sin errores) y suite de tests en verde.
