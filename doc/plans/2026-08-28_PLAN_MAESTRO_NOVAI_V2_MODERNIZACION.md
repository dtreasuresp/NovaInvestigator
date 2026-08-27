# Plan Maestro NovAi v2 — Modernización, Confiabilidad y Arquitectura Profesional

**Fecha:** 2026-08-28
**Versión:** 2.0.0 — Documento Maestro Vigente
**Estado:** Aprobado — En ejecución Fase 1
**Prevalencia:** Este documento completa y actualiza `PLAN_MAESTRO_ARQUITECTURA_NOVAI_PRO.md`, `NOVAI_ARCHITECTURE.md`, `NOVAI_CONVERSATION_ARCHITECTURE.md` y `BASE_CONOCIMIENTO_METODOLOGIA_ESTRATEGICA_NOVAI.md`. Ante contradicción, prevalece este documento por fecha ISO.
**Autoridad solicitada por:** Dirección Técnica DGTECNOVA / Producto NovaStore ERP
**Rama de ejecución:** `feat/novai-v2-instrumentation` → `dev` (Preview) → `main` (Production)

---

## 0. Resumen Ejecutivo — Misión

Transformar NovAi de `LLM + mega prompt + todas las tools + historial completo` en un agente moderno comparable a ChatGPT/Claude/Perplexity y a aplicaciones Vercel AI SDK / AI Elements de primera línea, mejorando simultáneamente arquitectura, context management, tool selection, reasoning observable, evidencia/citaciones, memoria/compaction, streaming, persistencia, observabilidad, seguridad multi-tenant, UX y confiabilidad epistemológica.

**Decisiones aprobadas 2026-08-28 (vinculantes para implementación):**

1. Arquitectura propuesta aprobada; orden priorizado **Instrumentación → Context Manager → Tools/Orchestration → Intent Classifier → UI/UX+Optimización**, cada fase incremental, testeable y sin romper `main`.
2. Persistencia de evidencia en tabla dedicada **`novai_evidence`** (no reutilizar `metadata`).
3. Intent Classifier **heurística pura inicial**, con interfaz preparada para híbrido `heurística → LLM cheap` solo si benchmark demuestra ganancia real vs coste/latencia/complejidad.
4. Fase 1 en rama aislada `feat/novai-v2-instrumentation` con benchmark reproducible `scripts/benchmark-novai-context.ts`; instrumentación debe permitir reconstruir **por qué** NovAi decidió y dónde se perdió/contaminó/confundió contexto — no solo logs.

Principio trazador de toda la modernización:

> **contexto correcto → intención correcta → herramienta correcta → evidencia correcta → respuesta trazable**

---

## 1. Diagnóstico — Auditoría 2026-08-27/28

### 1.1 Qué existe realmente (verificado contra código)

