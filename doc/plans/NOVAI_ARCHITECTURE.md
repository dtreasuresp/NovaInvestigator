# Arquitectura Técnica NovAi Agent Harness & NovaInvestigator Domain

**Versión:** 2.1 (2026-08-27) — PHASE 8 QSPM + PHASE 23 web_research  
**Estado:** Producción / Master Spec Vigente  
**Autor:** DGTECNOVA AI Engineering Team  

---

## 1. Visión y Desacoplamiento Fundamental

El sistema de Inteligencia Artificial de la plataforma se estructura en dos capas conceptuales con límites de responsabilidad estrictos:

```
┌───────────────────────────────────────────────────────────────────┐
│                      DGTECNOVA AI HARNESS                         │
│   (Runtime Universal, Model Router, Token Budget, Memory, SSE)    │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ Provee infraestructura agnóstica
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                    NOVAINVESTIGATOR DOMAIN                        │
│ (EFI/EFE, DAFO 4D, QSPM, CAME, Auditoría Epistémica, Anti-Sesgo)  │
└───────────────────────────────────────────────────────────────────┘
```

### 1.1 DGTECNOVA AI Harness (Núcleo Reutilizable)
- **Agnóstico al negocio:** No conoce términos como EFI, EFE, DAFO, CAME ni QSPM.
- **Responsabilidades:** Orquestación de modelos LLM, negociación SSE multi-proveedor, enrutamiento por capacidades, presupuesto y truncado de tokens, memoria estratégica/sesión, y pasarela de herramientas (Tool Gateway) con Human-in-the-Loop.
- **Componentes clave:**
  - `src/features/novai/agent-runtime.ts` (`NovaiAgentRuntime`) — tríada `gemini`→`openrouter`→`opencode-zen` (spec §26/27)
  - `src/features/novai/events.ts` (`NovaiEvent` protocol) — normalización multi-proveedor
  - `src/features/novai/adapters/model-router.ts` (`NovaiModelRouter`) — capability detection `capabilities.ts`
  - `src/features/novai/token-budget.ts` (`NovaiTokenBudgetEngine`)
  - `src/features/novai/memory-engine.ts` (`NovaiMemoryEngine`)
  - `src/features/novai/tool-gateway.ts` (`NovaiToolGateway`) — enforcement + audit `novai_audit_events`
- **Providers activos (§26):** `gemini` (3.6-flash/2.5-flash/2.5-pro), `openrouter` (llama-3.1-8b, qwen-coder, gemini-exp), `opencode-zen` (big-pickle). Legacy `pollinations/groq/cerebras/github` eliminados y convergidos a `NovaiAgentRuntime` `streamText()`.

### 1.2 NovaInvestigator Domain (Especialización Estratégica)
- **Dominio Analítico:** Reglas formales de auditoría matricial, verificación probatoria de factores, trazabilidad de linaje y cuestionamiento Red-Team.
- **Componentes clave:**
  - `src/utils/investigator/domain.ts` (`calculateAnalysis` incl. `calculateQspm` TAS=weight_normalized×AS - Motor canónico)
  - `src/features/novai/evidence-engine.ts` (`auditInvestigationConsistency` - Motor de consistencia)
  - `src/features/novai/methodology-knowledge.ts` (`auditDafoCrossing` - Axiomas epistemológicos)
  - `src/features/novai/tools/investigations/*` (8 tools expediente & evidencia — INTERNAL_EVIDENCE)
  - `src/features/novai/tools/methodology/*` (5 tools incl. `calculate_matrix` con `QSPM` §19)
  - `src/features/novai/tools/strategy/*` (3 tools linaje/comparación/Red-Team)
  - `src/features/novai/tools/research/web-research.ts` (1 tool §23 EXTERNAL_EVIDENCE — Tavily/Brave, distinguido de INTERNAL)

---

## 2. Protocolo Unificado de Eventos (`NovaiEvent`)

La comunicación cliente-servidor se estandariza mediante un flujo SSE estructurado en JSON Lines (`data: {"type": "...", ...}\n\n`). La interfaz de usuario **nunca** consume formatos propietarios crudos (`reasoning_content`, `parts`, etc.), sino el protocolo normalizado:

| Tipo de Evento | Descripción | Payload Principal |
| :--- | :--- | :--- |
| `agent-start` | Inicio del ciclo de razonamiento | `{ agentRunId, model, provider, mode }` |
| `trace` | Traza de trabajo de alto nivel (Work Trace) | `{ stepId, title, description, category, status, durationMs }` |
| `tool-call` | Invocación de una herramienta gobernada | `{ callId, toolName, displayName, args, riskLevel }` |
| `tool-result` | Resultado estructurado de la herramienta | `{ callId, toolName, success, result, error, durationMs }` |
| `text-delta` | Chunk de texto generado para el usuario | `{ delta, snapshot }` |
| `reasoning` | Traza de análisis (no pensamiento privado) | `{ delta }` |
| `message-complete` | Finalización del ciclo y métricas | `{ messageId, role, content, tokens, traceSummary }` |
| `error` | Notificación de error controlada | `{ code, message, retryable }` |

---

## 3. Principio de Presentación: Agent Trace vs Pensamiento Privado

> [!IMPORTANT]
> **Zero Private CoT Exposure:** La interfaz de usuario muestra un **Work Trace / Agent Trace** objetivo y auditable. Jamás se exponen bloques de `<think>...</think>` ni razonamiento interno sin procesar.

Ejemplo de flujo renderizado en UI (`ToolCard` + `AgentTrace`):
```
✓ NovAi identificó la investigación activa: FCBC Corp (ID: inv-fcbc-1)
✓ Consultó expediente y evidencias del factor D-03
✓ Consultó expediente y evidencias de la amenaza A-02
✓ Auditó el cruce D-03 × A-02 mediante motor determinista
⚠️ Alerta Metodológica: Relación plausible pero sin evidencia empírica directa
✓ Conclusión generada con clasificación epistémica: INFERENCE (Confianza: 60%)
```

---

## 4. Gobernanza y Seguridad Multi-tenant

1. **Aislamiento Cero-Confianza (Zero-Trust):**
   - El `tenantId` y `userId` se resuelven exclusivamente desde la sesión del `Principal` autenticado (`getCurrentPrincipal()`).
   - Ninguna herramienta acepta ni confía en `tenantId` enviado en el cuerpo de la petición.
2. **ReBAC & Postgres RLS:**
   - Toda lectura/escritura en base de datos ejecuta queries parametrizadas filtradas por `tenant_id` y gobernadas por las políticas RLS nativas de Supabase.
3. **Tool Gateway Enforcement:**
   - Clasificación de riesgo en 4 niveles (`read-only`, `low`, `medium`, `high`).
   - Herramientas destructivas o de alteración financiera/suscripciones exigen Human-in-the-Loop (`requiresApproval = true`) y confirmación explícita del usuario.

---

## 5. Clasificación Epistémica de Conclusiones

Toda conclusión estratégica producida por el agente se califica mediante el motor de validación probatoria:

- **`FACT`:** Corroborada directamente por datos documentales verificados en la investigación.
- **`EVIDENCE`:** Respaldada por informes, auditorías o notas de campo citadas en los factores.
- **`INFERENCE`:** Deducción lógica basada en la matriz de cruces sin una cita textual directa.
- **`HYPOTHESIS`:** Conjetura o propuesta estratégica que requiere validación empírica.
- **`ASSUMPTION`:** Premisa no corroborada identificada como posible punto ciego.
- **`UNSUPPORTED`:** Afirmación contradicha o carente de base en el expediente.
