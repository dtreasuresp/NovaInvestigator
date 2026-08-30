# \# SUPER PROMPT MAESTRO — NOVARESEARCH

# 

# \## Integración Research → CAME → Projects → Kanban + Exportación PDF/DOCX + Entitlements Comerciales

# 

# Eres un \*\*Principal Software Architect + Senior SaaS/ERP Engineer + Senior Product Designer\*\*, trabajando directamente sobre el repositorio real de GitHub:

# 

# \*\*Repository:\*\* `dtreasuresp/NovaResearch`

# 

# Este repositorio anteriormente se llamaba \*\*NovaInvestigator\*\* y actualmente se denomina \*\*NovaResearch\*\*.

# 

# Tu trabajo NO consiste en diseñar una arquitectura hipotética desde cero.

# 

# Tu trabajo consiste en:

# 

# > \*\*Auditar primero el código real existente, reutilizar todo lo que ya funciona y realizar únicamente las extensiones necesarias para implementar la integración Research → CAME → Projects → Kanban y la exportación documental, respetando completamente la arquitectura actual de NovaResearch, RBAC/RLS, Teams, Workspaces, Billing, Entitlements, Usage, Stripe y UI existente.\*\*

# 

# \---

# 

# \# 0. REGLA ABSOLUTA

# 

# \## NO DUPLICAR INFRAESTRUCTURA EXISTENTE

# 

# Antes de crear:

# 

# \* una tabla;

# \* una migración;

# \* un servicio;

# \* una API;

# \* un middleware;

# \* un guard;

# \* un sistema de permisos;

# \* un sistema de entitlements;

# \* un sistema de cuotas;

# \* un sistema de usage;

# \* un sistema de auditoría;

# \* un renderer;

# \* un sistema de miembros;

# \* un sistema de tareas;

# \* un componente global;

# 

# DEBES buscar primero si ya existe una implementación equivalente.

# 

# Si existe:

# 

# > \*\*REUTILIZARLA O EXTENDERLA.\*\*

# 

# No crear una segunda implementación conceptualmente equivalente.

# 

# \---

# 

# \# 1. EVIDENCIA YA IDENTIFICADA EN EL REPOSITORIO

# 

# Durante la auditoría previa se identificaron elementos reales que DEBES considerar como infraestructura existente.

# 

# Entre ellos:

# 

# \### Access / Entitlements

# 

# Existe infraestructura bajo:

# 

# ```text

# src/features/access/

# ```

# 

# incluyendo:

# 

# ```text

# entitlement-evaluator.ts

# capabilityManifest.ts

# ```

# 

# Existe un sistema centralizado para resolver capabilities/entitlements.

# 

# NO crear otro manifiesto paralelo.

# 

# \---

# 

# \### Billing

# 

# Existe infraestructura de Billing relacionada con:

# 

# ```text

# src/features/billing/

# src/lib/billing/

# ```

# 

# incluyendo integración con:

# 

# \* planes;

# \* subscriptions;

# \* Stripe;

# \* entitlements;

# \* usage;

# \* access;

# \* errores;

# \* schemas.

# 

# NO crear un sistema comercial paralelo.

# 

# \---

# 

# \### Usage

# 

# Existe:

# 

# ```text

# billing\_entitlement\_usage

# ```

# 

# con infraestructura de consumo de usage.

# 

# Existe además una función PostgreSQL para consumo atómico de entitlement/usage relacionada con exportaciones.

# 

# DEBES reutilizar este patrón.

# 

# \---

# 

# \### Exportación

# 

# Existe:

# 

# ```text

# src/app/api/investigations/\[id]/export/route.ts

# ```

# 

# y existe infraestructura de exportación/rendering PDF.

# 

# NO crear un pipeline de exportación paralelo si el actual puede extenderse.

# 

# \---

# 

# \### Teams / RBAC / RLS

# 

# Existe infraestructura de:

# 

# \* Tenant;

# \* Workspace;

# \* Team;

# \* Team members;

# \* roles;

# \* scopes;

# \* RLS;

# \* autorización.

# 

# DEBES reutilizarla.

# 

# \---

# 

# \### Kanban

# 

# Existe:

# 

# ```text

# src/features/kanban/

# ```

# 

# y existe:

# 

# ```text

# KanbanTask

# ```

# 

# que ya contempla, entre otros datos:

# 

# ```text

# project\_id

# assignee\_ids

# ```

# 

# Por tanto:

# 

# > NO crear otro sistema de tareas simplemente para Research → Projects.

# 

# Extender el sistema actual.

# 

# \---

# 

# \# 2. OBJETIVO FUNCIONAL

# 

# Implementar el ciclo completo:

# 

# ```text

# Research

# &#x20;  ↓

# Investigación

# &#x20;  ↓

# Análisis

# &#x20;  ↓

# DAFO / QSPM

# &#x20;  ↓

# CAME

# &#x20;  ↓

# Acciones estratégicas

# &#x20;  ↓

# Projects

# &#x20;  ↓

# Activities

# &#x20;  ↓

# Kanban

# &#x20;  ↓

# Responsables

# &#x20;  ↓

# Ejecución

# &#x20;  ↓

# Seguimiento

# &#x20;  ↓

# Informe completo

# ```

# 

# El resultado debe permitir que NovaResearch pase de:

# 

# > investigar y diagnosticar

# 

# a:

# 

# > convertir los resultados de la investigación en proyectos ejecutables y trazables.