| Componente | Ubicación canónica | Estado |
|---|---|---|
| Agent Runtime (`streamText`, `isStepCount(5)`, fallback OpenRouter→Gemini→Zen) | `src/features/novai/agent-runtime.ts:1,41,186` | ✅ |
| Context Engine (system prompt ensamblado) | `src/features/novai/context-engine.ts:40` | ✅ pero incondicional |
| Context Builder (investigation dump completo) | `src/features/novai/context-builder.ts:33` | ✅ causa bloat |
| Methodology Knowledge (EFI/EFE/DAFO/QSPM/CAME) | `src/features/novai/methodology-knowledge.ts:102` | ✅ inyectado siempre |
| Memory Engine (strategic/workspace/user, RLS) | `src/features/novai/memory-engine.ts:57` | ✅ sin scoring relevancia |
| Tools 22 modulares (14 read-only / 7 low / 1 medium) | `src/features/novai/tools/index.ts:67` | ✅ reales, no stubs |
| Tool Gateway (checkPolicy + wrapGoverned + audit async) | `src/features/novai/tool-gateway.ts:19,192,241` | ✅ |
| Event Protocol (13 tipos NovaiEvent) | `src/features/novai/events.ts:8` | ✅ |
| Event Projection (tool→evidence/audit/calc/source) | `src/features/novai/event-projection.ts:313` | ✅ |
| Token Budget (heurística + sliding window) | `src/features/novai/token-budget.ts:16,92` | ✅ sin semántica |
| Persistencia (novai_conversations/messages/memories/audit) | `supabase/migrations/2026-08-27T00-00-00_novai_platform_persistence.sql:9` | ✅ |
| Streaming SSE con interleaving tool | `src/app/api/novai/chat/route.ts:93,117` | ✅ |
| UI AI Elements (Conversation, Message, Reasoning, Tool, Task, Source) | `src/views/apps/novai/components/novai-message-item.tsx:13` | ⚠️ 6/49 usados |
| Tenant isolation (ReBAC/RLS en todos los tools) | `src/features/novai/tools/**/get-*.ts: eq('tenant_id', principal.tenantId)` | ✅ |
| Model Router (keyword sticky 4 msgs) | `src/features/novai/adapters/model-router.ts:22` | ✅ |

No verificados (instalados pero no conectados, o solo estimación):

- `supabase/functions` — no existe.
- Compaction semántica — solo sliding window + nota `[Nota de memoria contextual…]` (`token-budget.ts:176`); `Grep compact = 0`.
- `Context` / `Queue` / `InlineCitation` AI Elements — instalados en `src/components/ai-elements/` pero 0 imports en `src/views/apps/novai` (verificado por Grep).
- Token usage real — `MessageCompleteEvent.usage` (`events.ts:143`) definido pero nunca poblado; `agent-runtime.ts` nunca lee `streamResult.usage`; `novai_agent_runs` nunca insertado; `novai_messages.token_count` siempre 0.

### 1.2 Flujo real actual

```
UI NovAiView handleSend
 → POST /api/novai/chat {conversationId, messages, context, isFreeText, locale}
   → requireInvestigationsPrincipal (src/lib/investigations/access.ts)
   → appendMessage(user) + loadCanonicalAiMessages (src/features/novai/conversations-repository.ts:236)
   → NovaiAgentRuntime.executeStreaming
       1. assertNovaiAllowed (billing + RBAC + daily quota)
       2. fetchTenantLiveOverview + getActiveMemories (parallel)
       3. resolveSystemPrompt → NovaiContextEngine.buildSystemPrompt
          = general/investigator/kanban + methodologyBlock ALWAYS + modeBlock + memoryBlock + auditPrompt
       4. ModelRouter.routeTask (keyword classify → mode/market tier/provider)
       5. TokenBudget.trimConversationHistory (anchor + sliding window)
       6. ToolGateway.buildGovernedVercelTools → 22 tools ALWAYS
       7. streamText {system, messages, tools, maxOutputTokens:8192, stopWhen:isStepCount(5)}
          for await part of fullStream: text-delta | tool-call (+ trace running) | tool-result (+ trace completed) | projectToolResultToEvents → evidence/audit/calculation/source
          + emergency text-only fallback si tools fallan
       8. consumeAiQueryQuota (monthly+daily)
       9. message-complete {fullText, durationMs}
   → TransformStream SSE data: {type,…}\n\n (src/app/api/novai/chat/route.ts:93)
 → Reader split('\n') + setThreads incremental (src/views/apps/novai/index.tsx:604)
 → NovaiMessageItem: Reasoning + TraceViewer(Task) + Evidence/Audit/Calculation/Source cards + Tool cards + MessageResponse
 → appendMessage(assistant) al message-complete
```

### 1.3 Problemas clasificados

#### CRITICAL

