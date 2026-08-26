# Catálogo Maestro de Herramientas Modulares de NovAi (NOVAI_TOOLS)

**Versión:** 2.0 (2026-08-26)  
**Total Herramientas Registradas:** 21  
**Directorio Canónico:** `src/features/novai/tools/`  

---

## Índice por Dominios y Categorías

1. [Expedientes y Evidencias (8 Tools)](#1-expedientes-y-evidencias)
2. [Metodología y Auditoría Determinista (5 Tools)](#2-metodología-y-auditoría-determinista)
3. [Estrategia y Red-Team (3 Tools)](#3-estrategia-y-red-team)
4. [Plataforma, Operaciones y Memoria (5 Tools)](#4-plataforma-operaciones-y-memoria)

---

## 1. Expedientes y Evidencias

### 1.1 `get_active_investigation`
- **Propósito:** Resuelve deterministamente la investigación activa del usuario en el tenant actual sin depender de la memoria del modelo.
- **Ruta:** `src/features/novai/tools/investigations/get-active-investigation.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id?: string }`
- **Output:** `{ hasActiveInvestigation: boolean, investigationId: string, title: string, status: string, counts: { strengths, weaknesses, opportunities, threats, totalCrossings, totalStrategies, totalCameActions } }`

### 1.2 `list_investigations`
- **Propósito:** Lista las investigaciones estratégicas activas y accesibles para el usuario bajo RLS.
- **Ruta:** `src/features/novai/tools/investigations/list-investigations.ts`
- **Riesgo / Alcance:** `read-only` / `workspace`
- **Input:** `{ status?: string, search?: string, limit?: number }`
- **Output:** `{ total: number, items: Array<{ id, title, status, organization, updatedAt }> }`

### 1.3 `get_investigation_details`
- **Propósito:** Recupera el expediente completo con factores internos (D/F), externos (O/A), cruces DAFO y planes CAME.
- **Ruta:** `src/features/novai/tools/investigations/get-investigation-details.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string }`
- **Output:** `{ metadata, internal, external, relationships, strategies, cameActions, history }`

### 1.4 `get_investigations_stats`
- **Propósito:** Calcula métricas agregadas del espacio de trabajo (estados, totales, distribuciones).
- **Ruta:** `src/features/novai/tools/investigations/get-investigations-stats.ts`
- **Riesgo / Alcance:** `read-only` / `workspace`
- **Input:** `{}`
- **Output:** `{ totalInvestigations, statusCounts, completionRate }`

### 1.5 `get_investigation_documents`
- **Propósito:** Consulta fuentes documentales, expedientes y referencias indexadas que sustentan la investigación.
- **Ruta:** `src/features/novai/tools/investigations/get-investigation-documents.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string }`
- **Output:** `{ totalDocumentSources: number, documents: Array<{ name, type, excerpt, factorCount }> }`

### 1.6 `search_evidence`
- **Propósito:** Búsqueda textual y semántica de evidencias, citas y justificaciones indexadas en factores, cruces y CAME.
- **Ruta:** `src/features/novai/tools/investigations/search-evidence.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, query: string, factor_type?: 'ALL' | 'D' | 'F' | 'O' | 'A' }`
- **Output:** `{ totalMatches: number, results: Array<{ source, factorName, snippet, relevanceScore }> }`

### 1.7 `get_factor_evidence`
- **Propósito:** Resuelve la ficha probatoria completa de un factor específico (ej: `D-03`, `F-01`, `O-02`, `A-02`) con trazabilidad hacia cruces y CAME.
- **Ruta:** `src/features/novai/tools/investigations/get-factor-evidence.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, factor_code: string }`
- **Output:** `{ factor: { code, name, type, weight, rating, evidence }, traceability: { crossings, strategies, cameActions } }`

### 1.8 `verify_claim`
- **Propósito:** Audita una afirmación estratégica contra el expediente real y la clasifica epistémicamente (`FACT`, `EVIDENCE`, `INFERENCE`, `HYPOTHESIS`, `ASSUMPTION`, `UNSUPPORTED`).
- **Ruta:** `src/features/novai/tools/investigations/verify-claim.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, claim: string, factor_code?: string }`
- **Output:** `{ isSupported: boolean, epistemicStatus: string, confidenceScore: number, explanation: string, supportingEvidence: Array<any> }`

---

## 2. Metodología y Auditoría Determinista

### 2.1 `audit_factor`
- **Propósito:** Audita la calibración de escala (1-2 para debilidades, 3-4 para fortalezas), ponderación (peso > 0, sumatoria) y calidad probatoria.
- **Ruta:** `src/features/novai/tools/methodology/audit-factor.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, factor_code: string }`
- **Output:** `{ factor, audit: { isMethodologicallyValid, evidenceQuality, criticalErrorsCount, findings } }`

### 2.2 `audit_relationship`
- **Propósito:** Audita formalmente un cruce DAFO (FO, DO, FA, DA) entre un factor interno y uno externo (ej: `D-03 × A-02`), evaluando causalidad y ceros sospechosos.
- **Ruta:** `src/features/novai/tools/methodology/audit-relationship.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, internal_factor_code: string, external_factor_code: string }`
- **Output:** `{ crossing, quadrant, matrixState: { strength, justification, evidence }, audit: { isSuspiciousZero, evidenceConnectionStatus, confidence, recommendation } }`

### 2.3 `find_contradictions`
- **Propósito:** Detección determinista de inconsistencias matemáticas, calificaciones incompatibles, vacíos probatorios y ceros sospechosos en la investigación.
- **Ruta:** `src/features/novai/tools/methodology/find-contradictions.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string }`
- **Output:** `{ hasCriticalContradictions: boolean, totalContradictions: number, contradictions: Array<{ type, severity, title, explanation, recommendation }> }`

### 2.4 `validate_methodology`
- **Propósito:** Evalúa la conformidad metodológica integral o por etapa (EFI, EFE, DAFO, CAME, QSPM) asegurando rigor académico.
- **Ruta:** `src/features/novai/tools/methodology/validate-methodology.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, stage?: 'ALL' | 'EFI' | 'EFE' | 'DAFO' | 'CAME' | 'QSPM' }`
- **Output:** `{ status: 'VALID' | 'WARNINGS' | 'ERRORS', methodologyScore: number, errors: string[], warnings: string[], recommendations: string[] }`

### 2.5 `calculate_matrix`
- **Propósito:** Fachada determinista que ejecuta `calculateAnalysis()` para obtener los índices oficiales de EFI, EFE, DAFO y CAME.
- **Ruta:** `src/features/novai/tools/methodology/calculate-matrix.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, matrix_type?: 'ALL' | 'EFI' | 'EFE' | 'DAFO' | 'CAME' }`
- **Output:** `{ matrixType, calculation: { efi, efe, dafo: { dominantQuadrant, quadrants }, came } }`

---

## 3. Estrategia y Red-Team

### 3.1 `trace_strategy`
- **Propósito:** Reconstruye el árbol de trazabilidad completo de una estrategia: Strategy → QSPM → CAME → Cruce DAFO → Factores → Evidencia Documental.
- **Ruta:** `src/features/novai/tools/strategy/trace-strategy.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, strategy_id: string }`
- **Output:** `{ strategyId, strategyName, lineage: { root, qspmEvaluation, cameActions, dafoCrossings, underlyingFactors, evidenceSources } }`

### 3.2 `compare_strategies`
- **Propósito:** Compara dos o más alternativas estratégicas evaluando orientación (FO/DO/FA/DA), cobertura de factores, atractivo QSPM y viabilidad operativa CAME.
- **Ruta:** `src/features/novai/tools/strategy/compare-strategies.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string, strategy_ids?: string[] }`
- **Output:** `{ totalCompared: number, selectedStrategyId: string, comparisons: Array<{ id, name, quadrant, orientation, factorsAddressedCount, cameActionsCount, averageAttractivenessScore, strategicFit }> }`

### 3.3 `challenge_analysis`
- **Propósito:** Auditor Red-Team que cuestiona sesgos de sobre-optimismo en FO, puntos únicos de fallo, amenazas desatendidas en DA y brechas probatorias.
- **Ruta:** `src/features/novai/tools/strategy/challenge-analysis.ts`
- **Riesgo / Alcance:** `read-only` / `investigation`
- **Input:** `{ investigation_id: string }`
- **Output:** `{ dominantQuadrant: string, redTeamFindingsCount: number, criticalRisksCount: number, challenges: Array<{ area, severity, title, critique, counterPerspective, recommendation }> }`

---

## 4. Plataforma, Operaciones y Memoria

### 4.1 `list_kanban_tasks`
- **Propósito:** Consulta tareas operativas asociadas a la investigación o al espacio de trabajo.
- **Ruta:** `src/features/novai/tools/kanban/list-kanban-tasks.ts`
- **Riesgo / Alcance:** `read-only` / `workspace`

### 4.2 `get_kanban_board_summary`
- **Propósito:** Genera un resumen ejecutivo de la distribución de tareas por estado, prioridad y asignado.
- **Ruta:** `src/features/novai/tools/kanban/get-kanban-board-summary.ts`
- **Riesgo / Alcance:** `read-only` / `workspace`

### 4.3 `list_workspace_members_and_teams`
- **Propósito:** Consulta miembros, colaboradores y equipos asignados al espacio de trabajo.
- **Ruta:** `src/features/novai/tools/organization/list-workspace-members.ts`
- **Riesgo / Alcance:** `read-only` / `workspace`

### 4.4 `get_tenant_billing_and_quota_info`
- **Propósito:** Consulta cuotas mensuales y diarias de IA, estado del plan de suscripción y límites de uso del tenant.
- **Ruta:** `src/features/novai/tools/billing/get-billing-quota.ts`
- **Riesgo / Alcance:** `read-only` / `tenant`

### 4.5 `record_strategic_memory`
- **Propósito:** Registra un aprendizaje o preferencia estratégica persistente en la memoria de largo plazo del tenant.
- **Ruta:** `src/features/novai/tools/memory/record-strategic-memory.ts`
- **Riesgo / Alcance:** `medium` / `tenant`
