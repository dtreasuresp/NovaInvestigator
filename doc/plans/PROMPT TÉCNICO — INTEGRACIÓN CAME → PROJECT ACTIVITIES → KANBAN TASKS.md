# PROMPT TÉCNICO — INTEGRACIÓN CAME → PROJECT ACTIVITIES → KANBAN TASKS

## Contexto

Estamos trabajando sobre el repositorio real:

**Repository:** `dtreasuresp/NovaResearch`

El proyecto anteriormente se llamaba **NovaInvestigator**.

Antes de implementar cualquier cambio, debes inspeccionar nuevamente el código real del repositorio para identificar exactamente:

- cómo está implementado el módulo Research;
- cómo se almacenan las acciones CAME;
- cómo está implementado Projects;
- qué entidades existen actualmente para proyectos;
- cómo funciona Kanban;
- cómo está definida `KanbanTask`;
- cómo se relacionan actualmente las tareas con `project_id`;
- cómo funcionan Teams;
- cómo se asignan responsables;
- cómo funciona RBAC;
- cómo funcionan RLS y tenant/workspace/team scope;
- qué migraciones y tablas ya existen.

---

# 1. OBJETIVO

Implementar correctamente la transformación de resultados estratégicos de una investigación en trabajo ejecutable.

La arquitectura objetivo NO debe ser:

```text
CAME Action
      ↓
Kanban Task
```

como una relación automática rígida 1:1.

La arquitectura debe permitir:

```text
Investigation
      ↓
CAME Action
      ↓
Project
      ↓
Project Activity / Work Package
      ↓
Kanban Tasks
```

Donde:

- una investigación puede generar varios proyectos;
- un proyecto puede importar varias acciones CAME;
- una acción CAME puede generar una o varias actividades;
- una actividad puede generar una o varias tareas Kanban.

---

# 2. PRINCIPIO FUNDAMENTAL

## CAME NO ES UNA TAREA

Una acción CAME representa una decisión o acción estratégica.

Una tarea Kanban representa trabajo operativo ejecutable.

Por tanto, NO asumir:

```text
1 CAME Action = 1 Kanban Task
```

Ejemplo:

### Acción CAME

```text
Implementar un programa de capacitación para mejorar las competencias digitales del personal.
```

Esta acción puede convertirse en:

```text
Project Activity
│
├── Analizar necesidades de capacitación
├── Diseñar programa
├── Preparar materiales
├── Coordinar participantes
└── Ejecutar capacitación
```

Y posteriormente cada actividad puede tener tareas Kanban.

Por ejemplo:

```text
Actividad: Diseñar programa

Kanban Tasks:

├── Investigar contenidos
├── Diseñar módulos
├── Preparar cronograma
└── Obtener aprobación
```

---

# 3. MODELO JERÁRQUICO OBJETIVO

La solución debe representar claramente los diferentes niveles:

| Nivel | Entidad | Naturaleza |
|---|---|---|
| Estratégico | Investigación | Diagnóstico |
| Estratégico | CAME Action | Respuesta estratégica |
| Gestión | Project | Iniciativa |
| Táctico | Project Activity / Work Package | Bloque de trabajo |
| Operativo | Kanban Task | Trabajo ejecutable |

Arquitectura conceptual:

```text
INVESTIGATION
      │
      ▼
CAME ACTION
      │
      ▼
PROJECT
      │
      ▼
PROJECT ACTIVITY
      │
      ├──────────────┐
      ▼              ▼
KANBAN TASK     KANBAN TASK
      │
      ▼
KANBAN TASK
```

---

# 4. PRIMERO: AUDITAR EL MODELO ACTUAL

NO crear inmediatamente una nueva tabla llamada:

```text
project_activities
```

Primero buscar en todo el repositorio:

```text
activity
activities
task
tasks
work_package
project_task
project_activity
kanban
KanbanTask
project_id
```

Determinar:

### A. ¿Ya existe una entidad que represente actividades?

Si existe:

> REUTILIZARLA.

### B. ¿KanbanTask ya representa una actividad del proyecto?

Si es así:

> NO crear una entidad adicional innecesaria.

### C. ¿El sistema actual distingue tareas y actividades?

Si sí:

> extender la jerarquía existente.

### D. ¿No existe ningún nivel intermedio?

Solo entonces evaluar crear:

```text
project_activities
```

La decisión debe basarse exclusivamente en el código real.

---

# 5. REGLA DE NO DUPLICACIÓN

Antes de crear cualquier:

- tabla;
- API;
- service;
- componente;
- tipo;
- hook;
- relación;

buscar primero una implementación equivalente.

Clasificar cada necesidad como:

| Necesidad | Implementación actual | Decisión |
|---|---|---|
| Project Activity | ¿Existe? | Reutilizar / Extender / Crear |
| Kanban Tasks | Existe | Reutilizar |
| Team Members | Existe | Reutilizar |
| Project Members | Revisar | Reutilizar / Extender |
| Budget | Revisar | Reutilizar / Extender |
| Assignees | Existe/revisar | Reutilizar |
| CAME | Existe | Extender relación |

---

# 6. FLUJO DE IMPORTACIÓN DESDE CAME

Cuando el usuario crea un proyecto desde una investigación:

```text
Research Summary
      │
      ▼
Create Project
      │
      ▼
Wizard
      │
      ▼
Select CAME Actions
```

Las acciones seleccionadas NO deben convertirse inmediatamente en tareas Kanban.

Deben convertirse primero en elementos de planificación del proyecto.

Dependiendo del modelo real:

```text
CAME Action
      ↓
Project Activity
```

o utilizar la entidad existente equivalente.

---

# 7. PASO 5 DEL WIZARD — PLANIFICACIÓN DETALLADA

El Paso 5 debe evolucionar para permitir la planificación operativa.

Para cada acción CAME seleccionada mostrar:

```text
┌─────────────────────────────────────────────────────┐
│ ACCIÓN ESTRATÉGICA                                  │
│                                                     │
│ Implementar programa de capacitación                │
│                                                     │
│ Categoría CAME: CORREGIR                            │
│                                                     │
│ Responsable: [ María González ▼ ]                   │
│                                                     │
│ Inicio: [ 01/10/2026 ]                              │
│ Fin:    [ 30/11/2026 ]                              │
│                                                     │
│ Presupuesto: [ $25,000 ]                            │
│                                                     │
│ ACTIVIDADES / TRABAJO PLANIFICADO                   │
│                                                     │
│ ☑ Analizar necesidades                              │
│ ☑ Diseñar programa                                  │
│ ☑ Preparar materiales                               │
│                                                     │
│ [+ Añadir actividad]                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

La terminología final debe adaptarse a las entidades reales del sistema.

---

# 8. DOS MODOS DE PLANIFICACIÓN

Implementar dos experiencias.

## MODO A — RÁPIDO

Para proyectos simples.

El usuario puede seleccionar:

```text
○ Crear una actividad inicial por cada acción CAME
```

Resultado:

```text
CAME Action
      ↓
Project Activity
      ↓
1 Kanban Task inicial
```

Este modo reduce fricción.

---

## MODO B — DETALLADO

Modo recomendado.

El usuario puede crear varias actividades.

```text
CAME Action
      ↓
Project Activity
      │
      ├── Activity 1
      ├── Activity 2
      └── Activity 3
```

Y posteriormente crear varias tareas Kanban.

Ejemplo:

```text
CAME Action

Implementar programa de capacitación
        │
        ├── Diseñar programa
        │      ├── Investigar contenidos
        │      ├── Diseñar módulos
        │      └── Aprobar programa
        │
        ├── Preparar recursos
        │      ├── Contratar instructor
        │      └── Preparar materiales
        │
        └── Ejecutar programa
               ├── Convocar participantes
               ├── Ejecutar sesiones
               └── Evaluar resultados
```

---

# 9. CREACIÓN AUTOMÁTICA DE TAREAS

NO implementar una conversión automática rígida:

```text
CAME Action → Kanban Task
```

La automatización debe ser opcional.

Propuesta:

### Quick Start

El usuario puede activar:

```text
☑ Crear automáticamente una tarea inicial
```

Esto crea una tarea inicial basada en la actividad.

Pero el usuario puede:

- editarla;
- eliminarla;
- dividirla;
- crear nuevas tareas.

---

# 10. TRAZABILIDAD COMPLETA

Debe ser posible navegar en ambos sentidos.

Desde una tarea:

```text
Kanban Task
      ↓
Project Activity
      ↓
CAME Action
      ↓
Investigation
```

Y desde una investigación:

```text
Investigation
      ↓
CAME Action
      ↓
Projects
      ↓
Activities
      ↓
Kanban Tasks
```

---

# 11. TRAZABILIDAD EN LA UI

En el detalle de una tarea Kanban, mostrar:

```text
ORIGEN ESTRATÉGICO

Investigación
Transformación Digital 2026

CAME
CORREGIR

Acción
Implementar programa de capacitación

Factor relacionado
D-04 — Bajo nivel de competencias digitales
```

Mostrar estos datos solo cuando la tarea tenga origen en Research.

Las tareas independientes no deben requerir esta información.

---

# 12. RESPONSABLES

Las reglas existentes de Teams deben respetarse.

Un responsable debe cumplir:

```text
Tenant Member
      ↓
Workspace Member
      ↓