# 

# \---

# 

# \# 3. LOS PROYECTOS SIGUEN SIENDO INDEPENDIENTES

# 

# NO convertir Projects en un submódulo obligatorio de Research.

# 

# Debe existir:

# 

# ```text

# Proyecto independiente

# ```

# 

# y:

# 

# ```text

# Proyecto derivado de investigación

# ```

# 

# Por tanto, conceptualmente:

# 

# ```text

# Project

# &#x20;  └── investigation\_id = NULL

# ```

# 

# para proyectos independientes.

# 

# Y:

# 

# ```text

# Project

# &#x20;  └── investigation\_id = UUID

# ```

# 

# para proyectos derivados de Research.

# 

# IMPORTANTE:

# 

# Primero inspecciona el schema real de Projects.

# 

# Si ya existe un campo equivalente:

# 

# > reutilizarlo.

# 

# No crear `investigation\_id` duplicado.

# 

# \---

# 

# \# 4. DOS PUNTOS DE ENTRADA PARA CREAR PROYECTOS

# 

# \## Entrada A — Research / Summary

# 

# Agregar en Summary una nueva card:

# 

# \# Proyectos de implementación

# 

# Debe mostrar como mínimo:

# 

# \* número de proyectos asociados;

# \* actividades planificadas;

# \* actividades en proceso;

# \* actividades completadas;

# \* actividades pendientes;

# \* progreso;

# \* presupuesto total;

# \* presupuesto asignado/ejecutado cuando esos datos existan.

# 

# Ejemplo conceptual:

# 

# ```text

# ┌──────────────────────────────────────────────┐

# │ PROYECTOS DE IMPLEMENTACIÓN                  │

# │                                              │

# │ 3 proyectos                                  │

# │                                              │

# │ 42 actividades       18 completadas         │

# │ 12 en proceso        12 pendientes          │

# │                                              │

# │ Progreso 57%                                 │

# │ ███████████░░░░░                             │

# │                                              │

# │ Presupuesto       $125,000                   │

# │ Asignado          $98,000                    │

# │                                              │

# │ \[Ver proyectos]      \[+ Crear proyecto]     │

# └──────────────────────────────────────────────┘

# ```

# 

# El botón:

# 

# ```text

# \+ Crear proyecto

# ```

# 

# debe abrir el wizard con la investigación actual preseleccionada.

# 

# \---

# 

# \# 5. ENTRADA B — PROJECTS

# 

# Desde Projects debe existir:

# 

# ```text

# \+ Nuevo proyecto

# ```

# 

# Al abrir:

# 

# ```text

# ¿Qué tipo de proyecto quieres crear?

# 

# ○ Proyecto independiente

# 

# ○ Proyecto derivado de una investigación

# ```

# 

# Si selecciona:

# 

# \### Proyecto independiente

# 

# usar el flujo normal existente de Projects.

# 

# \### Investigación existente

# 

# seleccionar una investigación y abrir:

# 

# > EXACTAMENTE EL MISMO WIZARD UTILIZADO DESDE Research/Summary.

# 

# NO duplicar el wizard.

# 

# Crear un componente/flujo reutilizable.

# 

# \---

# 

# \# 6. WIZARD DE PROYECTO DERIVADO DE INVESTIGACIÓN

# 

# El wizard tendrá exactamente estos cinco pasos.

# 

# \---

# 

# \# PASO 1 — INFORMACIÓN DE PERTENENCIA

# 

# Mostrar:

# 

# \* Investigación;

# \* Tenant;

# \* Workspace;

# \* Team;

# \* Team Leader.

# 

# La investigación determina el contexto organizacional.

# 

# El usuario NO debe poder cambiar arbitrariamente:

# 

# ```text

# tenant\_id

# workspace\_id

# team\_id

# ```

# 

# si estos ya están determinados por la investigación.

# 

# El backend debe obtener y validar estos valores.

# 

# Nunca confiar exclusivamente en IDs enviados desde el frontend.

# 

# \---

# 

# \# 7. PARTICIPANTES Y RESPONSABLES

# 

# Regla fundamental:

# 

# ```text

# Tenant member

# &#x20;      ↓

# Workspace member

# &#x20;      ↓

# Team member

# &#x20;      ↓

# Eligible project member

# ```

# 

# Un usuario que no pertenezca al Team de la investigación NO puede:

# 

# \* ser miembro del proyecto;

# \* ser líder;

# \* ser responsable de una actividad.

# 

# Incluso aunque el usuario manipule la petición HTTP.

# 

# \---

# 

# \# 8. REGLA DEL PROJECT LEADER

# 

# Por defecto:

# 

# ```text

# Project Leader = Team Leader

# ```

# 

# El líder heredado debe aparecer preseleccionado.

# 

# El investigador puede cambiarlo únicamente a:

# 

# ```text

# active member of the same Team

# ```

# 

# El nuevo líder debe pertenecer al proyecto.

# 

# Si es necesario, añadirlo automáticamente como Project Member.

# 

# Validar esta regla en backend y, cuando sea posible, en la capa de datos/RLS.

# 

# \---

# 

# \# 9. PASO 2 — DATOS DEL PROYECTO

# 

# Mostrar:

# 

# \* Nombre;

# \* Descripción;

# \* Objetivo;

# \* Prioridad;

# \* Fecha de inicio;

# \* Fecha de fin.

# 

# Validaciones:

# 

# \* nombre obligatorio;

# \* fechas coherentes;