- **C-01 Context bloat incondicional.** Incluso `Hola` paga `methodologyBlock (~520tk) + modeBlock + overview + memory + audit + 22 tool defs (~3.960tk)`. Estimado: Hola general ~5.0k input (40% de 12.288 fallback), Hola investigator con state 8F+8E ~9.8k (79% → trim).
- **C-02 Tool exposure estática.** `buildGovernedVercelTools` expone 22 tools siempre; `adapters/modes.ts:allowedTools` nunca usado como filtro.
- **C-03 Token accounting ficticio.** Usage real de OpenRouter/Gemini no capturado; `novai_agent_runs` no escrito; `token_count=0`.
- **C-04 Compaction = sliding window.** Sin resumen semántico; pierde objetivo/decisiones/evidencia en chats largos.
- **C-05 Observabilidad rota.** `runId = 'run-${Date.now()}'` (string) vs `novai_audit_events.run_id uuid FK`; `novai_agent_runs` jamás insertado; audit best-effort `Promise.resolve().then` sin await.

#### HIGH

- **H-01 Methodology On Demand inexistente.**
- **H-02 Sin InlineCitation** (existe `src/components/ai-elements/inline-citation.tsx` pero 0 imports en NovAi).
- **H-03 Sin Context UI** (existe `src/components/ai-elements/context.tsx` con `tokenlens` pero 0 imports en NovAi).
- **H-04 Memoria sin relevance scoring** (top 15 por `updated_at` desc).
- **H-05 Prompt monolítico** (no separación System/Developer/User → no cacheable por proveedor).
- **H-06 Sin cost control** (solo contador queries, no tokens/USD).

#### MEDIUM/LOW

- Task/Trace duplicado, Sources sin collapse (N cards), `capabilities.ts` marca CHAT con `supportsTools:true` cuando debería ser `false` para `Hola`, `openrouter-client.ts` legacy no usado.

---

## 2. Arquitectura Objetivo

```
                           NOVAI v2
                             │
                     Intent Classifier
                  (heurística pura v2.0
                   interfaz híbrida v2.1)
                             │
               ┌─────────────┼──────────────┐
               │             │              │
           Memory        Evidence      Investigation
        (retrieval   (novai_evidence  (DB truth,
         on demand)   on demand)      RLS/ReBAC)
               │             │              │
               └─────────────┼──────────────┘
                             │
                      Context Manager
                   (Context ON DEMAND)
                 ┌──────┬───┴──┬───────┐
                 │System│ Mode │ Task  │
                 │ Core │Block │ State │
                 └──────┴──┬───┴───────┘
                             │
                    Dynamic Tool Set
           CASUAL [] | LOOKUP [1-2] | DOC [4-5]
           STRATEGIC [7-8] | RESEARCH [3] | OPS [3]
                             │
                       Model Router
                (task → tier/capability/cost)
                             │
                       Agent Runtime
                  (governed, observable,
                   run_id uuid, usage real)
                  ┌──────────┼──────────┐
                  │  Text  Tools  Sources│
                  └──────────┼──────────┘
                             │
                       UIMessage (AI SDK)
                  ┌──────────┼──────────┐
                Reasoning   Task    Sources
                  └──────────┼──────────┘
                             │
                     Final Response
              (inline citations → evidence.id)
                             │
                        Context %
                  (Input/Output/Cached/%
                   tokenlens, usage real)
```

Principios: **Context ON DEMAND**, **Dynamic Tool Exposure**, **Tool Governance**, **Tool Result Trust**, **Reasoning vs Observable Activity**, **Evidence model propio**, **Inline Citations validadas**, **Compaction semántica**, **UIMessage parts**.

---

## 3. Pipelines Objetivo

### 3.1 Context Pipeline (Context ON DEMAND)

```
Hola (CASUAL)              → [System Core 180tk + Mode CHAT 30tk + tools:0]               ≈ 210tk system
¿Investigación activa?     → Core 180 + Mode 30 + overview 60 + tool def 180               ≈ 450tk
Analiza D-03×A-02 (ANALYSIS)→ Core 180 + CONSULTANT 60 + factor slice 250 + audit 120 + tools 360 ≈ 970tk
Investiga competencia Cuba  → Core 180 + RESEARCHER 60 + web_research 180 + search 180       ≈ 600tk + results
```

