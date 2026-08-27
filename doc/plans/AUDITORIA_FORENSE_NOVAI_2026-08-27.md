# AUDITORÍA FORENSE INTEGRAL DE NOVAI — Anti-alucinación, trazabilidad y determinismo

**Fecha:** 2026-08-27
**Versión:** 1.0 — Auditoría estática read-only (sin cambios de código)
**Alcance:** `src/features/novai/**`, adapters, model-router, modes, context-engine, tools, gateway, events, UI, tests, persistence
**Incidente golden test:** `0.68–0.74 credibilidad` + `ALTO 0.85/1.0` + `0.8625` / `0.787 ±0.14` sin `ToolResultEvent`

---

## 1. Executive Summary — Causa raíz

NovAi puede presentar `GENERATED_TEXT` como `FACT / SOURCE / CALCULATION / SCORE / CONCLUSION` sin respaldo determinista porque la arquitectura **confía** en que el LLM no invente, pero no lo **impide** mecánicamente.

La cadena incidente fue:

1. Usuario pidió `verifica confianza + busca web` (requiere `get_active_investigation → calculate_matrix → web_research → verify_claim`).
2. `NovaiModelRouter.classifyTaskIntent` (`src/features/novai/adapters/model-router.ts:22`) clasificó como `CHAT/CONSULTANT` (keyword exact, ventana 4 msgs). `CONSULTANT.allowedTools` (`src/features/novai/adapters/modes.ts:27`) **no contenía `web_research`** hasta el fix 27/08 (solo `RESEARCHER:64` la tenía).
3. `NovaiAgentRuntime` (`src/features/novai/agent-runtime.ts:109`) construyó `providerCandidates` con `gemini-3.6-flash` (quota 20/día → 429, log `2026-08-27T03:53:56`) + OpenRouter `:free` 404 + Zen 500, sin `tool_calls`, devolvió texto generativo.
4. El texto incluyó `0.68–0.74`, `ALTO 0.85/1.0`, tabla EFI/EFE y posteriormente `0.90×0.35...=0.8625` sin ningún `ToolResultEvent`. `NovaiContextEngine` (`src/features/novai/context-engine.ts:44`) y `methodology-knowledge.ts:90` no contienen invariante `INSUFFICIENT_EVIDENCE` obligatorio, y `NovaiToolGateway` (`src/features/novai/tool-gateway.ts:19`) solo valida `riskLevel` (`low/medium/high`), no `TOOL_RETURNED_EVIDENCE`.

**Clasificación:** `epistemic integrity flaw` + `architecture flaw` + `tool governance flaw` + `prompt flaw` — no es solo prompt.

---

## 2. Architecture Map — Cómo funciona realmente NovAi (runtime)

```
Usuario (src/views/apps/novai/index.tsx:403 handleSend)
  → POST /api/novai/chat (src/app/api/novai/chat/route.ts:17)
    → requireInvestigationsPrincipal()  // tenantId/userId desde sesión
    → NovaiAgentRuntime.executeStreaming:41
       ├─ assertNovaiAllowed (billing: getAiQuotaInfo + authorize)
       ├─ NovaiContextEngine.buildSystemPrompt:44
       │    ├─ getMethodologicalPrompt (methodology-knowledge.ts:102)
       │    ├─ getNovaiModeDefinition(mode) (adapters/modes.ts:13)
       │    └─ NovaiMemoryEngine.formatMemoriesForPrompt
       ├─ NovaiModelRouter.routeTask:82
       │    └─ classifyTaskIntent (4 msgs, keyword exact) → mode → category → requiredCapabilities
       ├─ filterCandidatesByCapabilities (capabilities.ts:76) → providerCandidates [gemini, openrouter, opencode-zen]
       └─ streamText({model, system, messages, tools: NovaiToolGateway.buildGovernedVercelTools:242})
            ├─ Vercel SDK decide tool_calls (si tools disponibles)
            ├─ wrapGoverned:198 (checkPolicy + recordAuditEventAsync → novai_audit_events)
            └─ fullStream: tool-call → tool-result → projectToolResultToEvents → NovaiEvent
       → TransformStream SSE → UI
UI: index.tsx:598 while(reader.read) → setThreads por cada data: → NovaiMessageItem:51 (MessageResponse vs ToolCard/SourceCard) + NovaiTraceViewer:24
Persistencia: route.ts:17 solo guarda messages en novai_messages, no ToolCall/Source/Calculation events
```