# \* fecha final >= fecha inicial;

# \* respetar restricciones existentes del dominio Projects.

# 

# No duplicar validadores existentes.

# 

# \---

# 

# \# 10. PASO 3 — IMPORTACIÓN DE CAME

# 

# Mostrar las acciones existentes en CAME de la investigación.

# 

# Agrupar visualmente:

# 

# ```text

# CORREGIR

# 

# AFRONTAR

# 

# MANTENER

# 

# EXPLOTAR

# ```

# 

# Cada acción debe mostrar contexto suficiente para que el investigador pueda decidir.

# 

# Por ejemplo:

# 

# \* acción;

# \* categoría CAME;

# \* estrategia relacionada;

# \* factor origen;

# \* prioridad;

# \* contexto/evidencia disponible;

# \* si ya está vinculada a otro proyecto.

# 

# Permitir:

# 

# ```text

# ☑ Acción 1

# ☐ Acción 2

# ☑ Acción 3

# ```

# 

# \---

# 

# \# 11. UNA INVESTIGACIÓN PUEDE GENERAR VARIOS PROYECTOS

# 

# NO asumir:

# 

# ```text

# 1 investigación = 1 proyecto

# ```

# 

# Debe ser posible:

# 

# ```text

# Investigación

# &#x20;  ├── Proyecto A

# &#x20;  ├── Proyecto B

# &#x20;  └── Proyecto C

# ```

# 

# Y:

# 

# ```text

# Proyecto A

# &#x20;  ├── CAME Action 1

# &#x20;  ├── CAME Action 2

# &#x20;  └── CAME Action 5

# ```

# 

# Mientras:

# 

# ```text

# Proyecto B

# &#x20;  ├── CAME Action 3

# &#x20;  └── CAME Action 4

# ```

# 

# La UI debe mostrar claramente qué acciones se están importando.

# 

# \---

# 

# \# 12. TRAZABILIDAD CAME → PROJECT

# 

# Toda acción importada debe conservar trazabilidad.

# 

# Debe ser posible responder:

# 

# ```text

# ¿De qué acción CAME provino esta actividad?

# ```

# 

# y:

# 

# ```text

# ¿En qué proyecto terminó esta acción CAME?

# ```

# 

# Utilizar FK/relación existente cuando sea posible.

# 

# Si no existe una relación adecuada, diseñar una tabla de asociación.

# 

# NO duplicar la información completa innecesariamente.

# 

# \---

# 

# \# 13. SNAPSHOT DE CAME

# 

# Cuando una acción CAME sea importada a un proyecto, evaluar la necesidad de guardar un snapshot de los datos estratégicos relevantes.

# 

# Objetivo:

# 

# Si CAME cambia posteriormente:

# 

# ```text

# Proyecto histórico

# ```

# 

# no debe cambiar silenciosamente.

# 

# El snapshot debe ser mínimo y contener solo los datos necesarios para preservar trazabilidad histórica.

# 

# No duplicar toda la investigación.

# 

# \---

# 

# \# 14. PASO 4 — PRESUPUESTO

# 

# El wizard debe soportar DOS MODOS.

# 

# \## MODO A — PRESUPUESTO DERIVADO DE LAS ACCIONES

# 

# Cada acción puede tener:

# 

# ```text

# Presupuesto

# ```

# 

# Ejemplo:

# 

# ```text

# Acción 1     $10,000

# Acción 2     $25,000

# Acción 3     $15,000

# 

# TOTAL        $50,000

# ```

# 

# El total del proyecto debe calcularse automáticamente:

# 

# ```text

# project\_total =

# SUM(action\_budget)

# ```

# 

# \---

# 

# \# 15. MODO B — PRESUPUESTO TOTAL PRIMERO

# 

# El investigador puede definir:

# 

# ```text

# Presupuesto total:

# 

# $100,000

# ```

# 

# y posteriormente distribuir:

# 

# ```text

# Acción 1     $20,000

# Acción 2     $30,000

# Acción 3     $15,000

# 

# Asignado     $65,000

# Disponible   $35,000

# ```

# 

# Mostrar visualmente:

# 

# ```text

# █████████████░░░░░░░

# 65%

# ```

# 

# \---

# 

# \# 16. REGLAS DEL PRESUPUESTO

# 

# Debe existir:

# 

# ```text

# budget\_mode

# ```

# 

# equivalente a:

# 

# ```text

# action\_based

# total\_first

# ```

# 

# usar nombres consistentes con el schema existente si ya existe un enum equivalente.

# 

# En modo `total\_first`:

# 

# ```text

# SUM(action budgets) <= project budget

# ```

# 

# Nunca permitir:

# 

# ```text

# SUM(action budgets) > project budget

# ```

# 

# La validación debe existir:

# 

# \* en UI;

# \* en service/API;

# \* en backend/database cuando sea apropiado.

# 

# \---

# 

# \# 17. NO CONFUNDIR PROJECT CON KANBAN

# 

# Kanban es el mecanismo de ejecución/visualización.

# 

# Project es el dominio empresarial.

# 

# NO duplicar tareas solo porque se necesita presupuesto.

# 

# Primero revisar el modelo real:

# 

# ```text

# Project

# KanbanTask

# ```

# 

# y determinar cuál representa actualmente la actividad empresarial.

# 

# Si `KanbanTask` ya representa la actividad:

# 

# > extenderlo cuidadosamente.

# 

# Si existe una entidad Project Activity independiente:

# 

# > reutilizarla.

# 

# NO crear una tercera entidad equivalente.

# 

# \---

# 

# \# 18. PASO 5 — ACTIVIDADES + RESPONSABLES

# 

# Mostrar las acciones seleccionadas en Paso 3.

# 

# Cada una debe permitir:

# 

# \* responsable;

# \* fecha inicial;

# \* fecha final;

# \* prioridad;

# \* presupuesto;

# \* estado.

# 

# El responsable debe seleccionarse exclusivamente de:

# 

# ```text

# active members of project Team

# ```

# 

# \---

# 

# \# 19. KANBAN

# 

# Aprovechar el sistema existente.

# 

# `KanbanTask` ya tiene soporte relacionado con:

# 

# ```text

# project\_id

# assignee\_ids

# ```

# 

# Utilizarlo.

# 

# La creación del proyecto debe poder generar las tareas/actividades necesarias en Kanban mediante la infraestructura existente.

# 

# No crear otro Kanban.

# 

# \---

# 

# \# 20. ENTITLEMENTS COMERCIALES

# 

# ESTA PARTE ES OBLIGATORIA.

# 

# NovaResearch ya tiene infraestructura real para:

# 

# \* capabilities;

# \* entitlements;

# \* plans;

# \* subscriptions;

# \* billing;

# \* usage;

# \* Stripe.

# 

# DEBES reutilizarla.

# 

# NO crear:

# 

# ```text

# CommercialPolicyService paralelo

# 

# plan\_entitlements\_v2

# 

# project\_usage separado

# 

# export\_usage separado

# 

# capabilityManifest paralelo

# ```

# 

# \---

# 

# \# 21. DISTINGUIR TRES COSAS

# 

# \## RBAC

# 

# Pregunta:

# 

# ```text

# ¿Puede este usuario ejecutar la acción?

# ```

# 

# \## Entitlement

# 

# Pregunta:

# 

# ```text

# ¿El plan permite esta funcionalidad?

# ```

# 

# \## Usage / Quota

# 

# Pregunta:

# 

# ```text

# ¿Todavía existe capacidad disponible?

# ```

# 

# Una acción comercialmente restringida requiere las validaciones correspondientes.

# 

# \---

# 

# \# 22. PROJECT CREATION + ENTITLEMENT

# 

# Antes de crear un proyecto:

# 

# ```text

# Authentication

# ↓

# Tenant Scope

# ↓

# Workspace Scope

# ↓

# Team Scope

# ↓

# RBAC

# ↓

# Existing Entitlement Evaluation

# ↓

# Usage / Quota

# ↓

# Create Project

# ```

# 

# La UI puede hacer un pre-check.

# 

# Pero el backend DEBE volver a validar.

# 

# Nunca confiar en el frontend.

# 

# \---

# 

# \# 23. CONCURRENCIA

# 

# Si el límite es:

# 

# ```text

# 10 proyectos

# ```

# 

# y existen:

# 

# ```text

# 9 proyectos

# ```

# 

# dos usuarios no pueden crear simultáneamente dos proyectos y terminar con:

# 

# ```text

# 11 proyectos

# ```

# 

# La operación debe ser atómica.

# 

# Utilizar los mecanismos ya existentes de Billing/Usage cuando sean aplicables.

# 

# \---

# 

# \# 24. LÍMITES DE PARTICIPANTES

# 

# Si el plan limita:

# 

# ```text

# members per project

# ```

# 

# utilizar el entitlement existente.

# 

# Si limita usuarios totales:

# 

# ```text

# tenant users

# ```

# 

# respetar ese sistema.

# 

# NO inventar una política comercial diferente.

# 

# \---

# 

# \# 25. EXPORTACIÓN

# 

# En Summary implementar una barra global utilizando:

# 

# ```text

# Shadcn Menubar

# ```

# 

# Utilizar la infraestructura y estructura real del proyecto.

# 

# Antes de instalar nada:

# 

# ```text

# revisar components.json

# ```

# 

# y determinar:

# 

# \* alias;

# \* estructura;

# \* componentes existentes;

# \* package manager.

# 

# Instalar `menubar` solamente si no existe.

# 

# \---

# 

# \# 26. MENUBAR GLOBAL DE RESEARCH

# 

# Centralizar las acciones actualmente distribuidas por las diferentes pantallas.

# 

# Propuesta:

# 

# ```text

# Investigación

# Análisis

# Acciones

# Exportar

# Vista

# ```

# 

# Ejemplo:

# 

# ```text

# Investigación

# ├── Resumen

# ├── Metodología

# ├── Evidencias

# └── Configuración

# 

# Análisis

# ├── EFI

# ├── EFE

# ├── DAFO

# ├── QSPM

# └── Diagnóstico

# 

# Acciones

# ├── CAME

# ├── Crear proyecto

# └── Ver proyectos

# 

# Exportar

# ├── Informe resumen

# │   ├── PDF

# │   └── DOCX

# │

# └── Informe completo

# &#x20;   ├── PDF

# &#x20;   └── DOCX

# 

# Vista

# ├── Dashboard

# └── Kanban

# ```

# 

# Adaptar las opciones a las rutas y capacidades reales del repositorio.

# 

# \---

# 

# \# 27. EXPORTACIÓN — DOS TIPOS DE INFORME

# 

# \## A. INFORME RESUMEN DEL DIAGNÓSTICO METODOLÓGICO

# 

