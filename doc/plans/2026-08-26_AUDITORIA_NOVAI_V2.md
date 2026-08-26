# AUDITORÍA NOVAI PRO v2.0 — FASE 0
**Fecha:** 2026-08-26 · **Alcance:** Verificación de la implementación sin commitear del `PROMPT_NOVAI_PRO_V2.md` (trabajo de agente externo, noche del 25 al 26/08) · **Modo:** solo lectura + ejecución de checks. Cero modificaciones de código.

---

## 1. Veredicto ejecutivo

> **El trabajo de anoche es CONFIABLE en lo estructural y en seguridad base, pero está INCOMPLETO:**
> compila, pasa los 191 tests, respeta principal server-side y RLS.
> Sin embargo, el Tool Gateway (enforcement point exigido por el spec §38) **está desconectado del camino vivo**, y los eventos estructurados `evidence`/`audit`/`calculation`/`source` **nunca se emiten desde el backend**, dejando las 4 tarjetas UI como código muerto.

| Check | Resultado |
|---|---|
| `tsc --noEmit` | ✅ Pasa limpio (exit 0) |
| `pnpm test` | ✅ **191/191 tests, 39 suites, 0 fallos** (3.8s) |
| Build | ⏳ Pendiente (no ejecutado en esta auditoría) |

---

## 2. Qué existe y funciona (verificado)

| Componente | Evidencia | Estado |
|---|---|---|
| Protocolo `NovaiEvent` (14 tipos) | `src/features/novai/events.ts:8-161` | ✅ Completo |
| Agent Runtime multi-proveedor con fallback | `src/features/novai/agent-runtime.ts:28-278`; orden: Groq→OpenRouter→Zen→GitHub→Gemini→Pollinations | ✅ Funcional |
| Ruta SSE nueva cableada | `src/app/api/novai/chat/route.ts:63-98` (emite cada evento como `data:` SSE); usada por `src/views/apps/novai/index.tsx:485,793` y `ai-copilot-sheet.tsx:335` | ✅ Ambas vistas en ruta nueva |
| Parser UI del protocolo | `index.tsx:536-627` maneja `text-delta`, `trace`, `evidence`, `audit`, `calculation`, `source`, `tool-call`, `tool-result`, `message-complete` | ✅ Consumidor completo |
| Taxonomía modular de 21 tools (spec §8-9) | `src/features/novai/tools/{investigations,evidence→investigations,methodology,strategy,kanban,organization,billing,memory}/` + catálogo `tools/index.ts:62-91` | ✅ Las 15 tools nuevas del spec presentes |
| Seguridad: principal server-side | Todas las tools firman `execute(args, principal)` (`tools/types.ts:37`); `tenantId` nunca viene del cliente; queries vía `getInvestigationById(principal.client, principal.tenantId, id)` (`tools/investigations/get-active-investigation.ts:49`) | ✅ Cumple spec §38 |
| Persistencia + RLS | Migración `supabase/migrations/2026-08-27T00-00-00_novai_platform_persistence.sql`: 5 tablas (`novai_conversations/messages/memories/agent_runs/audit_events`), todas con `enable row level security` (:126-130) | ✅ |
| Reutilización de motores existentes (spec §46) | `get_active_investigation` usa `calculateAnalysis()` de `@/utils/investigator/domain` (:5,71); `audit_relationship` reutiliza `auditDafoCrossing()` de methodology-knowledge | ✅ Sin duplicación detectada |
| UI Cards creadas e importadas | `novai-{evidence,audit,calculation,source}-card.tsx`, `novai-trace-viewer.tsx` importadas en `novai-message-item.tsx:20-24,306,313` | ⚠️ Ver gap G2 |
| Documentación (spec §52) | `doc/plans/NOVAI_ARCHITECTURE.md`, `NOVAI_TOOLS.md`, `HARNESS_EXTRACTION_PROPOSAL.md` | ✅ |
| Tests nuevos (spec §47-48) | `tests/novai/{agent-scenarios,investigation-evidence-tools,methodology-strategy-tools}.test.ts` (~884 líneas) | ✅ Pasan |
| Coexistencia legacy (spec §1) | Endpoints `/api/investigations/ai/{chat,quota,report}`, `propose-dafo`, `propose-qspm` siguen vivos sobre `service.ts` | ✅ Sin reescritura masiva |

---

## 3. Gaps encontrados (priorizados)