Nada de metodología completa / investigación / RAG / todas las tools si no es necesario.

**Separación conceptual (Context Manager):**

1. System instructions (core identity + safety + evidence policy)
2. Current user request (aislada)
3. Recent conversation (ventana N)
4. Conversation summary (compaction semántica)
5. Relevant long-term memory (retrieval por query, top 3)
6. Active investigation context (DB truth, no inferencia conversacional)
7. Relevant evidence (on demand, por tool)
8. Relevant methodology slice (EFI *o* EFE *o* DAFO *o* QSPM, no todo)
9. Tool definitions (dynamic set)
10. Tool results (solo del step)
11. Current task state (mode, run_id, intent)

### 3.2 Tool Pipeline (Dynamic Exposure)

```
CASUAL            tools: []
INVESTIGATION_LOOKUP  [list_investigations, get_active_investigation, get_investigations_stats]
DOCUMENT_ANALYSIS     + [get_investigation_details, search_evidence, get_factor_evidence, get_investigation_documents]
STRATEGIC_ANALYSIS    + [audit_factor, audit_relationship, find_contradictions, validate_methodology, calculate_matrix]
STRATEGY_OPS          + [trace_strategy, compare_strategies, challenge_analysis]
WEB_RESEARCH          + [web_research] (EXTERNAL_EVIDENCE aislado de INTERNAL_EVIDENCE)
OPS/KANBAN            [list_kanban_tasks, get_kanban_board_summary, list_workspace_members_and_teams]
MEMORY/ADMIN          + [record_strategic_memory (medium), get_tenant_billing_and_quota_info]
```

Selección por `intent + mode + permissions + tenant + task`. `allowedTools` por modo en `adapters/modes.ts` es fuente de verdad (Fase 2 lo activa).

**Governance por tool:**
`name / label / category / riskLevel / allowed_modes / read-write / requires_investigation / tenant_scoped / idempotent / auditable` — ya tipado en `tools/types.ts:6` pero no aplicado como filtro.

Enforcement invariante: `User → RBAC → Tool Authorization → Tenant Scope → Tool Execution`. Nunca `LLM → DB` sin gateway.

### 3.3 Memory Pipeline

```
conversation buffer (last N msgs, sliding window)
  → summary (semantic compaction cada 20 msgs / 80% context, cheap model, estructurado)
  → strategic memory (upsert, retrieval por query lexical top3 en v2.0, embeddings en v2.1)
  → episodic investigation (solo si investigation_id === active)
```

No mezclar `user/workspace/strategic` sin etiqueta. Inyección solo si `relevance > threshold`.

### 3.4 UI Pipeline (AI Elements convergence, sin dashboard)

```
Message (assistant):
 ├─ Reasoning [collapsible, isStreaming, duration]
 ├─ Task [single collapsible "⚙️ Actividad · N pasos" con state pending/running/completed/failed]
 ├─ Sources [collapsible "📚 N fuentes" con Source compactos + url/favicon/snippet]
 ├─ MessageResponse (dominante, inline citations [1][2] → hover Source)
 └─ MessageActions [Copiar | Regenerar | Context 14% (Hover: Input/Output/Cached/Reasoning)]
```

Detalle técnico bajo demanda (hover/collapse). Respuesta domina visualmente. Respeta `prefers-reduced-motion`, a11y, keyboard.

---

## 4. Evidencia y Citaciones

### 4.1 Modelo de evidencia (tabla dedicada)

**Decisión aprobada:** crear `novai_evidence` (no reutilizar `metadata`).