# Debe contener exclusivamente:

# 

# > el informe resumen generado por NovAi.

# 

# NO incluir el informe completo de la investigación.

# 

# Formatos:

# 

# ```text

# PDF

# DOCX

# ```

# 

# \---

# 

# \# 28. INFORME COMPLETO DE INVESTIGACIÓN

# 

# Debe contener toda la información escrita necesaria para que el investigador pueda conservar/entregar la investigación.

# 

# Contenido mínimo:

# 

# 1\. Información general.

# 2\. Problema.

# 3\. Objetivos.

# 4\. Contexto.

# 5\. Metodología.

# 6\. Evidencias.

# 7\. Fuentes.

# 8\. EFI.

# 9\. EFE.

# 10\. DAFO.

# 11\. Relaciones estratégicas.

# 12\. QSPM.

# 13\. CAME.

# 14\. Diagnóstico metodológico.

# 15\. Confianza metodológica.

# 16\. Confianza epistemológica.

# 17\. Trazabilidad.

# 18\. Proyectos derivados.

# 19\. Actividades.

# 20\. Responsables.

# 21\. Estado de ejecución.

# 22\. Presupuesto.

# 23\. Conclusiones.

# 

# Adaptar este contenido a las entidades y datos realmente disponibles.

# 

# No inventar información inexistente.

# 

# \---

# 

# \# 29. EXPORTACIÓN + PROJECTS

# 

# El informe completo debe incorporar los proyectos existentes vinculados con esa investigación.

# 

# Si existen:

# 

# ```text

# Investigación

# &#x20;  ├── Project A

# &#x20;  └── Project B

# ```

# 

# el informe debe incluirlos.

# 

# Mostrar:

# 

# \* nombre;

# \* objetivo;

# \* fechas;

# \* líder;

# \* responsables;

# \* acciones CAME relacionadas;

# \* actividades;

# \* estados;

# \* presupuesto;

# \* progreso.

# 

# \---

# 

# \# 30. EXPORTACIÓN + ENTITLEMENTS

# 

# Antes de exportar:

# 

# ```text

# Authentication

# ↓

# Tenant Scope

# ↓

# RBAC

# ↓

# Existing Capability Check

# ↓

# Existing Entitlement Check

# ↓

# Existing Usage / Quota Check

# ↓

# Generate

# ```

# 

# El repo ya dispone de infraestructura de consumo atómico para exportación PDF.

# 

# Reutilizarla.

# 

# No crear otro sistema.

# 

# \---

# 

# \# 31. EXPORTACIONES Y CUOTAS

# 

# Separar:

# 

# ```text

# Capability

# ```

# 

# de:

# 

# ```text

# Quota

# ```

# 

# Ejemplo conceptual:

# 

# ```text

# El plan incluye exportación completa

# ```

# 

# pero:

# 

# ```text

# 10 exportaciones mensuales

# ```

# 

# La primera pregunta es:

# 

# ```text

# ¿La funcionalidad está incluida?

# ```

# 

# La segunda:

# 

# ```text

# ¿Todavía tiene cuota?

# ```

# 

# \---

# 

# \# 32. CUÁNDO CONSUMIR LA EXPORTACIÓN

# 

# No consumir usage cuando:

# 

# \* se abre el menú;

# \* se abre el diálogo;

# \* se selecciona PDF;

# \* se inicia una descarga.

# 

# Consumir cuando:

# 

# ```text

# document successfully generated

# ```

# 

# Si el mecanismo existente soporta reserva/confirmación:

# 

# ```text

# Reserve

# ↓

# Generate

# ↓

# Success → Confirm

# Failure → Release

# ```

# 

# Reutilizar el mecanismo actual.

# 

# \---

# 

# \# 33. EXPORTACIÓN PDF Y DOCX

# 

# Antes de implementar:

# 

# buscar:

# 

# ```text

# pdf

# docx

# report

# renderer

# export

# download

# document

# ```

# 

# y localizar:

# 

# \* librerías;

# \* templates;

# \* helpers;

# \* renderers;

# \* rutas;

# \* servicios.

# 

# Si PDF ya está implementado:

# 

# > extender el pipeline existente.

# 

# Para DOCX:

# 

# > reutilizar el mismo modelo documental si es posible.

# 

# Idealmente:

# 

# ```text

# ResearchReportModel

# &#x20;      │

# &#x20;      ├── PDF Renderer

# &#x20;      └── DOCX Renderer

# ```

# 

# No crear dos fuentes de verdad.

# 

# \---

# 

# \# 34. EXPORT HISTORY

# 

# Antes de crear una tabla:

# 

# buscar si existe:

# 

# \* audit log;

# \* export history;

# \* activity log;

# \* document history.

# 

# Si existe, reutilizar.

# 

# Si no existe y realmente es necesario, diseñar la mínima persistencia requerida.

# 

# \---

# 

# \# 35. SUMMARY — USO COMERCIAL

# 

# No convertir Summary en Billing.

# 

# El uso comercial debe ser contextual.

# 

# Cuando sea apropiado:

# 

# ```text

# Uso del plan

# 

# Investigaciones

# 4 / 10

# 

# Proyectos

# 3 / 10

# 

# Exportaciones

# 8 / 10

# ```

# 

# Usar las métricas reales existentes.

# 

# No hardcodear límites.

# 

# \---

# 

# \# 36. UX PARA LÍMITES

# 

# Nunca mostrar únicamente:

# 

# ```text

