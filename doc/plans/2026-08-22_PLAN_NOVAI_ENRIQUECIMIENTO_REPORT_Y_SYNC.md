# Plan Maestro: NovAi — Enriquecimiento de Dictamen, Persistencia, Sync Multi-Pestaña y Modelos Free (v2.4.0)
**Proyecto:** NovaStore ERP — NovAi / NovaInvestigator  
**Fecha:** 2026-08-22  
**Versión:** 2.4.0 (propuesta → implementación)  
**Estado:** Aprobado por producto — implementación en curso  
**Autor:** Hermes Agent + Dany  
**Depende de:** `PLAN_MAESTRO_COPILOT_IA` v2.3.0, `ai-provider-integration` skill, `novasuite-repo-rules-workflow`

---

## 1. Resumen Ejecutivo

Se enriquece el **dictamen con IA del Informe Resumen** para que sea profesional y aterrizado a datos reales (estadísticos DAFO/QSPM/CAME + auditoría de calidad), se corrige la **pérdida del dictamen al cambiar de pestaña** con persistencia en BD (última versión), se sincronizan **créditos IA en tiempo real multi-pestaña**, se unifica **historial NovAi ↔ Sheet Investigador**, y se amplía el catálogo de **modelos free de OpenRouter** con tool-calling.

**Decisiones de producto confirmadas:**
- Persistencia del dictamen en **BD** (no localStorage), siempre la **última versión** (upsert sobreescribe si hay 5).
- Sin `git commit/push` sin autorización explícita.

---

## 2. Diagnóstico Previo (evidencia file:line)

| Hallazgo | Archivo | Línea |
|----------|---------|-------|
| Dictamen genera 4 capítulos pero solo cita EFI/EFE/dominante y TAS | `src/utils/investigator/academic-report.ts:208` | 4 capítulos, usa `efiVal, efeVal, dominant, evaluatedCount, topCame` |
| Informe estándar no cita distribución FO/DO/FA/DA, ni CAME por prioridad, ni issues | `src/features/ai/context-builder.ts:58-104` | `cameList` corta a 10, sin conteos por categoría |
| `aiReportText` volátil | `src/views/apps/investigator/summary/index.tsx:39` | `useState('')` sin persistencia; `currentDisplayReport` se borra al desmontar |
| Sheet Investigador en memoria | `src/views/apps/investigator/shared/ai-copilot-sheet.tsx:77` | `messages` en `useState`, se pierde al cerrar |
| NovAi persiste en localStorage | `src/views/apps/novai/index.tsx:43` | `novastore:novai_threads_v2` sí persiste |
| Cuota solo on-mount + on-done | `src/hooks/use-investigator-analysis.tsx:205` + `src/views/apps/novai/index.tsx:84` | `refreshAiQuota()` solo en mount/open/done, sin polling ni Broadcast |
| Cálculo ya disponible no inyectado | `src/utils/investigator/domain.ts:386-777` | `calculateAnalysis` expone `relations.summary`, `qspm`, `came.byType`, `validation` |
| Cadena de providers | `.env.example` + `src/features/ai/openrouter-client.ts:1` | `OpenRouter → Zen(big-pickle) → GitHub → Pollinations → Cerebras → Groq → Gemini(paused)` |

---

## 3. Objetivos y Criterios de Aceptación

### 3.1 Informe enriquecido (P1)
- [ ] El dictamen con IA cita **números exactos**: EFI/EFE con `weightTotal`, `evaluatedCount/available/coverage` DAFO, `dominant` + `confidence` + `index`, `QSPM TAS` de ganadora y 2ª con `diff`, `CAME` por tipo y por `categoría (crítica/alta/media/baja)`, y `validation.errors/warnings`.
- [ ] Añade **capítulo 5: Auditoría de calidad y recomendaciones** que, si hay `warnings`, lista por ID qué falta (factores sin evidencia, pesos ≠1, relaciones sin evaluar, QSPM incompleta, CAME sin responsable/indicador) con sugerencias accionables; si no hay warnings, celebra y sugiere profundización.
- [ ] El prompt se genera **server-side** (no client) para garantizar que usa `calculateAnalysis(state)` real, no alucinación.