```sql
Evidence {
  id uuid PK
  tenant_id uuid FK tenants
  conversation_id uuid FK novai_conversations
  investigation_id uuid FK investigations (nullable)
  source_id text              -- FK lógica a document/source/toolResult
  source_type enum('internal_document','web_source','database_evidence','tool_derived')
  claim text
  excerpt text
  location text               -- página/sección/coordenada
  confidence numeric(3,2)     -- 0.00-1.00
  epistemic enum('FACT','INFERENCE','HYPOTHESIS','ASSUMPTION')  -- no presentar hipótesis como hecho
  retrieved_at timestamptz
  created_at timestamptz
}
Citation {
  id uuid PK
  evidence_id uuid FK novai_evidence
  message_id uuid FK novai_messages
  claim text
  excerpt text
  location text
}
```

Garantía: `citation → evidence → source` trazable; `EXTERNAL_EVIDENCE` (web_research) nunca mezclada silenciosamente con `INTERNAL_EVIDENCE` (expediente).

### 4.2 Inline Citations

UI `src/components/ai-elements/inline-citation.tsx` conectada a `Citation`. Proyección `event-projection.ts` valida `citation.sourceId ∈ evidenceIds`; no renderizar `[n]` sin source real. Modelo de reasoning distingue `Verified fact / Evidence-backed inference / Hypothesis / Unknown / Insufficient evidence` y puede responder: *"No hay evidencia suficiente."*

---

## 5. Seguridad, Multi-tenancy y Gobernanza

Invariantes no negociables (AGENTS.md §3):

- RLS + ReBAC 3D (RBAC + ReBAC + Entitlements) en las 3 capas: `proxy.ts` (optimista) → API handler (`requireInvestigationsPrincipal` + `authorize` + entitlements) → Postgres RLS (`tenant_id = auth.uid()` + `has_capability()`).
- `tenantId` nunca del body; siempre del Principal.
- Tools tenant-scoped validados (29 matches `tenant_id/tenantId` en `src/features/novai/tools`).
- `ToolGateway.checkPolicy` como enforcement point (§38/§39) — toda tool pasa por gateway + audit `novai_audit_events`.
- Cross-tenant writes requieren confirmación admin + `source:"admin"`.

Nuevas tablas `novai_evidence` + `novai_citations` con `enable row level security` + políticas `tenant_id` + `user_id`.

---

## 6. Modelo de Contexto y Presupuesto

- **Context health:** 0–60% Healthy, 60–80% Moderate, 80–90% Warning (trigger compaction), 90–100% Critical. Porcentajes relativos al `maxTotalTokens` del modelo (verificado en `token-budget.ts:59` + `capabilities.ts:KNOW_MODEL_CAPABILITIES`).
- **Context UI:** `src/components/ai-elements/context.tsx` con `tokenlens` + breakdown `Input/Output/Reasoning/Cached/History/Tools/RAG/Total`. Conectado a `usage` real (no estimado) cuando el proveedor lo reporta; si solo estimación, etiquetar `estimated`.
- **Token accounting:** capturar `streamResult.usage` (AI SDK) + `providerMetadata` OpenRouter; persistir en `novai_agent_runs.input_tokens/output_tokens` + `novai_messages.token_count`. Distinguir `actual vs estimated` en UI.

---

## 7. Compaction Real (no sliding window)

Trigger: `context utilization ≥ 80%` o `messages ≥ 40`.

```
Conversation (N msgs)
 → Compaction (cheap model: mistral-small)
   → Structured summary {objective, facts, decisions, constraints, active investigation, evidence, conclusions, preferences, open questions, pending work, references}
 → Persist summary in novai_conversations.summary + compaction_version
 → Keep recent 10 msgs raw + anchor
 → Continue
Auditable y reversible (summary_version + omittedCount).
```

Distinto de `TokenBudget.trimConversationHistory` (que se mantiene como fallback rápido).

---

## 8. Fases — Orden aprobado (incremental, testeable, sin romper main)