# disabled

# ```

# 

# sin explicación.

# 

# Si no tiene entitlement:

# 

# ```text

# Esta funcionalidad no está incluida en tu plan actual.

# ```

# 

# Si agotó cuota:

# 

# ```text

# Has alcanzado el límite incluido en tu plan.

# ```

# 

# Si corresponde:

# 

# ```text

# \[Ver opciones del plan]

# ```

# 

# Utilizar la infraestructura comercial existente para determinar qué CTA corresponde.

# 

# \---

# 

# \# 37. MIGRACIONES — REGLA PRINCIPAL

# 

# ANTES DE CREAR CUALQUIER MIGRACIÓN:

# 

# auditar:

# 

# ```text

# projects

# project\_members

# kanban\_tasks

# teams

# team\_members

# investigations

# came

# billing\_entitlement\_usage

# plan\_entitlements

# subscriptions

# audit

# ```

# 

# y todas las relaciones FK/RLS existentes.

# 

# \---

# 

# \# 38. POSIBLES EXTENSIONES DE PROJECT

# 

# SOLO SI NO EXISTEN YA:

# 

# ```text

# investigation\_id

# team\_id

# workspace\_id

# leader\_user\_id

# budget\_total

# budget\_mode

# ```

# 

# No crear ninguna si ya existe un equivalente.

# 

# \---

# 

# \# 39. RELACIÓN PROJECT ↔ CAME

# 

# Si no existe una relación adecuada, considerar:

# 

# ```text

# project\_came\_actions

# ```

# 

# con:

# 

# ```text

# id

# project\_id

# came\_action\_id

# created\_at

# created\_by

# snapshot

# ```

# 

# Pero primero revisar si el modelo actual permite resolverlo mediante una relación existente.

# 

# \---

# 

# \# 40. PROJECT MEMBERS

# 

# Si ya existe:

# 

# > reutilizar.

# 

# Si no existe:

# 

# ```text

# project\_members

# ```

# 

# con:

# 

# ```text

# project\_id

# user\_id

# role

# created\_at

# ```

# 

# y validación de pertenencia al Team.

# 

# \---

# 

# \# 41. PRESUPUESTO

# 

# Primero buscar:

# 

# ```text

# budget

# cost

# amount

# financial

# project\_budget

# task\_budget

# ```

# 

# Si existe una estructura adecuada:

# 

# > extenderla.

# 

# Si no existe:

# 

# diseñar la estructura mínima necesaria.

# 

# Evitar almacenar el mismo valor en múltiples tablas salvo que sea un snapshot o agregado calculado deliberadamente.

# 

# \---

# 

# \# 42. RLS

# 

# Todas las nuevas relaciones deben respetar:

# 

# ```text

# Tenant

# ↓

# Workspace

# ↓

# Team

# ↓

# Research

# ↓

# Project

# ↓

# Activity

# ```

# 

# Nunca permitir acceso cross-tenant.

# 

# Nunca permitir:

# 

# ```text

# Team A → Project Team B

# ```

# 

# por manipulación del frontend.

# 

# \---

# 

# \# 43. AUDITORÍA

# 

# Buscar primero el sistema de audit existente.

# 

# Registrar, utilizando ese sistema:

# 

# ```text

# project.created

# project.member\_added

# project.member\_removed

# project.leader\_changed

# project.came\_action\_imported

# project.budget\_updated

# research.export\_requested

# research.export\_completed

# commercial.quota\_rejected

# ```

# 

# Adaptar los nombres al sistema de eventos real.

# 

# No crear otro audit log.

# 

# \---

# 

# \# 44. API

# 

# Buscar primero APIs existentes para:

# 

# \* projects;

# \* tasks;

# \* members;

# \* teams;

# \* investigations;

# \* exports.

# 

# Extender APIs existentes cuando sea correcto.

# 

# Evitar:

# 

# ```text

# /api/v2/projects

# ```

# 

# si `/api/projects` ya es la API canónica.

# 

# \---

# 

# \# 45. FRONTEND

# 

# Respetar:

# 

# \* React;

# \* Next.js;

# \* TypeScript;

# \* Tailwind;

# \* Shadcn;

# \* componentes existentes;

# \* design tokens;

# \* dark/light mode;

# \* accesibilidad.

# 

# No crear un nuevo sistema visual.

# 

# \---

# 

# \# 46. UX DEL WIZARD

# 

# El wizard debe:

# 

# \* mostrar progreso;

# \* permitir volver atrás;

# \* conservar datos;

# \* validar cada paso;

# \* mostrar errores contextualizados;

# \* calcular presupuesto en tiempo real;

# \* mostrar responsables elegibles;

# \* mostrar restricciones comerciales;

# \* evitar pérdida de información.

# 

# Antes del submit final:

# 

# ```text

# Review

# ```

# 

# mostrar:

# 

# ```text

# Proyecto

# Team

# Leader

# Acciones CAME

# Actividades

# Responsables

# Presupuesto

# Fechas

# ```

# 

# \---

# 

# \# 47. REVIEW FINAL DEL WIZARD

# 

# Ejemplo:

# 

# ```text

# ┌──────────────────────────────────────────┐

# │ Revisar proyecto                         │

# │                                          │

# │ Proyecto                                 │

# │ Transformación Digital 2026              │

# │                                          │

# │ Team                                     │

# │ Innovación                               │

# │                                          │

# │ Líder                                    │

# │ Juan Pérez                               │