Team Member
      ↓
Project Member
      ↓
Eligible Assignee
```

Nunca permitir:

```text
usuario externo al Team
      ↓
asignado como responsable
```

aunque manipule el frontend o API.

Validar siempre en backend.

---

# 13. RESPONSABLE DE ACCIÓN VS RESPONSABLE DE TAREA

Estos niveles pueden ser diferentes.

Ejemplo:

```text
Acción CAME
Responsable: Project Leader
```

Mientras:

```text
Actividad
Responsable: Analista
```

Y:

```text
Kanban Task
Responsable: Especialista técnico
```

Todos deben pertenecer al Team autorizado.

No asumir que un único responsable debe ejecutar todo.

---

# 14. PRESUPUESTO

El presupuesto puede existir en diferentes niveles.

```text
Project Budget
      ↓
Activity Budget
      ↓
Task Cost (opcional)
```

Antes de implementar campos nuevos, buscar si ya existen:

```text
budget
cost
estimated_cost
actual_cost
amount
```

---

# 15. REGLA DE PRESUPUESTO

No duplicar el presupuesto en múltiples niveles sin una razón clara.

Ejemplo:

```text
Project Budget
$100,000
```

Distribución:

```text
Activity A     $25,000
Activity B     $40,000
Activity C     $20,000
```

Mostrar:

```text
Asignado:   $85,000
Disponible: $15,000
```

Si existen costos de tareas:

```text
Task costs
```

pueden contribuir al costo ejecutado, pero no deben romper el modelo presupuestario existente.

---

# 16. FECHAS

Debe existir coherencia:

```text
Project
01 Jan → 30 Jun

Activity
01 Feb → 30 Mar

Task
10 Feb → 20 Feb
```

Validar:

```text
Task dates
⊆
Activity dates
```

cuando exista una relación Activity.

Y:

```text
Activity dates
⊆
Project dates
```

Permitir excepciones solo si el dominio actual del proyecto ya contempla extensiones.

---

# 17. KANBAN

Reutilizar completamente el módulo actual:

```text
src/features/kanban/
```

y la entidad:

```text
KanbanTask
```

No crear un segundo Kanban.

Investigar:

- columnas;
- estados;
- orden;
- assignee_ids;
- project_id;
- permisos;
- creación;
- actualización;
- drag & drop;
- métricas.

La integración debe utilizar esos mecanismos.

---

# 18. PROJECT PROGRESS

El progreso del proyecto debería poder calcularse utilizando actividades y tareas existentes.

Ejemplo:

```text
Project
       │
       ▼
Activities
       │
       ▼
Tasks
```

Métricas:

```text
Total Tasks
Completed
In Progress
Pending
Blocked
```

Si el sistema ya calcula estas métricas:

> reutilizar.

No crear un segundo sistema de progreso.

---

# 19. SUMMARY

La card:

```text
Proyectos de implementación
```

debe reflejar la ejecución real.

Mostrar:

```text
Projects: 3

Activities: 24

Tasks: 42

Completed: 18

In Progress: 12

Pending: 12

Budget: $125,000
```

Usar únicamente métricas que puedan obtenerse correctamente del modelo existente.

---

# 20. ENTITLEMENTS

Toda la nueva funcionalidad debe respetar:

- capabilities existentes;
- entitlement evaluator existente;
- billing;
- usage;
- plan limits.

Antes de permitir:

```text
Create Project
Create Activity
Create Task
Export Full Report
```

revisar si ya existen capabilities o quotas equivalentes.

NO crear un sistema paralelo.

---

# 21. API Y SERVICIOS

Buscar primero:

```text
/api/projects
/api/kanban
/api/investigations
```

y los services correspondientes.

Extender la arquitectura existente.

No crear APIs redundantes.

Ejemplo:

Evitar:

```text
/api/research-project-builder
```

si el flujo puede implementarse mediante:

```text
ProjectService
InvestigationService
KanbanService
```

o los servicios reales existentes.

---

# 22. TRANSACCIÓN DE CREACIÓN

La creación de un proyecto desde CAME puede incluir:

```text
Create Project
+
Associate CAME Actions
+
Create Activities
+
Create Initial Kanban Tasks
+
Assign Members
+
Assign Budgets
```

Debe evitar estados inconsistentes.

Si una operación crítica falla:

```text
NO dejar:

Project creado
pero
Activities inexistentes
```

Utilizar transacciones o el patrón de orquestación existente.

---

# 23. IDEMPOTENCIA

Evitar:

```text
Double Click
      ↓
Duplicate Project
```

y:

```text
Retry Request
      ↓