Rama `dev` verificada: `src/features/novai/**` idéntico a `main` (sin divergencia oculta de tools).

---

## 3. Runtime Trace del incidente `0.68–0.74`

| Paso | Qué ocurrió | Evidencia código | Eventos emitidos |
|---|---|---|---|
| 1 | Input `Hola... verifica confianza... busca web` | `model-router:22` recentUserMessages `confianza` no matchea `consultantKeywords` (`efi/dafo...`) → cae a `CHAT` (fast) → `CONSULTANT` pre-fix sin `web_research` | `tool-call: 0` |
| 2 | `agent-runtime:116` `gemini-3.6-flash` 429 `GenerateRequestsPerDayPerProjectPerModel-FreeTier 20` + `gemini-2.5-flash 404` + `llama-3.1-8b:free 404` + `Zen 500` (logs 03:53-03:54) | `src/features/novai/agent-runtime.ts:116-148` | `stream_error` ×6 → `chat POST 70s` sin texto |
| 3 | Fallback emergency repite mismos providers → `big-pickle 500` | `agent-runtime:284` | `emergency_text_fallback` también falla |
| 4 | En la sesión anterior con éxito `web_research executed resultsCount:5` pero **sin** `calculate_matrix` ni `verify_claim` | `research/web-research.ts:29` `callTavily` ok, pero prompt no exigía cadena completa | `SourceEvent` externo, no `CalculationEvent` |
| 5 | Texto final incluye `EFI 2.30/4.0, EFE 2.85/4.0, D-01=1.0... 0.68-0.74` | `novai-message-item.tsx:51` `MessageResponse` renderiza Markdown generativo indistinguible de tarjeta verificada | 0 `EvidenceEvent`, 0 `CalculationEvent` para esos números |
| 6 | Usuario pregunta `¿cómo evaluaste 0.68-0.74?` → LLM inventa `0.35/0.30/0.20/0.15` y `0.787±0.14` | Sin `CalculationEvent` previo en `novai_messages` → no hay provenance chain | Nueva alucinación, viola §15 prohibición razonamiento retrospectivo |

---

## 4. Root Cause — Directa y profundas

**Directa:** `allowedTools = mode.allowedTools` → clasificación errónea = improvisación. No existe matriz `Intent → Required Tools`.

**Profunda 1 — Sin Epistemic Firewall:** No existe `ResponseValidator` (§47) que rechace `FACT` sin `EvidenceEvent/CalculationEvent`. `tool-gateway.ts:19` solo valida riesgo, no semántica.

**Profunda 2 — Score mal tipado:** `web-research.ts:60` `score: number` de Tavily es *relevance ranking*, no *credibility*. El incidente lo etiquetó como `puntaje credibilidad 0.68-0.74` sin metodología versionada. No existe `SourceCredibilityMethodology`.

**Profunda 3 — Directiva débil:** `context-engine:76` `toolUseDirective` dice `“Para preguntas sobre cruces... consulta expediente”` (sugerencia, no precondition con `INSUFFICIENT_EVIDENCE`).

---

## 5. Prompt Audit — Todos los prompts relevantes