# │                                          │

# │ Acciones                                 │

# │ 6                                         │

# │                                          │

# │ Actividades                              │

# │ 14                                        │

# │                                          │

# │ Presupuesto                              │

# │ $125,000                                 │

# │                                          │

# │ \[Atrás]              \[Crear proyecto]   │

# └──────────────────────────────────────────┘

# ```

# 

# \---

# 

# \# 48. ERROR HANDLING

# 

# Distinguir:

# 

# ```text

# 403 → no autorizado

# 

# 403/entitlement → funcionalidad no incluida

# 

# quota exceeded → límite alcanzado

# 

# 400 → datos inválidos

# 

# 404 → recurso inexistente

# 

# 409 → conflicto

# 

# 422 → validación de dominio

# 

# 500 → error interno

# ```

# 

# Usar los errores estándar existentes.

# 

# No crear un sistema de errores paralelo.

# 

# \---

# 

# \# 49. IDEMPOTENCIA

# 

# La creación del proyecto desde CAME debe ser idempotente.

# 

# Evitar:

# 

# ```text

# doble click

# ↓

# dos proyectos

# ```

# 

# o:

# 

# ```text

# retry

# ↓

# duplicar actividades

# ```

# 

# Usar el mecanismo de idempotencia existente en el repo si existe.

# 

# Si no existe para esta operación, implementar uno compatible con los patrones actuales.

# 

# \---

# 

# \# 50. TRANSACCIÓN

# 

# La creación desde CAME debe considerarse una operación compuesta:

# 

# ```text

# Create Project

# \+

# Import CAME Actions

# \+

# Create Activities

# \+

# Assign Members

# \+

# Assign Budget

# \+

# Create Kanban Tasks

# ```

# 

# No dejar el sistema en un estado parcialmente creado si una operación crítica falla.

# 

# Utilizar transacción/RPC/backend orchestration según la arquitectura actual.

# 

# \---

# 

# \# 51. TESTS OBLIGATORIOS

# 

# Crear/actualizar tests para:

# 

# \## Authorization

# 

# \* usuario autorizado;

# \* usuario no autorizado.

# 

# \## Tenant isolation

# 

# \* usuario de Tenant A no accede a Tenant B.

# 

# \## Team isolation

# 

# \* miembro de Team A no puede ser responsable de Team B.

# 

# \## Leader

# 

# \* Team Leader válido;

# \* leader externo rechazado;

# \* leader de otro Team rechazado.

# 

# \## Commercial

# 

# \* entitlement permitido;

# \* entitlement denegado;

# \* quota disponible;

# \* quota agotada.

# 

# \## Projects

# 

# \* standalone;

# \* derived from investigation.

# 

# \## CAME

# 

# \* importar una acción;

# \* importar múltiples;

# \* trazabilidad;

# \* snapshot.

# 

# \## Budget

# 

# \* action based;

# \* total first;

# \* suma válida;

# \* exceso rechazado.

# 

# \## Export

# 

# \* summary PDF;

# \* summary DOCX;

# \* full PDF;

# \* full DOCX;

# \* entitlement denied;

# \* quota exhausted;

# \* renderer failure;

# \* successful generation.

# 

# \## Idempotency

# 

# \* double submit;

# \* retry.

# 

# \## Concurrency

# 

# \* dos requests simultáneos contra el último slot de quota.

# 

# \---

# 

# \# 52. PLAN DE IMPLEMENTACIÓN

# 

# NO modificar todo de una vez.

# 

# Trabajar incrementalmente.

# 

# \## FASE 1

# 

# Auditoría y mapa de dependencias.

# 

# Entregar:

# 

# ```text

# Existing

# Reusable

# Extend

# New

# ```

# 

# \## FASE 2

# 

# Schema/migrations mínimas.

# 

# \## FASE 3

# 

# Domain/service de Research → Project.

# 

# \## FASE 4

# 

# Wizard.

# 

# \## FASE 5

# 

# Kanban integration.

# 

# \## FASE 6

# 

# Summary card.

# 

# \## FASE 7

# 

# Menubar.

# 

# \## FASE 8

# 

# Exportación PDF/DOCX.

# 

# \## FASE 9

# 

# Entitlements/usage.

# 

# \## FASE 10

# 

# Tests.

# 

# \## FASE 11

# 

# Browser verification.

# 

# \---

# 

# \# 53. NO HACER TODO EN UNA SOLA MIGRACIÓN GIGANTE

# 

# Las migraciones deben ser:

# 

# \* pequeñas;

# \* reversibles cuando sea razonable;

# \* ordenadas;

# \* consistentes con las convenciones actuales.

# 

# No modificar tablas de Billing innecesariamente.

# 

# \---

# 

# \# 54. DEFINITION OF DONE

# 

# La implementación solo está terminada cuando:

# 

# \### Research

# 

# \* Summary muestra proyectos.

# \* CAME puede crear proyectos.

# 

# \### Projects

# 

# \* Se pueden crear proyectos independientes.

# \* Se pueden crear proyectos desde investigación.

# 

# \### Wizard

# 

# \* 5 pasos completos.

# \* Validación.

# \* Review.

# \* Idempotencia.

# 

# \### Teams

# 

# \* Scope correcto.

# \* Leader heredado.

# \* Participantes válidos.

# 

# \### CAME

# 

# \* Acciones seleccionables.

# \* Trazabilidad.

# \* Snapshot cuando corresponda.

# 

