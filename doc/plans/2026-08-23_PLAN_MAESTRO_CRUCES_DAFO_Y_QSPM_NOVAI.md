# Plan Maestro: Generación Inteligente de Cruces DAFO y Matriz QSPM con NovAi

**Fecha:** 2026-08-23  
**Estado:** En Implementación  
**Módulos Afectados:** `src/features/novai/`, `src/features/ai/`, `src/app/api/ai/investigator/`, `src/views/apps/investigator/dafo/`, `src/views/apps/investigator/qspm/`, `src/hooks/use-investigator-analysis.tsx`, `src/locales/`  

---

## 1. Resumen Ejecutivo y Objetivos

Implementar la asistencia inteligente con **NovAi** para automatizar y acelerar dos de las fases más laboriosas del diagnóstico estratégico:
1. **Matriz DAFO:** Generación automática y metodológicamente rigurosa de los cruces de factores internos y externos ($FO$, $DO$, $FA$, $DA$), evaluando su fuerza ($0$ a $3$), justificación cualitativa, deduplicación de fuentes de evidencia y asignación del evaluador.
2. **Matriz Cuantitativa QSPM:** Generación de alternativas estratégicas sugeridas (si no existen) y evaluación de los atractivos estratégicos ($AS$ de 1 a 4) celda por celda frente a los factores ponderados, iluminando las estrellas interactivas y recalculando el ranking TAS al instante.

---

## 2. Principio de Gobernanza y Cuotas por Usuario

> [!IMPORTANT]
> **Modelo de Cuotas a Nivel de Usuario:**
> - El control y descuento de cuota mensual y diaria de IA se realiza por **usuario autenticado (`principal.userId`)**, no como una bolsa comunal ciega de todo el tenant.
> - En suscripciones multi-usuario (Planes Pro, Team, Enterprise), cada miembro del tenant gestiona su propio límite de consultas para evitar que un solo miembro agote el cupo del equipo.
> - Las operaciones quedan auditadas con `userId`, `tenantId`, `investigationId` y la acción correspondiente (`ai_propose_dafo` o `ai_propose_qspm`).

---

## 3. Arquitectura y Componentes del Sistema

### 3.1 Capa de Dominio & IA (`src/features/novai/` y `src/features/ai/`)
- **Esquemas Zod:** Validación estricta de las solicitudes y las respuestas estructuradas en JSON.
- **Deduplicación de Evidencias:** Algoritmo determinista que consolida las evidencias documentales declaradas en EFI y EFE para cada par sin redundancias.
- **Prompts Especializados:** Instrucción experta para que el LLM aplique discriminación analítica real (evitando asignar fuerza 3 o AS 4 de forma indiscriminada).

### 3.2 Capa de Rutas API (`src/app/api/ai/investigator/`)
- `POST /api/ai/investigator/propose-dafo`: Genera la matriz de cruces DAFO.
- `POST /api/ai/investigator/propose-qspm`: Genera las calificaciones de atractivo $AS$ y/o alternativas estratégicas.

### 3.3 Capa de UI & Modales (`src/views/apps/investigator/`)
- **`DafoAiModal`:** Diálogo modal con estado de carga, previsualización de cruces organizados por cuadrante, y botones para elegir entre *"Completar cruces pendientes"* o *"Sobrescribir todos"*.
- **`QspmAiModal`:** Diálogo modal con previsualización de notas $AS$, cálculo previo de ranking TAS y aplicación en caliente a la tabla interactiva de estrellas.

---

## 4. Trazabilidad e Historial

Cada aplicación de una propuesta de IA se registra en el historial inmutable de la investigación (`withHistory`), etiquetada con:
- `"Propuesta de cruces DAFO generada por NovAi"`
- `"Calificaciones QSPM generadas por NovAi"`

Esto permite auditoría completa, trazabilidad y reversión en caso de ser necesario.
