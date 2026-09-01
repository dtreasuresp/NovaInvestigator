# MISIÓN: LEVANTAMIENTO TÉCNICO INTEGRAL DE NOVARESEARCH ANTES DE IMPLEMENTAR STRATEGY, OKR/KPI E INTEGRACIONES

Actúa como un **Ingeniero Senior / Staff Engineer especializado en sistemas SaaS, PaaS, ERP, arquitectura multi-tenant, Next.js, TypeScript, Supabase/PostgreSQL, RBAC/RLS, IA agentic systems y productos B2B complejos**.

Tu misión inicial **NO es implementar funcionalidades inmediatamente**.

Tu primera misión es realizar un **levantamiento técnico exhaustivo, basado exclusivamente en evidencia real del código actual**, para determinar el estado exacto de NovaResearch y diseñar una estrategia de implementación eficiente, incremental y sin duplicar funcionalidades existentes.

---

# 0. REGLA CRÍTICA DE EJECUCIÓN

Debes trabajar de forma estrictamente secuencial.

## PROHIBIDO

- Crear subagentes.
- Delegar tareas a procesos secundarios.
- Ejecutar trabajo en paralelo mediante agentes ocultos.
- Lanzar múltiples procesos autónomos que consuman créditos de IA sin control explícito.
- Simular que analizaste código que no has inspeccionado.
- Inventar arquitectura basándote únicamente en documentación.
- Implementar funcionalidades antes de completar el levantamiento solicitado.
- Duplicar tablas, APIs, componentes, hooks, servicios o lógica que ya exista.
- Reescribir módulos completos si una extensión incremental es suficiente.
- Hacer cambios masivos "por si acaso".

## OBLIGATORIO

Trabaja **una tarea a la vez**.

El flujo debe ser:

```text
INSPECCIONAR
    ↓
COMPRENDER
    ↓
DOCUMENTAR HALLAZGO
    ↓
VALIDAR DEPENDENCIAS
    ↓
SIGUIENTE TAREA
```

Nunca:

```text
INSPECCIONAR TODO
+
IMPLEMENTAR TODO
+
REFACTORIZAR TODO
```

Cada acción debe ser consciente, verificable y trazable.

---

# 1. CONTEXTO DEL PRODUCTO

NovaResearch es una plataforma SaaS orientada a:

- Investigación organizacional.
- Diagnóstico estratégico.
- Análisis metodológico.
- Gestión de evidencias.
- EFI.
- EFE.
- DAFO.
- QSPM.
- CAME.
- Gestión de proyectos derivados de investigaciones.
- Actividades.
- Kanban.
- Indicadores.
- Presupuesto.
- Equipos.
- Workspaces.
- Tenants.
- RBAC.
- RLS.
- NovAi como agente inteligente transversal.

La arquitectura objetivo futura contempla:

```text
NovaResearch
│
├── Research
│   ├── Investigations
│   ├── Evidence
│   ├── EFI
│   ├── EFE
│   ├── DAFO
│   ├── QSPM
│   └── CAME
│
├── Strategy
│   ├── Strategic Objectives
│   ├── KPIs
│   ├── OKRs
│   ├── Key Results
│   ├── Strategic Initiatives
│   └── Strategy Maps / Balanced Scorecard (futuro)
│
├── Projects
│   ├── Projects
│   ├── Activities
│   ├── Tasks
│   ├── Kanban
│   ├── Budget
│   └── Execution
│
└── NovAi
    ├── Research Intelligence
    ├── Strategy Intelligence
    ├── Project Intelligence
    ├── KPI Intelligence
    └── Execution Intelligence
```

IMPORTANTE:

Esta arquitectura objetivo **NO significa que debas implementarla todavía**.

Primero debes descubrir:

> Qué existe realmente hoy en NovaResearch.

---

# 2. OBJETIVO DEL LEVANTAMIENTO

Debes determinar con evidencia del código:

1. Qué módulos existen actualmente.
2. Qué funcionalidades están completas.
3. Qué funcionalidades están parcialmente implementadas.
4. Qué estructuras ya permiten implementar Strategy sin duplicación.
5. Cómo funciona realmente Research.
6. Cómo funciona realmente Projects.
7. Cómo funciona Kanban.
8. Cómo funcionan Teams y Workspace Members.
9. Cómo funciona RBAC.
10. Cómo funciona RLS.
11. Cómo funciona Billing y Entitlements.
12. Cómo funciona NovAi.
13. Qué tools tiene NovAi actualmente.
14. Qué integraciones entre Research y Projects ya existen.
15. Cómo se modelan actualmente las acciones CAME.
16. Cómo se modelan los indicadores declarados desde CAME.
17. Si existen conceptos equivalentes a:

```text
Strategic Objective
KPI
OKR
Key Result
Initiative
```

18. Qué migraciones ya existen relacionadas.
19. Qué tablas Supabase/PostgreSQL están involucradas.
20. Qué APIs y Server Actions existen.
21. Qué componentes UI ya resuelven parte del problema.
22. Qué capacidades existentes deben reutilizarse.
23. Qué debe extenderse.
24. Qué debe crearse desde cero.

---

# 3. PRIMERA FASE: MAPA REAL DEL REPOSITORIO

Comienza inspeccionando la estructura completa del proyecto.

Debes identificar:

```text
apps/
packages/
src/
app/
components/
lib/
services/
hooks/
types/
supabase/
migrations/
api/
```

según la estructura real.

Documenta:

### A. Framework

- Next.js.
- Versión.
- App Router o Pages Router.
- React.
- TypeScript.
- Tailwind.
- shadcn/ui.

### B. Backend

- Supabase.
- PostgreSQL.
- Edge Functions.
- API Routes.
- Server Actions.

### C. Arquitectura

- Monorepo o repositorio único.
- Packages compartidos.
- Domain services.
- Repository pattern si existe.
- Tool Gateway.
- Event architecture.
- Streaming.

### D. Base de datos

Identifica:

```text
Tables
Views
Functions
Triggers
Policies
Enums
Foreign Keys
Indexes
```

NO inventes nombres.

Extrae los nombres reales.

---

# 4. SEGUNDA FASE: AUDITORÍA COMPLETA DE RESEARCH

Inspecciona específicamente:

```text
Research
Investigations
Evidence
EFI
EFE
DAFO
QSPM
CAME
Summary
```

Para cada dominio identifica:

### Modelo de datos

```text
Table:
Columns:
Relationships:
Foreign Keys:
RLS:
```

### Backend

```text
API:
Server Action:
Service:
Repository:
```

### Frontend

```text
Route:
Page:
Components:
Dialogs:
Hooks:
State:
```

### Permisos

Determina quién puede:

```text
View
Create
Edit
Delete
Export
```

---

# 5. AUDITORÍA ESPECÍFICA DEL CAME

Esta fase es CRÍTICA.

Debes localizar el código exacto de CAME.

Analiza:

```text
CAME Action
```

Determina qué propiedades existen realmente.

Por ejemplo, verifica si existen:

```text
title
description
type
objective
responsible
participants
indicator
baseline
target
frequency
budget
start_date
end_date
```

NO asumas que existen.

Confirma en código.

Para cada campo encontrado:

```text
Campo
Tipo
Tabla
UI
API
Uso actual
```

Después determina:

### ¿Las acciones CAME ya tienen indicadores?

Si sí:

- ¿Cómo se almacenan?
- ¿Qué tipo de indicador?
- ¿Puede haber varios?
- ¿Existe baseline?
- ¿Existe target?
- ¿Existe unidad?
- ¿Existe frecuencia?
- ¿Existe responsable?

### ¿Las acciones CAME ya tienen responsables?

Determina:

- ¿Usuario?
- ¿Workspace member?
- ¿Team member?
- ¿Texto libre?

### ¿Las acciones CAME ya tienen presupuesto?

Determina:

- Presupuesto por acción.
- Presupuesto total.
- Ninguno.