```
Fase 0  AUDITORÍA                        DONE  2026-08-27/28 (este doc + forensic audit)
Fase 1  INSTRUMENTACIÓN                  ← ACTUAL (feat/novai-v2-instrumentation, aislada)
        run_id uuid + novai_agent_runs insert + usage real + benchmark A-D reproducible
        → Métrica: diagnóstico por request (context received/selected, intent, tools, evidence, decisión)
Fase 2  CONTEXT MANAGER                  (priorizado antes de Tools por decisión 2026-08-28)
        Context ON DEMAND + slices (core/mode/task/evidence/methodology on demand)
        Refactor context-engine.ts + context-builder.ts + methodology-knowledge.ts (getMethodologySlice)
        → Métrica: Hola system < 350tk (vs ~5k), 22→0 tools en CASUAL
Fase 3  TOOLS / ORCHESTRATION            (dynamic exposure + governance)
        Dynamic set por intent/mode + allowedTools activo + Tool Result Trust
        → Métrica: tools expuestas por caso A-D, tool hallucination 0
Fase 4  INTENT CLASSIFIER (heurística pura)
        Interfaz Classifier {classify(query, context) → Intent}
        Heurística determinista v2.0; diseño preparado para híbrido LLM cheap v2.1
        Benchmark debe probar ganancia real antes de activar LLM
        → Métrica: accuracy vs coste/latencia
Fase 5  EVIDENCE MODEL + CITATIONS       (novai_evidence table + InlineCitation)
        Evidence {FACT/INFERENCE/HYPOTHESIS} + Citation validation
        Anti-hallucination / anti-complacency (puede decir "No hay evidencia suficiente")
        → Métrica: citation → source 100%
Fase 6  COMPACTION + MEMORY RETRIEVAL
        Semantic compaction + relevance-scored memory
Fase 7  UI AI ELEMENTS + OBSERVABILIDAD + PERFORMANCE
        Task single + Sources grouped + Context indicator + Queue si aplica
        Run observability completa (tokens, latency, TTFT, tools, evidence)
Fase 8  TESTS + BENCHMARK + FINAL AUDIT
        17 escenarios (ver §11) + E2E + pnpm check-types + react-doctor
```

Cada fase: branch `feat/novai-v2-*` → PR a `dev` (Preview `preview.apps.dgtecnova.com`) → `main` (Production `apps.dgtecnova.com`) tras `pnpm check-types` + `pnpm test` + `CHANGELOG.md` SemVer.

---

## 9. Persistencia — Migraciones

| Migración | Tablas | Propósito |
|---|---|---|
| `2026-08-28T00-00-00_novai_fix_observability.sql` | `novai_agent_runs`, `novai_audit_events` | Fix `run_id uuid FK` (generar uuid en runtime) + insert real + `input_tokens/output_tokens/duration_ms` |
| `2026-08-28T10-00-00_novai_evidence.sql` | `novai_evidence`, `novai_citations` | Evidencia trazable (ver §4.1) + RLS tenant-scoped |
| `2026-09-01T00-00-00_novai_compaction.sql` | `novai_conversations` cols `summary jsonb, compaction_version int, token_snapshot jsonb`; `novai_messages` col `parts jsonb` (UIMessage parts: text/reasoning/tool-call/tool-result/source) | Compaction + UIMessage parts persistence |
| `2026-09-05T00-00-00_novai_context_snapshot.sql` (si aplica) | `novai_agent_runs` cols `context_snapshot jsonb, intent text` | Reconstrucción de decisión |

Migraciones `if not exists` + `enable row level security` + `set search_path = pg_catalog, public` + `security definer`.

---

## 10. Archivos Afectados (exacto)