### 3.2 Persistencia del dictamen (P1) — **en BD, última versión**
- [ ] Tabla `investigation_ai_reports(investigation_id PK, tenant_id, report_text, locale, model, format, generated_at, generated_by)` con `FK investigations(id)` y `UNIQUE(investigation_id)` (upsert).
- [ ] RLS: `tenant_id = auth.tenant_id` + `is_active_tenant_member` + `has_capability('ai.report')` para SELECT/INSERT/UPDATE.
- [ ] API `GET /api/investigations/:id/ai-report` hidrata al entrar a Resumen; `POST /api/investigations/ai/report` hace `upsert` en `onComplete` (no en abort).
- [ ] UI `SummaryView` hidrata desde BD si existe; si el usuario genera 5 veces, la fila se sobreescribe (siempre última).

### 3.3 Créditos en tiempo real multi-pestaña (P2)
- [ ] `BroadcastChannel('novastore:ai-quota')` propaga `quota` tras cada `refreshAiQuota` / `consume`.
- [ ] Polling de respaldo `15s` con `visibilitychange` (solo si pestaña visible) + `focus` event.
- [ ] (Opcional si hay cuota Supabase) Realtime `postgres_changes` en `billing_entitlement_usage` por `tenant_id` como 3ª fuente — documentado pero no bloqueante.

### 3.4 Historial unificado NovAi ↔ Sheet (P2)
- [ ] Sheet Investigador lee/escribe en el mismo `localStorage:novastore:novai_threads_v2` o, a medio plazo, en tabla `novai_threads` (fase 2). Mínimo: el Sheet muestra las conversaciones de `/apps/novai` y viceversa (filtro por `context.app='investigator'`).

### 3.5 Modelos free OpenRouter (P3)
- [ ] Catálogo `freeTierModels` en `src/features/ai/openrouter-client.ts` con rotación `qwen/qwen3-235b-a22b:free`, `meta-llama/llama-4-maverick:free`, `google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-v3:free` (todos con tag `Tools` según docs), + fallback `openrouter/free` router. Se respeta `20 RPM / 50 RPD (1000 con $10)` y se evita tool-calling en modelos sin soporte (detección 404 `No allowed providers`).

---

## 4. Arquitectura y Flujo

```mermaid
flowchart TD
  UI[SummaryView / AiReportDialog] -->|POST state+locale| REPORT[/api/investigations/ai/report]
  REPORT --> SVC[streamAiReport]
  SVC --> CTX[buildInvestigationSystemPrompt + buildQualityInsights]
  CTX --> LLM[OpenRouter → Zen → GitHub → Pollinations → ...]
  LLM -->|SSE chunk| UI
  SVC -->|onComplete| UPSERT[(investigation_ai_reports upsert)]
  UI -->|mount| GET[/api/investigations/:id/ai-report]
  GET --> UPSERT
  UI2[AiCopilotSheet / NovAiView] -->|refreshAiQuota| QUOTA[/api/ai/quota]
  QUOTA --> BC[BroadcastChannel novastore:ai-quota]
  BC <--> TAB2[Otra pestaña]
  QUOTA -.-> RT[(Supabase Realtime billing_entitlement_usage)]
```

---

## 5. Diseño Detallado por Capa (SODA)

### 5.1 Infraestructura — Migración Supabase
**Archivo:** `supabase/migrations/2026-08-26T00-00-00_investigation_ai_reports.sql`
- `create table investigation_ai_reports (investigation_id uuid primary key references investigations(id) on delete cascade, tenant_id uuid not null references tenants(id), report_text text not null, locale text not null default 'es', format text not null default 'academic', model text, generated_at timestamptz not null default now(), generated_by uuid references auth.users(id), constraint fk_tenant foreign key)` 
- `create index on investigation_ai_reports(tenant_id)`
- `alter table investigation_ai_reports enable row level security`
- Policies: `select using (is_active_tenant_member(auth.uid(), tenant_id))`, `insert/update using (is_active_tenant_member + has_capability(ai.report))`, `delete` solo owner/admin.
- Sin `select *` en repositorio; columnas explícitas.