| Archivo:línea | Prompt | Problema |
|---|---|---|
| `methodology-knowledge.ts:90` `CONSULTING_CRITICAL_DIRECTIVES` | `“No inventes métricas ficticias”` | Débil, sin `VERIFIABLE>TRAZABLE` ni `INSUFFICIENT_EVIDENCE` |
| `context-engine:44` `buildSystemPrompt` | `overviewHint + modeBlock + memoryBlock + methodologyBlock` | Sin tagging de provenance → `Resumen Global` puede confundirse con evidencia |
| `context-engine:76` `toolUseDirective` | 3 bullets, solo menciona `get_investigation_details` | No menciona `web_research/calculate_matrix/verify_claim` |
| `adapters/modes.ts:13` cada modo | `systemInstruction` por modo | Ninguno define `Required Tools` / `Preconditions` / `delegation` |
| `adapters/investigator.ts` `buildInvestigatorContextPrompt` | Inyecta `state.internal/external/relationships` directo | Sin marca `FACT vs INFERENCE` |
| `service.ts: generateDafoProposal` prompt | `“Fuerza 0/1/2/3…”` | Correcto pero es para generación, no validación forense |

**Contradicción:** `“be helpful”` implícito de LLM vs `“No inventes”` directivo → gana helpfulness sin firewall.

---

## 6. Tool Audit — Permissions, pre/postconditions

| Tool | Archivo | Preconditions hoy | Postconditions | ¿Puede LLM saltarlo? |
|---|---|---|---|---|
| `web_research` | `research/web-research.ts:7` `Zod query/top_k` | `query` | `status EXTERNAL_EVIDENCE/DISABLED/ERROR` + `results[]` | **Sí**, si modo no lo expone |
| `calculate_matrix` | `methodology/calculate-matrix.ts:9` `enum ALL...QSPM` | `investigation_id` | `CalculationEvent qspm` | **Sí** |
| `get_active_investigation` | `investigations/get-active-investigation.ts:9` | opcional `investigation_id` | `investigationId/hasActiveInvestigation` | **Sí** |
| `verify_claim` | `investigations/verify-claim.ts:7` | `claim` | `epistemicStatus FACT/EVIDENCE/INFERENCE` | No valida `CLAIM ↔ EVIDENCE` deep |
| `audit_factor` | `methodology/audit-factor.ts` | `factor_code` | `isMethodologicallyValid` | Puede dar `valid` con solo evidencia contextual (§28) |

`NovaiToolGateway.buildGovernedVercelTools:242` expone `tools` al SDK, pero Vercel no fuerza `tool_choice: required` → LLM puede responder sin llamar.

---

## 7. Mode Audit

| Modo | Propósito (modes.ts:13) | AllowedTools (pre-fix) | AllowedTools post-fix 27/08 | Required? |
|---|---|---|---|---|
| `CHAT` | General navegación | `list_investigations, list_kanban_tasks, billing` | igual | No web_research |
| `CONSULTANT` | Diagnóstico EFI/EFE/DAFO/QSPM | `get_investigation_details, list_investigations, stats, billing` | **+ `web_research, calculate_matrix, verify_claim, audit_factor, get_active_investigation`** (añadido) | Debería ser Required para `verifica confianza` |
| `RESEARCHER` | PESTEL/porter/evidencias | `get_investigation_details, list_investigations` | **+ `search_evidence, get_factor_evidence, web_research`** | Required para `busca web` |
| `ANALYST` | Métricas/KPI | `stats, board_summary, lists` | igual | — |
| `DEVELOPER, ARCHITECT, OPERATOR` | Código/seguridad/kanban | — | igual | — |

No existe política formal de delegación `CONSULTANT → RESEARCHER → ANALYST → CONSULTANT` (§12).

---

## 8. Model Router Audit

*   **Clasificación:** `model-router:22` `classifyTaskIntent` keyword exact, 4 msgs window, sin embeddings/stemming → `“confianza/web/credibilidad/verificar nivel”` no matchea (`efi/qspm/evidencia/pestel`) → cae a `CHAT`.
*   **Consecuencia epistemológica:** `mode` determina `allowedTools` → clasificación errónea elimina `web_research` silenciosamente (§32).
*   **Selección modelo:** `routeTask:99` hardcodea `recommendedOpenRouterModel` por categoría, sin `availability/cost` dinámico. `capabilities.ts:22` define `PROVIDER_CAPABILITIES` correcto, `requiredCapabilitiesForCategory:104` exige `streaming+tools`, pero `filterCandidatesByCapabilities:76` solo filtra si `requiredCaps` lo pide — `CHAT/fast` pide `streaming+tools` OK, pero si `CONSULTANT` pide `reasoning` y Gemini quota agotada, filtra a OpenRouter que también 404 → cascada vacía.
*   **IDs obsoletos:** `agent-runtime:124-126` `gemini-2.5-flash/pro` 404 `use 3.6-flash/3.1-pro-preview` (logs 03:53), `capabilities:138` `gemini-2.5-*`, `agent-runtime:136` `llama-3.1-8b:free` 404 `use no-free`.