---

# 6. AUDITORÍA COMPLETA DE PROJECTS

Inspecciona la app Projects en profundidad.

Debes determinar:

## Modelo Project

```text
Project
├── ID
├── Tenant
├── Workspace
├── Team
├── Leader
├── Members
├── Budget
├── Start
├── End
├── Status
└── Relationships
```

Pero utiliza únicamente los nombres reales encontrados.

Determina:

### A. Cómo se crea un proyecto actualmente.

### B. Qué wizard o formulario existe.

### C. Cómo se seleccionan participantes.

### D. Cómo se selecciona líder.

### E. Cómo funciona Team.

### F. Cómo se controlan permisos.

### G. Cómo se controla tenant/workspace.

### H. Cómo se controla que un responsable pertenezca al Team.

### I. Cómo se modela presupuesto.

### J. Cómo se modelan actividades.

### K. Cómo se modelan tareas.

### L. Cómo funciona Kanban.

---

# 7. AUDITORÍA DE TEAMS Y MEMBRESÍA

Esta fase es obligatoria porque será crítica para la creación de proyectos desde CAME.

Debes inspeccionar:

```text
Workspace
Tenant
Teams
Team Members
Workspace Members
Roles
Permissions
```

Debes establecer con evidencia:

```text
Tenant
    ↓
Workspace
    ↓
Team
    ↓
Members
```

o la estructura real.

Determina las reglas actuales para:

```text
Project Leader
Project Participant
Activity Responsible
Task Responsible
```

Verifica si el sistema actualmente impide:

```text
Usuario fuera del Tenant
        ↓
Asignado a Project
```

y:

```text
Usuario fuera del Team
        ↓
Project Leader
```

Si no existe esa protección, debes marcarlo como GAP.

---

# 8. AUDITORÍA DE KANBAN

Determina:

```text
Board
Columns
Tasks
Statuses
Assignees
Dates
Dependencies
Progress
```

Identifica cómo una:

```text
Activity
```

se relaciona actualmente con:

```text
Task
```

Esto es importante para definir posteriormente:

```text
CAME Action
       ↓
Project
       ↓
Activity
       ↓
Task
```

Debes determinar si una acción CAME:

```text
1 Action = 1 Activity
```

o si existe alguna estructura equivalente.

NO diseñes todavía.

Primero descubre el estado real.

---

# 9. AUDITORÍA DE INDICADORES

Busca en todo el repo:

```text
indicator
kpi
okr
key_result
metric
baseline
target
measurement
progress
```

Determina:

### Qué existe realmente.

Clasifica:

```text
Already Implemented
Partially Implemented
Database Only
UI Only
Dead Code
Not Implemented
```

Identifica especialmente los indicadores declarados desde CAME.

Determina cómo podrían reutilizarse para:

```text
KPI
OKR Key Result
Project Indicator
```

---

# 10. AUDITORÍA DE BILLING Y ENTITLEMENTS

Esta fase es OBLIGATORIA.

NovaResearch tiene planes comerciales y restricciones.

Debes localizar el sistema real de:

```text
Plans
Subscriptions
Billing
Quota
Usage
Entitlements
```

Busca conceptos como:

```text
plan
billing
quota
limit
usage
feature
entitlement
subscription
export
```

Determina si actualmente existen límites para:

```text
Investigations
Projects
Exports
Users
Teams
AI usage
Storage
```

Identifica:

### Fuente de verdad.

```text
Database?
Stripe?
Configuration?
Feature Flags?
```

### Enforcement.

¿Dónde se bloquea?

```text
UI
API
Database
Middleware
Service
```

Esto será crítico para futuras funciones como:

```text
PDF export
DOCX export
Project creation
Strategy objects
NovAi usage
```

No se debe crear un segundo sistema de límites si ya existe uno.

---

# 11. AUDITORÍA COMPLETA DE NOVAI

Inspecciona:

```text
Agent Runtime
Model Router
System Prompt
Context Engine
Memory Engine
Evidence Engine
Methodology Knowledge
Tool Registry
Tool Gateway
Streaming
Events
Persistence
Observability
```