Duplicate Activities
```

Buscar primero si existe infraestructura de idempotencia.

Reutilizarla.

---

# 24. MIGRACIONES

Antes de crear migraciones:

auditar:

```text
projects
kanban_tasks
teams
team_members
project_members
investigations
came actions
budget fields
RLS policies
```

Solo crear migraciones mínimas.

Si no existe un nivel intermedio adecuado entre:

```text
Project
↓
KanbanTask
```

entonces proponer:

```text
ProjectActivity
```

Pero justificarlo explícitamente.

---

# 25. PROPUESTA DE RELACIONES SI EL MODELO ACTUAL NO LAS SOPORTA

Solo como referencia conceptual:

```text
investigations
      │
      ▼
came_actions
      │
      ▼
projects
      │
      ▼
project_activities
      │
      ▼
kanban_tasks
```

Relaciones posibles:

```text
ProjectActivity
------------------
id
project_id
came_action_id
title
description
owner_user_id
start_date
end_date
budget
status
created_at
```

Y:

```text
KanbanTask
------------------
...
project_activity_id
```

PERO:

NO implementar esto sin confirmar que el repositorio actual no dispone de una estructura equivalente.

---

# 26. SNAPSHOT

Cuando una acción CAME se convierte en actividad del proyecto:

preservar trazabilidad histórica.

Evaluar guardar:

```text
came_snapshot
```

con datos relevantes:

- texto de la acción;
- categoría CAME;
- factor;
- estrategia;
- prioridad.

No copiar toda la investigación.

El snapshot debe ser mínimo.

---

# 27. INFORME COMPLETO

La jerarquía debe aparecer en el informe completo:

```text
INVESTIGACIÓN

↓

CAME

↓

PROYECTOS

↓

ACTIVIDADES

↓

TAREAS KANBAN
```

Ejemplo:

```text
PROYECTO

Transformación Digital

Presupuesto: $125,000
Progreso: 57%

ACTIVIDAD

Implementar capacitación

Origen:
CAME → CORREGIR

TAREAS

✓ Analizar necesidades
✓ Diseñar programa
◐ Preparar materiales
○ Ejecutar capacitación
```

---

# 28. TESTS

Crear o actualizar tests para:

### Jerarquía

- Investigación → CAME.
- CAME → Project.
- Project → Activity.
- Activity → Task.

### Multiplicidad

- Una acción → múltiples actividades.
- Una actividad → múltiples tareas.
- Una investigación → múltiples proyectos.

### Seguridad

- Cross tenant rechazado.
- Cross workspace rechazado.
- Cross team rechazado.
- Assignee inválido rechazado.

### Fechas

- Activity fuera del Project rechazada.
- Task fuera de Activity rechazada cuando corresponda.

### Budget

- Distribución correcta.
- Exceso rechazado.

### Idempotencia

- Double submit.
- Retry.

---

# 29. ENTREGABLE ANTES DE IMPLEMENTAR

Antes de modificar código, generar:

## A. Current Architecture

```text
CAME:
...

Projects:
...

Activities:
...

Kanban:
...

Relationships:
...
```

## B. Decision

Responder explícitamente:

```text
¿Existe actualmente una entidad equivalente a Project Activity?

SI / NO

Evidencia:

archivos:
...

tablas:
...

tipos:
...
```

## C. Proposed Implementation

```text
Reuse:
...

Extend:
...

New:
...
```

## D. Migration Plan

Únicamente migraciones realmente necesarias.

---

# 30. CRITERIO FINAL

La solución debe permitir dos escenarios.

## ESCENARIO SIMPLE

```text
Investigación
      ↓
Acción CAME
      ↓
Proyecto
      ↓
1 actividad
      ↓
1 tarea
```

## ESCENARIO COMPLEJO

```text
Investigación
      ↓
Acción CAME
      ↓
Proyecto
      ↓
5 actividades
      ↓
30 tareas Kanban
```

La arquitectura debe soportar ambos sin obligar al usuario a realizar planificación excesiva.

---

# REGLA FINAL

NO optimices solamente para crear tareas automáticamente.

Optimiza para:

- trazabilidad estratégica;
- planificación real;
- flexibilidad;
- proyectos pequeños;
- proyectos complejos;
- control de responsables;
- control presupuestario;
- seguimiento;
- seguridad;
- RBAC;
- Teams;
- tenant isolation;
- y reutilización máxima del código existente.

La pregunta que debe poder responder cualquier elemento operativo es:

> **¿Por qué existe esta tarea y qué problema estratégico está ayudando a resolver?**

La arquitectura ideal debe permitir navegar:

```text
Kanban Task
   ↓
Project Activity
   ↓
CAME Action
   ↓
Strategic Factor
   ↓
Evidence
   ↓
Investigation
```

Si consigues preservar esta cadena sin duplicar la infraestructura existente, la implementación será correcta.