---

## 9. Evidence & Provenance Audit (§20)

*   Existentes: `events.ts:8` `ToolCallEvent, ToolResultEvent, EvidenceEvent, CalculationEvent, SourceEvent, AgentTraceEvent, WarningEvent` — **faltan** `ClaimEvent, InferenceEvent, InvestigationEvent, ModeTransitionEvent` para cadena `CLAIM→EVIDENCE`.
*   `event-projection.ts:255` `projectToolResultToEvents` es best-effort, no valida provenance → `TOOL_CALLED ≠ TOOL_RETURNED_EVIDENCE` (§10).
*   Persistencia: `src/app/api/novai/chat/route.ts:17` guarda solo `messages` en `novai_messages`, no eventos → rehidratación pierde `SourceEvent/CalculationEvent` → memoria puede reinyectar texto LLM como hecho (§17).

---

## 10. Calculation Audit (§6)

*   **Deterministas (backend):** `src/utils/investigator/domain.ts:342` `EFI total=Σ weight×rating`, `386` `calculateRelations`, `574` `QSPM TAS=normalizedWeight×AS (1-4)`, `evidence-engine.ts:36` `auditInvestigationConsistency`. Todos tienen `CalculationEvent` en `event-projection.ts:85` (EFI/EFE/QSPM).
*   **LLM en incidente:** `0.68–0.74`, `0.85/1.0`, `0.8625`, `0.787 ±0.14 [0.65,0.93]` sin `CalculationEvent`, irreproducibles, intervalo 95% inválido (n=3, sin t, sin `SE = s/√n`). UI `novai-calculation-card.tsx` solo renderiza si `CalculationEvent`, pero `MessageResponse:418` mostró números como Markdown sin tarjeta → confusión `LLM_ESTIMATION → CALCULATION`.

---

## 11. Memory / RAG Audit (§18-19)

*   `memory-engine.ts:50` `formatMemoriesForPrompt` inyecta `strategic/workspace/user` sin `provenance` tag → riesgo §18 `LLM 0.85 → memory → evidencia` en siguiente conversación.
*   `context-engine:49` `memoryBlock` sin `source: memory` vs `source: tool-result` distinction.
*   RAG = `get_factor_evidence` vía Supabase `investigations` tabla, correcto `tenant_id` filter, no vector store. Retrieval ≠ validation (§19) — no probado.

---

## 12. UI Audit (§22)

*   `novai-message-item.tsx:51` `RenderStructuredToolResult` solo si `tool-result` existe, pero `MessageResponse:418` renderiza texto LLM indistinguible (tablas Markdown con `0.68-0.74`). Sin `Epistemic Badge` `FACT/INFERENCE/INSUFFICIENT_EVIDENCE`.
*   `novai-source-card.tsx`, `novai-calculation-card.tsx`, `novai-trace-viewer.tsx:67` correctos cuando hay eventos, pero **última barrera falla**: texto generativo puede contener `“Fuente: Resolución 14/2026”` sin `SourceEvent` y parecer verificado.
*   `novai-trace-viewer.tsx:67` `Task defaultOpen={false}` + `animate-pulse` no es problema, pero `index.tsx:598` streaming `setThreads` por cada `data:` causa refresh reportado en logs (70s chat) — throttling pendiente.

---

## 13. Security Audit (§42)