# \### Budget

# 

# \* Dos modos.

# \* Cálculo dinámico.

# \* Validación.

# 

# \### Kanban

# 

# \* Actividades integradas.

# \* Project association.

# \* Assignees.

# 

# \### Export

# 

# \* Summary PDF.

# \* Summary DOCX.

# \* Full PDF.

# \* Full DOCX.

# 

# \### Commercial

# 

# \* RBAC.

# \* Existing entitlements.

# \* Existing quota.

# \* Usage.

# \* Atomicity.

# 

# \### Security

# 

# \* Tenant isolation.

# \* Workspace isolation.

# \* Team isolation.

# \* RLS.

# 

# \### UX

# 

# \* Menubar.

# \* Feedback claro.

# \* Loading states.

# \* Empty states.

# \* Error states.

# \* Upgrade states.

# 

# \### Quality

# 

# \* TypeScript.

# \* Lint.

# \* Tests.

# \* Build.

# \* Browser verification.

# 

# \---

# 

# \# 55. REGLA ESPECIAL PARA GEMINI

# 

# Si encuentras una decisión arquitectónica ambigua:

# 

# NO inventes.

# 

# Primero busca:

# 

# ```text

# existing implementation

# existing migration

# existing API

# existing type

# existing component

# existing service

# existing RLS policy

# existing entitlement

# existing usage metric

# ```

# 

# Si existe:

# 

# > reutiliza.

# 

# Si existe pero es insuficiente:

# 

# > extiende.

# 

# Solo crea algo nuevo cuando puedas demostrar:

# 

# > \*\*"Esta capacidad no existe actualmente en NovaResearch y es necesaria para cumplir el requerimiento."\*\*

# 

# \---

# 

# \# 56. ENTREGABLES ANTES DE CODIFICAR

# 

# Antes de realizar cambios importantes, genera un informe de auditoría con:

# 

# \## A. Existing Architecture

# 

# ```text

# Research:

# ...

# 

# Projects:

# ...

# 

# Kanban:

# ...

# 

# Teams:

# ...

# 

# Billing:

# ...

# 

# Entitlements:

# ...

# 

# Usage:

# ...

# 

# Export:

# ...

# ```

# 

# \## B. Reuse Matrix

# 

# | Necesidad    | Implementación existente | Acción     |

# | ------------ | ------------------------ | ---------- |

# | RBAC         | ...                      | Reutilizar |

# | Team members | ...                      | Reutilizar |

# | Entitlements | ...                      | Extender   |

# | Usage        | ...                      | Extender   |

# | PDF          | ...                      | Extender   |

# | Kanban       | ...                      | Extender   |

# | Projects     | ...                      | Extender   |

# 

# \## C. Database Gap Analysis

# 

# Mostrar exactamente:

# 

# ```text

# Tabla existente

# Campo existente

# Nueva necesidad

# ¿Reutilizar?

# ¿Extender?

# ¿Nueva tabla?

# Razón

# ```

# 

# \## D. API Gap Analysis

# 

# Igual para APIs.

# 

# \## E. UI Gap Analysis

# 

# Igual para componentes.

# 

# \---

# 

# \# 57. REGLA FINAL DE ARQUITECTURA

# 

# La solución final debe respetar esta filosofía:

# 

# ```text

# &#x20;                   NOVARESEARCH

# &#x20;                        │

# &#x20;      ┌─────────────────┼──────────────────┐

# &#x20;      │                 │                  │

# &#x20;   RESEARCH          PROJECTS          BILLING

# &#x20;      │                 │                  │

# &#x20;      │                 │                  │

# &#x20;     CAME            KANBAN           ENTITLEMENTS

# &#x20;      │                 │                  │

# &#x20;      └────────────┬────┘                  │

# &#x20;                   │                       │

# &#x20;                   └────── Access ─────────┘

# &#x20;                        RBAC / RLS

# ```

# 

# No convertir Research en Projects.

# 

# No convertir Projects en Research.

# 

# No duplicar Kanban.

# 

# No duplicar Billing.

# 

# No duplicar Entitlements.

# 

# No duplicar Usage.

# 

# No duplicar RBAC.

# 

# No duplicar export pipeline.

# 

# La integración debe ser:

# 

# ```text

# Research

# &#x20;  ↓

# CAME

# &#x20;  ↓

# Project

# &#x20;  ↓

# Kanban

# ```

# 

# mientras:

# 

# ```text

# Access + RBAC + RLS + Billing + Entitlements + Usage

# ```

# 

# funcionan como infraestructura transversal.

# 

# \---

# 

# \# 58. OBJETIVO DE PRODUCTO

# 

# La experiencia final debe transmitir:

# 

# > "NovaResearch no solo me ayuda a investigar y diagnosticar una organización; me permite convertir el diagnóstico en un plan de acción ejecutable, asignarlo a las personas correctas, presupuestarlo, seguir su ejecución y posteriormente documentar todo el proceso."

# 

# Ese debe ser el criterio principal para las decisiones de UX/UI y arquitectura.

# 

# No optimices únicamente para "que funcione".

# 

# Optimiza para:

# 

# \* trazabilidad;

# \* seguridad;

# \* consistencia;

# \* escalabilidad;

# \* mantenibilidad;

# \* experiencia de consultor;

# \* claridad ejecutiva;

# \* control presupuestario;

# \* gobernanza;

# \* evidencia;

# \* y compatibilidad con el modelo SaaS comercial existente.