### G1 · CRÍTICO — Tool Gateway desconectado (spec §38/§39)
- **Spec:** "Tool Gateway debe permanecer como enforcement point."
- **Realidad:** `NovaiToolGateway.executeGovernedTool` (`tool-gateway.ts:68-142`) **no tiene ni un llamador** (grep global = 0 resultados fuera del propio archivo). Las tools del runtime Vercel AI SDK se ejecutan directo vía `toVercelTool` → `executeAuditRelationship(args, principal)` p.ej. `tools/methodology/audit-relationship.ts:226-235`.
- **Impacto:** en el camino vivo NADIE evalúa riesgo (`checkPolicy`), NADIE escribe auditoría en `novai_audit_events` (`recordAuditEventAsync` solo corre desde el gateway). La tabla de auditoría existe pero recibe cero filas del flujo real. El gate de aprobación para futuras tools write tampoco aplica.

### G2 · ALTO — Eventos estructurados nunca emitidos (spec §24/§31-36)
- **Realidad:** `grep "type: 'evidence'|'audit'|'calculation'|'source'"` en `src/features/novai/**` solo encuentra las **definiciones** en `events.ts`. El runtime solo emite: `step-start`, `text-delta`, `tool-call`, `trace`, `tool-result`, `message-complete`, `error`.
- **Impacto:** `NovaiEvidenceCard`, `NovaiAuditCard`, `NovaiCalculationCard`, `NovaiSourceCard` son **inalcanzables** (código muerto de render). El Agent Trace muestra texto genérico "Consultando datos bajo aislamiento tenant seguro." (`agent-runtime.ts:213`) en lugar de evidencia/auditoría reales. Los datos SÍ llegan dentro del payload crudo de `tool-result`, pero no se proyectan a tarjetas.

### G3 · MEDIO — Sin capability detection (spec §27/§29)
- `adapters/model-router.ts` no contiene `supportsTools/supportsReasoning/supportsStructuredOutput/supportsStreaming` (grep = 0).
- El runtime pasa `tools` a TODOS los candidatos incl. el fallback Pollinations; si un proveedor no soporta function calling, la degradación es silenciosa (contraviene "NO simular tool calling sin que el Harness lo sepa").

### G4 · MEDIO — `service.ts` sigue siendo monolito + doble pipeline
- El runtime importa `resolveSystemPrompt/fetchTenantLiveOverview/assertNovaiAllowed/consumeAiQueryQuota` desde un `service.ts` de ~1100+ líneas con prompts inline (:1100-1160).
- Coexisten dos pipelines completos (legacy `client/*-client.ts` + `runWithToolCallingLoop` vs nuevo runtime Vercel SDK). Tolerable por diseño incremental, pero hay que declarar cuál es el camino canónico y planificar la convergencia.

### G5 · BAJO — Heurística de investigación activa
- `get_active_investigation` sin ID devuelve "la más reciente" (`get-active-investigation.ts:26-47`). El spec §10 pide determinismo desde contexto; la heurística es razonable pero conviene que el frontend envíe `context.investigationId` explícito.

### G6 · BAJO — `web_research` no implementado
- Conforme al propio spec §23 ("solo si infra existe") — decidir explícitamente si se descarta o se pospone.

---

## 4. Respuesta a la pregunta original: ¿por dónde empezamos?

El prompt v2 ya tiene cubiertas las fases 1-4 y parte de la 5-6 (con los huecos G1-G3). La secuencia propuesta:

```
FASE A (crítica): Conectar el Tool Gateway al camino vivo
  → envolver execute() de cada toVercelTool con checkPolicy + recordAuditEventAsync
  → la tabla novai_audit_events empieza a recibir el rastro real

FASE B (alto): Proyección de eventos estructurados
  → mapear resultado de tools {evidence→'evidence', audit_*→'audit',
    validate_methodology/calculate_matrix→'calculation', fuentes→'source'}
  → las 4 tarjetas UI pasan de código muerto a vivas

FASE C (medio): Tabla de capabilities por proveedor + degradación explícita
FASE D (medio): Declarar pipeline canónico y plan de convergencia de service.ts
FASE E: build + react-doctor + commit incremental por fases (reporte §58)
```

## 5. Validaciones ejecutadas en esta auditoría

- `npx pnpm run check-types` → exit 0
- `npx pnpm test` → 191 pass / 0 fail / 39 suites
- Trazado completo route→runtime→stream→UI con file:line
- Grep de llamadores del gateway, emisores de eventos, capability detection
- Revisión de migración SQL (RLS en 5/5 tablas)

*Nota: las líneas `apiKey: ***` vistas durante la auditoría son artefacto del scrubber de secretos de las herramientas del agente, NO del código real (verificado: tsc compila y el patrón coincide con el pitfall documentado en skills).*