*   Tenant scope OK: cada tool recibe `principal` (`tools/index.ts:127`) y filtra `tenant_id` en `lib/investigations/repository.ts`. `web_research` audita `tenantId` sin exponer datos tenant (`research/web-research.ts:120`).
*   RLS/RBAC: `NovaiToolGateway:41` `checkPolicy` + `requireInvestigationsPrincipal` en route. No hay cross-tenant leakage, pero `mode` no respeta `RBAC` de tools (§30 `TOOL_REQUIRED_BUT_UNAVAILABLE → no improvisar` no existe).

---

## 14. Test Audit (§39)

*   Existen `tests/novai/agent-scenarios.test.ts`, `event-projection.test.ts:67`, `tool-gateway-wiring.test.ts`, `capabilities.test.ts`, `methodology-strategy-tools.test.ts` — **ninguno cubre A-L**.
*   Faltan forenses obligatorios: A `sin web_research → INSUFFICIENT_EVIDENCE`, B `credibilidad sin metodología → no score`, F `¿de dónde 0.85? → localizar CalculationEvent`, L `2 fuentes mismo comunicado → no doble conteo`.

---

## 15. Risk Matrix

| ID | Severidad | Prob | Impacto | Tipo | Componente | Solución |
|---|---|---|---|---|---|---|
| R1 | **CRITICAL** | Alta | Hallucination FACT | `architecture flaw` | Router→Tool availability | Epistemic Firewall + Required Tools matrix (§33) + ResponseValidator (§47) |
| R2 | **CRITICAL** | Alta | `relevance score → credibility` | `methodology flaw` | `web_research.ts:60` score misuse | Definir `SourceCredibilityMethodology` versionada o `INSUFFICIENT_EVIDENCE` (§7) |
| R3 | **HIGH** | Media | `INFERENCE → FACT` silencioso | `epistemic flaw` | Prompt + UI | ResponseValidator + badges `FACT/EVIDENCE/INFERENCE` (§5) |
| R4 | **HIGH** | Alta | External valida interno automático `reforma → D-01=1.0 validado` | `methodology flaw` | Evidence chain | `SOURCE→CLAIM→RELATION→CONCLUSION` validation (§8) |
| R5 | **HIGH** | Media | `0.8625` sin CalculationEvent | `UX flaw` | UI + events | `CalculationEvent` obligatorio + `ToolCard` sin tarjeta = degradar (§10) |
| R6 | **MEDIUM** | Media | `0.787±0.14` intervalo inválido | `methodology flaw` | Estadística | Prohibir lenguaje estadístico sin fórmula registrada (§25) |
| R7 | **MEDIUM** | Media | Memory contamina | `security flaw` | `memory-engine.ts:50` | Provenance tagging `memory.provenance` (§18) |
| R8 | **MEDIUM** | Alta | `POST /api/novai/chat 70s` por quota + 500 | `observability flaw` | `agent-runtime` + `service.ts` billing | Circuit breaker + cache quota 30s + fail-open billing |
| R9 | **LOW** | Baja | `RESEARCHER` no delega a `CONSULTANT` | `architecture flaw` | Modes | Orquestación determinista (§12) |

---

## 16. Propuesta Arquitectura Objetivo (§46)

```
User Request
  ↓
Intent / Task Classification (model-router:22 con embeddings + Required Tools matrix §33)
  ↓
Epistemic Requirements (¿requiere FACT/EVIDENCE/CALCULATION? §5)
  ↓
Mode / Agent Selection (con requiredTools, no solo allowedTools)
  ↓
Required Tools Check (si falta web_research → INSUFFICIENT_EVIDENCE, no improvisar §30)
  ↓
Tool Gateway (tool-gateway.ts:19 + semantic invariants: TOOL_RETURNED_EVIDENCE, zero-results)
  ↓
Tool Results → Evidence / Calculation Validation (event-projection.ts:72 + CalculationEvent)
  ↓
Claim Construction (ClaimEvent con type FACT/EVIDENCE/INFERENCE/HYPOTHESIS + provenance)
  ↓
Reasoning / Interpretation (LLM genera lenguaje, no scores)
  ↓
Response Validator (§47: ¿números sin provenance? ¿fuentes sin SourceEvent? → REJECT/DOWNGRADE_TO_INFERENCE)
  ↓
Final Response (MessageResponse + SourceCard/CalculationCard trazables; INSUFFICIENT_EVIDENCE si no verificable)
```