### 5.2 Dominio — `src/features/ai/context-builder.ts` + `src/features/ai/service.ts`
- Nueva `buildQualityInsights(state, analysis, validation): string` que serializa:
  ```
  === ESTADÍSTICAS REALES DEL EXPEDIENTE ===
  EFI 2.73/4 (peso 1.00, 10 factores) · EFE 2.41/4 (peso 1.00, 10 factores)
  DAFO: 37/100 evaluadas (37%), dominante FO index 0.42 (media), cobertura 0.68, 2ª DO 0.31 diff 26%
  Por cuadrante: FO 0.42 (12/20), DO 0.31 (10/20), FA 0.18 (8/30), DA 0.09 (7/30)
  QSPM: ganadora EST-DO-01 TAS 6.82 (int 3.41 ext 3.41) vs 2ª EST-FA-01 6.15 diff 0.67 · 4 factores pendientes · tie false
  CAME: 12 acciones (C:4 A:3 M:3 E:2) · crítica:2 alta:4 media:5 baja:1 · 3 sin responsable
  Validación: 2 errores (EFI pesos 0.98, CAME pesos 0.92) · 6 warnings (F-03 sin evidencia, D-08 peso 0.20 alto sin justificar, 63 relaciones pendientes)
  ```
- `buildInvestigationSystemPrompt` antepone este bloque antes de `FACTORES INTERNOS`.
- `REPORT_PROMPTS[locale]` añade capítulo 5 con directiva de auditoría y cita de IDs.

### 5.3 Dominio — `src/lib/investigations/repository.ts` + nuevo `src/lib/investigations/ai-reports.ts`
- `getAiReport(client, tenantId, investigationId)` + `upsertAiReport(client, {tenantId, investigationId, reportText, locale, format, model, generatedBy})` con `onConflict: investigation_id`.

### 5.4 API — `src/app/api/investigations/ai/report/route.ts` + `src/app/api/investigations/[id]/ai-report/route.ts`
- `POST` sigue haciendo streaming, pero en `onComplete` hace `upsertAiReport` (best-effort, no falla el stream si falla el upsert; log warn).
- `GET` protegido por `requireInvestigationsPrincipal` + `requireCapability('ai.report')`.

### 5.5 Vista — `src/views/apps/investigator/summary/index.tsx` + `ai-report-dialog.tsx`
- `SummaryView` en `useEffect` hace `GET` si hay `state.metadata.id` y no hay `aiReportText`; si existe, `setAiReportText(cached.report_text)` + `setActiveReportTab('ai')` si el usuario ya generó.
- `AiReportDialog` en `onComplete` no solo `onReportGenerated`, también dispara `refreshAiQuota` (ya lo hace) y el `BroadcastChannel`.

### 5.6 Cuota Sync — `src/hooks/use-investigator-analysis.tsx` + `src/views/apps/novai/index.tsx` + `src/views/apps/investigator/shared/ai-copilot-sheet.tsx`
- Hook `useQuotaSync` reutilizable: `BroadcastChannel('novastore:ai-quota')` + `setInterval 15000` con `document.visibilityState === 'visible'` + `window focus`.
- `refreshAiQuota` hace `postMessage(quota)` tras fetch.

### 5.7 Modelos Free — `src/features/ai/openrouter-client.ts` + `src/features/ai/service.ts` + `src/features/novai/service.ts`
- Lista `FREE_MODELS_WITH_TOOLS = ['qwen/qwen3-235b-a22b:free','meta-llama/llama-4-maverick:free','google/gemma-3-27b-it:free','openrouter/free']` con rotación en `callOpenRouterStreaming` si `404 No allowed providers`.
- Documentar en `.env.example` que `OPENROUTER_MODEL` puede ser `:free` y que 50/día → 1000 con `$10`.