**Fase 1 Instrumentación:**
- `src/features/novai/agent-runtime.ts:103,186` (runId uuid, usage capture, reasoning delta, insert agent_runs, context snapshot logging)
- `src/features/novai/token-budget.ts:59` (exponer `getModelBudget` para nemotron + usage passthrough)
- `src/features/novai/events.ts:143` (poblar `usage`, añadir `reasoning-delta` + `context-snapshot` events)
- `src/features/novai/tool-gateway.ts:161` (fix run_id type, sync audit when run_id uuid)
- `src/app/api/novai/chat/route.ts:93,117` (propagar observability headers, emit context events)
- NUEVO `scripts/benchmark-novai-context.ts` (reproducible A-D: Hola / ¿investigación? / D-03×A-02 / competencia Cuba)
- NUEVO `src/features/novai/instrumentation.ts` (opcional helper: `traceDecision` + `logContextLoss`)

**Fase 2 Context Manager:**
- NUEVO `src/features/novai/context-manager.ts` (Context ON DEMAND)
- `src/features/novai/context-engine.ts:40,44` (delegar a ContextManager)
- `src/features/novai/context-builder.ts:33` (slices lazy)
- `src/features/novai/methodology-knowledge.ts:15,102` (`getMethodologySlice(topic)`)

**Fase 3 Tools:**
- `src/features/novai/tool-gateway.ts:241` (`selectToolsForIntent`)
- `src/features/novai/tools/index.ts:151` (`getVercelToolsForMode`)
- `src/features/novai/adapters/modes.ts:22` (activar `allowedTools`)
- `src/features/novai/capabilities.ts:106` (CHAT supportsTools:false)
- NUEVO `src/features/novai/intent-classifier.ts` (heurística pura v2.0, interfaz híbrida)

**Fases 5-7:** `src/features/novai/evidence-model.ts`, `src/features/novai/compaction-engine.ts`, `src/views/apps/novai/components/novai-message-item.tsx`, `src/views/apps/novai/index.tsx`, `src/components/ai-elements/*` (consumo, no fork).

Sin tocar: `src/lib/investigations/*`, `src/features/access/*`, `supabase/migrations` existentes, `next.config.ts`.

---

## 11. Benchmark de Contexto (reproducible Fase 1)

Casos:

- **A** `Hola`
- **B** `¿Cuál es la investigación activa?`
- **C** `Analiza la relación D-03 × A-02.`
- **D** `Investiga en Internet la competencia laboral en Cuba.`

Métricas por request (benchmark script): `system tokens, developer tokens, history tokens, tool def tokens, RAG tokens, memory tokens, investigation tokens, tool result tokens, input tokens, output tokens, total tokens, context utilization, tools exposed, tools executed, model steps, latency, TTFT`.

Estimación actual (heurística token-budget.ts):

| Caso | System | Tool defs | Input total | Tools exp. | Context % (12.288) |
|---|---|---|---|---|---|
| A Hola general | ~1.050 | ~3.960 | ~5.022 | 22 | 40.8% |
| B investigación activa | ~1.180 | ~3.960 | ~5.164 | 22 | 42.0% |
| C D-03×A-02 (8F+8E) | ~5.800 | ~3.960 | ~9.796 | 22 | 79.7% → trim |
| D competencia Cuba | ~1.100 | ~3.960 | ~5.088 | 22 | 41.4% |

Objetivo post Fases 2-3: A ~222 (-95%), C ~1.366 (-86%). Benchmark script debe imprimir antes/después objetivos para validar.

---

## 12. Tests — Matriz 17 escenarios

| # | Scenario | Expected |
|---|---|---|
| 1 | Hola | minimal context (<350tk), no methodology/RAG/investigation |
| 2 | Pregunta casual | minimal tools (0-1) |
| 3 | Investigación activa | tool correcta + result tenant-scoped |
| 4 | Pregunta sobre documento | relevant document source |
| 5 | Análisis EFI | EFI slice only |
| 6 | Análisis EFE | EFE slice only |
| 7 | Relación DAFO D-03×A-02 | audit_relationship + suspicious-zero check |
| 8 | Web research | web_research solo si RESEARCH, EXTERNAL_EVIDENCE aislado |
| 9 | Tool failure | visible failure, LLM no alucina |
| 10 | Unsupported claim | "No hay evidencia suficiente" |
| 11 | Long chat 50 msgs | summary + recent 10, objective preserved |
| 12 | 80% context | Warning |
| 13 | 90% context | Critical + compaction trigger |
| 14 | Unauthorized tool | Denied + audit rejected |
| 15 | Tenant mismatch | 404, no leak |
| 16 | Citation | citation.sourceId ∈ sources |
| 17 | No source | no fake [1] |