Debes producir un inventario real.

Para cada Tool:

```text
Tool Name
Domain
Purpose
Input
Output
Permissions
Data Source
```

Clasifica:

```text
Research Tool
Evidence Tool
Analysis Tool
Audit Tool
Platform Tool
Project Tool
Strategy Tool
```

Determina especialmente:

### ¿Puede NovAi actualmente consultar Projects?

### ¿Puede consultar Kanban?

### ¿Puede consultar indicadores?

### ¿Puede consultar presupuesto?

### ¿Puede consultar Teams?

### ¿Puede consultar Billing?

### ¿Puede crear o modificar objetos?

---

# 12. DETECTAR EL PROBLEMA DE TOOLS ESTÁTICAS

Verifica si actualmente ocurre:

```text
All Tools
      ↓
Every Request
      ↓
LLM
```

o si existe:

```text
Intent
      ↓
Tool Selection
      ↓
Dynamic Tools
```

Si las tools se exponen globalmente, documenta:

```text
Current Implementation
Problem
Token Impact
Security Impact
Recommended Evolution
```

Pero NO implementes todavía.

---

# 13. AUDITORÍA DE SUMMARY

Inspecciona la pantalla:

```text
Summary
Informe resumen del diagnóstico metodológico
```

Determina:

- Qué información muestra.
- Qué datos consume.
- Qué acciones existen.
- Qué botones existen.
- Si existe exportación.
- Si existe generación por NovAi.
- Si existen estadísticas.
- Si existe información del CAME.
- Si existen relaciones con Projects.

Determina dónde debe integrarse posteriormente:

```text
Projects Summary Card
```

con:

```text
Associated Projects
Planned Activities
Completed Activities
In Progress
Budget Used
KPI Progress
OKR Progress
```

---

# 14. ENTREGABLE DEL LEVANTAMIENTO

Cuando termines TODA la inspección, entrega un documento técnico estructurado.

# A. EXECUTIVE TECHNICAL SUMMARY

```text
Architecture Health:
Research:
Projects:
Kanban:
Indicators:
Teams:
Billing:
NovAi:
Integration Readiness:
```

---

# B. ACTUAL ARCHITECTURE MAP

Basado exclusivamente en código real.

```text
NovaResearch
│
├── ...
```

---

# C. EXISTING CAPABILITIES

Tabla:

| Capability | Status | Location | Reuse |
|---|---|---|---|

Estados:

```text
Complete
Partial
Experimental
Dead Code
Missing
```

---

# D. RESEARCH → PROJECTS GAP ANALYSIS

```text
CAME
   ↓
???
   ↓
Projects
```

Identifica exactamente qué falta.

---

# E. INDICATOR GAP ANALYSIS

```text
Current CAME Indicator Model
        ↓
Reusable for KPI?
Reusable for KR?
Reusable for Project Indicator?
```

---

# F. NOVAI GAP ANALYSIS

```text
Current Tools
        ↓
Missing Domains
        ↓
Required Future Tools
```

NO inventes 40 herramientas innecesarias.

Propón únicamente las necesarias.

---

# G. BILLING / ENTITLEMENT IMPACT

Para cada futura función:

```text
Feature
Existing Entitlement?
Existing Quota?
Reuse?
Extension Needed?
```

Ejemplo:

| Feature | Existing Control | Recommendation |
|---|---|---|
| PDF Export | ? | ? |
| DOCX Export | ? | ? |
| Projects | ? | ? |
| Strategy | ? | ? |
| NovAi | ? | ? |

---

# H. DATABASE IMPACT

Identifica:

```text
Reuse Existing Tables
Extend Existing Tables
New Tables Required
```

NO propongas migraciones todavía.

---

# I. IMPLEMENTATION ROADMAP

Construye fases.

Ejemplo conceptual:

```text
Phase 0
Architecture Validation

Phase 1
Research ↔ Projects Integration

Phase 2
Indicators Foundation

Phase 3
Strategy Foundation

Phase 4
NovAi Evolution

Phase 5
Automations

Phase 6
Strategy Map
```

Pero ajusta las fases según el código real.

---

# 15. REGLA DE ORO: REUTILIZACIÓN PRIMERO

Antes de proponer crear:

```text
table
API
hook
service
component
dialog
wizard
tool
```

debes buscar:

```text
¿Existe algo equivalente?
```

Si existe:

```text
REUSE
EXTEND
```

No:

```text
DUPLICATE
```

---

# 16. DECISIONES ARQUITECTÓNICAS QUE DEBES VALIDAR

Después del levantamiento, evalúa estas hipótesis:

## Hipótesis A

```text
Research
    ↓
CAME Action
    ↓
Project
```

## Hipótesis B

```text
CAME Action
    ↓
Strategic Objective
    ↓
KPI / OKR
    ↓
Initiative
    ↓
Project
```

## Hipótesis C

```text
Research
    ↓
Project
```

sin Strategy.

Determina cuál puede implementarse con menor complejidad y mayor escalabilidad aprovechando el código existente.

---

# 17. DEFINICIÓN DE ÉXITO

El levantamiento será exitoso si al terminar podemos responder con precisión:

### Research

- ¿Qué datos produce?
- ¿Qué datos pueden alimentar Projects?
- ¿Qué datos pueden alimentar Strategy?

### Projects

- ¿Qué necesita para crear proyectos desde CAME?
- ¿Qué ya existe?
- ¿Qué falta?

### Indicators

- ¿Cómo se transforman los indicadores actuales en KPI/KR?

### Strategy

- ¿Debe ser una nueva app?
- ¿Qué mínimo viable necesita?

### NovAi

- ¿Qué herramientas necesita realmente?
- ¿Qué herramientas existentes puede reutilizar?
- ¿Cómo evitar volver a exponer todas las tools en cada request?

### Billing

- ¿Cómo garantizar que nuevas funcionalidades respeten los planes contratados?

---

# 18. NO IMPLEMENTAR TODAVÍA

Esta primera misión termina con:

```text
TECHNICAL ASSESSMENT COMPLETE
```

y un roadmap recomendado.

NO comiences automáticamente a modificar el código.

Espera mi aprobación para iniciar la implementación.

---

# 19. CUANDO COMIENCE LA IMPLEMENTACIÓN

Cuando reciba la orden de implementar:

## Regla absoluta

```text
ONE TASK AT A TIME
```

El ciclo será:

```text
TASK SELECTED
      ↓
Inspect Dependencies
      ↓
Implement
      ↓
Type Check
      ↓
Lint
      ↓
Build / Relevant Tests
      ↓
Verify
      ↓
Report
      ↓
STOP
```

No continúes automáticamente con la siguiente tarea.

Después de cada tarea entrega:

```text
TASK COMPLETED

Changed:
- ...

Reused:
- ...

Created:
- ...

Database impact:
- ...

Security impact:
- ...

Billing impact:
- ...

Tests:
- ...

Remaining risks:
- ...

Recommended next task:
- ...
```

Y espera confirmación.

---

# PRINCIPIO FINAL

NovaResearch ya tiene una base importante.

Tu objetivo NO es reinventar NovaResearch.

Tu objetivo es:

```text
UNDERSTAND THE EXISTING SYSTEM
        ↓
REUSE WHAT WORKS
        ↓
EXTEND WHAT IS PARTIAL
        ↓
REMOVE DUPLICATION
        ↓
FILL REAL GAPS
        ↓
IMPLEMENT IN SMALL VERIFIED STEPS
```

La calidad se mide por:

```text
Correctness
+ Reuse
+ Security
+ Tenant Isolation
+ RBAC
+ RLS
+ Billing Compliance
+ Maintainability
+ UX Consistency
+ AI Cost Control
```

No por la cantidad de código generado.

**Primero levanta la realidad del repositorio. Después diseñamos. Después implementamos. Una tarea a la vez.**