---

## 6. Seguridad y Multi-tenancy (§3, §4 AGENTS.md)

- `tenantId` nunca del body: `requireInvestigationsPrincipal().tenantId`.
- RLS en `investigation_ai_reports` + `has_capability('ai.report')` para lectura/escritura.
- `report_text` puede contener PII del expediente; no loguear completo (solo `length` + `investigationId`).
- Rate limit: `enforceBillingRateLimit('checkout_one_time', tenantId)` ya en `assertAiAllowed`; no añadir nuevo.
- `origin` auditoría: `source: 'ai_report'` en revisiones si se añade.

---

## 7. Performance y UX (§14)

- `buildQualityInsights` es puro y <1ms (no I/O).
- Polling cuota 15s con `visibilitychange` no consume en background; `BroadcastChannel` es 0 red.
- `GET ai-report` solo en mount de Summary (1 vez), no en cada render.
- Sin animaciones decorativas; skeleton ya existe en Summary.

---

## 8. Plan de Verificación

1. `pnpm check-types` 0 errores
2. `pnpm test` verde (añadir `tests/ai-context-builder.test.ts` para `buildQualityInsights`)
3. Manual: generar dictamen con expediente demo → verificar que cita `FO 0.42`, `TAS 6.82`, `CAME crítica:2`, y capítulo 5 lista `F-03 sin evidencia`.
4. Recargar página → pestaña IA sigue mostrando último dictamen (fila en BD).
5. Generar 5 veces → `select * from investigation_ai_reports where investigation_id = X` tiene 1 fila con último `generated_at`.
6. Abrir 2 pestañas → consumir 1 cuota en una → la otra actualiza badge en <15s (o instantáneo vía BroadcastChannel).

---

## 9. Riesgos y Mitigación

| Riesgo | Mitigación |
|--------|------------|
| `report_text` grande (>50KB) | `text` sin límite, pero UI `max-h-150 overflow-y-auto` ya lo soporta; no indexar `report_text` |
| RLS olvida `tenant_id` | Migration revisa con `psql \d investigation_ai_reports` + test `list` cross-tenant |
| OpenRouter :free sin Tools | Detección 404 `No allowed providers` → fallback a siguiente modelo, log warn |
| Polling 15s molesto | Solo si visible + BroadcastChannel primero, 15s es fallback |

---

## 10. Entregables

- [ ] Migración `2026-08-26T00-00-00_investigation_ai_reports.sql`
- [ ] `src/features/ai/context-builder.ts` enriquecido
- [ ] `src/features/ai/service.ts` + `src/features/novai/service.ts` con capítulo 5
- [ ] `src/lib/investigations/ai-reports.ts` + API `GET [id]/ai-report`
- [ ] `src/views/apps/investigator/summary/index.tsx` hidratación + quota sync
- [ ] `src/hooks/use-quota-sync.ts` (o integrado en `use-investigator-analysis.tsx`)
- [ ] `src/features/ai/openrouter-client.ts` catálogo free con rotación
- [ ] `CHANGELOG.md` v2.4.0

---

## 11. Referencias Web

- OpenRouter free models docs: `https://openrouter.ai/docs/guides/routing/model-variants/free` — `:free` suffix, 28+ modelos $0, tag `Tools`.
- OpenRouter collections free: `https://openrouter.ai/collections/free-models` — ranking Nemotron 3 Ultra, Laguna S, Llama 4 Maverick etc.
- Tool-calling support: `https://openrouter.ai/collections/tool-calling-models` — filtro `Tools` capa, `qwen/qwen3-235b-a22b:free`, `gemma-3-27b-it:free` confirmados.
- Rate limits: `20 RPM / 50 RPD (1000 con $10)` — pricepertoken.com/openrouter/free
- BroadcastChannel API: `https://developer.mozilla.org/en-US/blog/exploring-the-broadcast-channel-api-for-cross-tab-communication` — structured clone, sin servidor.
- Supabase Realtime quotas doc: `https://supabase.com/docs/guides/realtime/quotas`