Ubicación: `tests/novai/*.test.ts` (tsx --test), `pnpm test`, `pnpm check-types`, `npx react-doctor@latest` si UI.

---

## 13. Riesgos y Mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Over-filtering tools → alucinación | M | Alto | Failsafe reintento set ampliado + log tool_missing_exposure |
| Under-injection evidence | M | Medio | Auto-inyección get_investigation_details si ANALYSIS sin state |
| Latency intent classifier | B | Medio | Heurística O(1) primero; LLM solo si ambigüedad + cache |
| Migración run_id UUID | B | Bajo | run_id nullable, no backfill |
| Reasoning no soportado OpenRouter free | M | Bajo | Solo gemini soporta reasoning delta |
| Compaction cost | B | Medio | Trigger 80% o 20 msgs, cheap model |
| Citation hallucination | M | Alto | Validar citation.sourceId ∈ evidenceIds |
| RLS regression | B | CRITICAL | Tests tenant A≠B + no policy changes sin audit |

---

## 14. Criterios de Aceptación

- Hola no arrastra metodología/tools/RAG/investigación (system <350tk).
- Tools expuestas dinámicamente por intent (ver métrica tools exposed por caso).
- FACT/INFERENCE/HYPOTHESIS distinguidos; puede decir *"No hay evidencia suficiente"*.
- Nunca confunde investigaciones (DB truth, no inferencia conversacional).
- Citations → sources reales 100%.
- Activity (Task/Sources/Reasoning) corresponde a eventos reales del runtime (no narración LLM).
- Context % visible (tokenlens breakdown) con usage real cuando disponible.
- Compaction semántica real preservando objective/facts/decisions/investigation.
- Response domina visualmente (Task/Sources collapsed).
- Evidencia cuantitativa de mejora: tokens/request -70% CASUAL, TTFT p50 <800ms.
- Tenant isolation + RBAC intactos (tests A≠B).
- Cada fase deja `dev` desplegable (Preview `preview.apps.dgtecnova.com`).

---

## 15. Trazabilidad y Changelog

- Commits `feat(novai):` / `fix(novai):` con Conventional Commits.
- `CHANGELOG.md` SemVer (MINOR para cada fase).
- PRs etiquetados `ai-assisted` cuando aplique.
- Migraciones `YYYY-MM-DDTHH-mm-ss_novai_*.sql` en `supabase/migrations/`.

---

## 16. Referencias

- Auditoría forense: `doc/plans/AUDITORIA_FORENSE_NOVAI_2026-08-27.md`
- Auditoría anterior: `doc/plans/2026-08-26_AUDITORIA_NOVAI_V2.md`
- Arquitectura vigente: `doc/plans/NOVAI_ARCHITECTURE.md`, `doc/plans/NOVAI_CONVERSATION_ARCHITECTURE.md`, `doc/plans/PLAN_MAESTRO_ARQUITECTURA_NOVAI_PRO.md`
- Base metodológica: `doc/plans/BASE_CONOCIMIENTO_METODOLOGIA_ESTRATEGICA_NOVAI.md`
- Prompts maestros: `doc/plans/Prompt maestro — Modernización…` y `Prompt maestro para auditoría integral…`

---

*Documento generado 2026-08-28 — Aprobado con criterios: Context Manager antes de Tools, novai_evidence dedicada, heurística pura inicial, Fase 1 aislada en feat/novai-v2-instrumentation.*

