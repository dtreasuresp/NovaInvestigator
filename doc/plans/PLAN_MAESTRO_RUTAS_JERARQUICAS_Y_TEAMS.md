# PLAN MAESTRO — Rutas Jerárquicas Contextuales y Gestión de Equipos (Teams)

**Proyecto:** NovaStore ERP (SaaS Multi-tenant / Multi-workspace / Multi-team)  
**Fecha:** 2026-08-14  
**Estado:** Fase 1 en Implementación (Gestión de Teams en Settings) / Fase 2 en Diseño (Rutas Jerárquicas)  

---

## 1. Visión y Objetivos

1. **Gestión Integral de Equipos (Teams) en Workspace:**
   * Permitir a los administradores y miembros autorizados crear, editar y administrar los equipos funcionales pertenecientes a cada espacio de trabajo.
   * La interfaz de creación de equipos se ubica centralizadamente en **`user-settings/workspace`** (Configuración del Espacio de Trabajo), garantizando el flujo administrativo correcto.

2. **Arquitectura de URLs Contextuales Jerárquicas:**
   * Proveer deep-linking y visibilidad inmediata en la barra de navegación del navegador reflejando la jerarquía organizativa:

     ```text
     http://localhost:4101/apps/[tenantSlug]/[workspaceSlug]/[teamSlug]/[app]/[resource]/[id]
     ```

   * Sincronización automática de Breadcrumbs en la barra superior (`Header.tsx`).
   * Redirección transparente (307/308) cuando se acceda a rutas genéricas (`/apps/investigator` o `/apps/kanban`).

---

## 2. Fase 1 — Gestión de Equipos en `user-settings/workspace`

### 2.1. Componentes y Flujo de UI

* **Ubicación:** `src/views/pages/user-settings/workspace/workspace-teams.tsx` integrado en `src/views/pages/user-settings/workspace/index.tsx`.
* **Acciones:**
  * **Listado de Equipos:** Tarjetas con el logo del equipo, nombre, slug, descripción, cantidad de miembros y fecha de creación.
  * **Modal de Creación (`CreateTeamDialog.tsx`):**
    * Nombre del equipo (ej. *Consultores Estratégicos*).
    * Workspace asignado (selector con el workspace activo por defecto).
    * Slug automático (ej. `consultores`).
    * Descripción del área funcional.
    * Avatar / Logo del equipo (con compresión client-side WebP).
    * Selector múltiple de miembros del tenant.
* **Persistencia:** Llamada a `POST /api/teams` con validación RLS y pertenencia al tenant.
* **Reactividad:** Emisión del evento `window.dispatchEvent(new Event('novastore:workspace-updated'))` para sincronización en tiempo real sin F5.

---

## 3. Fase 2 — Arquitectura de URLs Jerárquicas

### 3.1. Estructura de Rutas en Next.js 16 App Router

```text
src/app/
└── (workspace)/
    └── [tenant]/
        └── [workspace]/
            └── [team]/
                ├── investigator/
                │   ├── page.tsx
                │   ├── [id]/page.tsx
                │   ├── came/page.tsx
                │   ├── dafo/page.tsx
                │   ├── efi/page.tsx
                │   └── efe/page.tsx
                └── kanban/
                    ├── page.tsx
                    └── proyectos/
                        └── [projectId]/
                            └── [[...slug]]/page.tsx
```

### 3.2. Ejemplos de URLs Objetivo

1. **Investigación Estratégica:**
   `http://localhost:4101/apps/dgtecnova/general/consultores/investigator/investigations/bde8e0fb-f3b5-474c-8ef9-69d8e216131b`
2. **Tablero Kanban por Proyecto:**
   `http://localhost:4101/apps/dgtecnova/general/consultores/kanban/proyectos/bde8e0fb-f3b5-474c-8ef9-69d8e216131b/estrategia-2026`
3. **Módulo DAFO:**
   `http://localhost:4101/apps/dgtecnova/general/consultores/investigator/dafo`

### 3.3. Seguridad y Validación RLS

* El middleware (`src/proxy.ts`) y la capa de acceso (`src/features/access`) validan que el usuario autenticado pertenezca al `tenantSlug`, `workspaceSlug` y `teamSlug`.

---

## 4. Matriz de Fases de Ejecución

| Fase | Alcance | Estado |
| --- | --- | --- |
| **Fase 1** | Creación interactiva de equipos en `user-settings/workspace` (`CreateTeamDialog`, listado, compresión de logos, persistencia API y sincronización reactiva) | **En Progreso** |
| **Fase 2** | Creación del árbol de rutas dinámicas `[tenant]/[workspace]/[team]` en App Router, middleware de resolución de slugs y deep-linking | **Diseñado** |
| **Fase 3** | Sincronización de Breadcrumbs en `Header.tsx` y Workspace/Team Switcher interactivo en `Sidebar.tsx` | **Planificado** |