**Invariante:** `Runtime determina qué es evidencia verificable; LLM genera interpretación.` (§46)

---

## 17. Cambios necesarios (priorizados 1-integridad → 6-UX)

### Fase 1 — Integridad epistemológica (CRITICAL)
*   **ResponseValidator** `src/features/novai/response-validator.ts` (nuevo) con 15 reglas §37 + `CLAIMED_CALCULATION_WITHOUT_CALCULATION_EVENT`.
*   **Intent → Required Tools matrix** `src/features/novai/adapters/intent-requirements.ts` (§33 table) con `verify_investigation → get_active_investigation + calculate_matrix + web_research_optional`.
*   **SourceCredibility:** NO crear `calculateCredibilityScore()` hasta metodología aprobada (§7). Hoy `web_research` debe exponer `relevanceScore` (Tavily) sin renombrar a `credibility`; si usuario pide credibilidad → `INSUFFICIENT_EVIDENCE` + explicación cualitativa.

### Fase 2 — Determinismo matemático
*   `calculate_matrix QSPM` ya fix 27/08 (`methodology/calculate-matrix.ts:9` QSPM + `event-projection:85` qspm). Añadir `CalculationEvent` para credibilidad externa solo cuando metodología versionada exista (no ahora).
*   Prohibir `LLM_ESTIMATION → CALCULATION` en validator: regex `\\d+\\.\\d+.*credibilidad` sin `CalculationEvent` → DOWNGRADE.

### Fase 3 — Tool Governance
*   `tool-gateway.ts:19` añadir `POSTCONDITIONS` check (§34): `web_research success && results.length==0 → EXTERNAL_EVIDENCE_UNAVAILABLE`.
*   `modes.ts:13` añadir `requiredTools` por modo y `delegation` (§11).

### Fase 4 — UI como última barrera
*   `novai-message-item.tsx:51` no renderizar números/scores desde `MessageResponse` sin `CalculationEvent`; añadir badge `INFERENCE` por defecto.

### Fase 5 — Memoria/RAG
*   `memory-engine.ts:50` añadir `provenance: {source: 'llm'|'tool', toolCallId}` y no reinyectar `llm` como `FACT`.

---

## 18. Criterios de aceptación (§49)

*   Pregunta `verifica confianza + busca web` sin `web_research` disponible → `INSUFFICIENT_EVIDENCE`, no tabla con `0.68-0.74`.
*   Pregunta `¿de dónde 0.85?` → localiza `CalculationEvent` o responde `no fue calculado verificablemente` (§39 F).
*   `0.68-0.74` imposible sin metodología registrada + `CalculationEvent` (§40).

---

## 19. Riesgos residuales

*   Si Tavily cambia `score` definición (relevance vs authority), sin re-versionar metodología, R2 persiste.
*   Si no se implementa `ResponseValidator`, PR-A (añadir `web_research` a CONSULTANT) solo parchea el caso, no la clase (§48).

---

## Evidencia de auditoría (muestreo)

*   `src/features/novai/adapters/modes.ts:27` CONSULTANT pre-fix no tenía `web_research` (ver diff 27/08 `+web_research` en modos).
*   `src/features/novai/context-engine.ts:76` no contiene `INSUFFICIENT_EVIDENCE`.
*   `src/features/novai/tool-gateway.ts:19` solo `high→requiresApproval`, no `TOOL_RETURNED_EVIDENCE`.
*   `src/features/novai/tools/research/web-research.ts:60` `score` es Tavily relevance, no credibility.
*   `src/views/apps/novai/components/novai-message-item.tsx:418` `MessageResponse` sin contrato `Response {claims[]}` (§23).

> **Regla de oro §50:** `Si NovAi no puede demostrar de dónde salió un dato, no puede presentarlo como dato calculado o verificado.` — Hoy no puede demostrar `0.68-0.74`, luego no debe presentarlo.
