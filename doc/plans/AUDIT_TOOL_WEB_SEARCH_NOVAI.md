Ran command: `git branch --show-current`
Searched for files: *novai*
Searched for files: *
Searched for files: *
Viewed 2026-08-28T10-00-00_novai_evidence.sql:1-127
Searched for "novai_evidence"
Viewed evidence-engine.ts:1-251
Viewed search-evidence.ts:1-271
Viewed get-factor-evidence.ts:1-238
Viewed verify-claim.ts:1-220
Viewed index.ts:1-162
Viewed service.ts:1-250
Viewed service.ts:251-500
Viewed service.ts:501-750
Viewed agent-runtime.ts:1-250
Viewed agent-runtime.ts:251-500
Viewed agent-runtime.ts:501-700
Viewed event-projection.ts:1-341
Viewed novai-source-card.tsx:1-55
Viewed novai-message-item.tsx:170-250
Viewed response-validator.ts:1-250
Viewed modes.ts:1-175
Viewed tool-selector.ts:1-343
Viewed intent-requirements.ts:1-217
Viewed benchmark-novai-context.ts:1-100
Searched for files: *
Viewed forensic-epistemic.test.ts:1-100
Viewed AUDITORIA_FORENSE_NOVAI_2026-08-27.md:1-150

# 1. Estado actual

Auditoría exhaustiva sobre el código real del repositorio [`dtreasuresp/NovaInvestigator`](file:///d:/03.%20MATRIZ%20DAFO) en la rama `dev`.

### 1.1 Inventario de Componentes y Estado Real

| Componente | Archivo / Ubicación | Documentado | Implementado | Funcionando End-to-End | Evidencia en Código |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Tool `web_research`** | [`src/features/novai/tools/research/web-research.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L1-L299) | ✅ | ✅ | ⚠️ Parcial | Búsqueda básica REST (`fetch`), timeout 8s y fallback a Brave. Falta extracción profunda y filtros. |
| **Fallback Brave Search** | [`src/features/novai/tools/research/web-research.ts:79-121`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L79-L121) | ✅ | ✅ | ✅ | Conmuta a `https://api.search.brave.com` si Tavily falla. |
| **Stub Serper** | [`src/features/novai/tools/research/web-research.ts:189-203`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L189-L203) | ✅ | ⚠️ Stub | ❌ No | Solo retorna mensaje de "no implementado". |
| **Tool Selector dinámico** | [`src/features/novai/tool-selector.ts:74-76`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tool-selector.ts#L74-L76) | ✅ | ✅ | ✅ | Expone `web_research` para `intent=SEARCH_WEB` y modos `CONSULTANT`/`RESEARCHER`. |
| **Epistemic Firewall (Validator)** | [`src/features/novai/response-validator.ts:37-53`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/response-validator.ts#L37-L53) | ✅ | ✅ | ✅ | Reglas `R1-R15`, detecta alucinaciones, scores sin cálculo y fuentes inventadas. |
| **Proyección de Eventos** | [`src/features/novai/event-projection.ts:295-311`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/event-projection.ts#L295-L311) | ✅ | ✅ | ⚠️ Incompleto | Proyecta `SourceEvent` básico, pero descarta `snippet`, `score`, `query` y `publicationDate`. |
| **UI Source Card** | [`src/views/apps/novai/components/novai-source-card.tsx`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-source-card.tsx#L1-L55) | ✅ | ✅ | ✅ | Renderiza tarjetas con badge `Fuente Externa` / `Documento Interno` y enlace. |
| **Persistencia `novai_evidence`** | [`supabase/migrations/2026-08-28T10-00-00_novai_evidence.sql`](file:///d:/03.%20MATRIZ%20DAFO/supabase/migrations/2026-08-28T10-00-00_novai_evidence.sql#L10-L25) | ✅ | ⚠️ Solo SQL | ❌ No conectado | Tablas `novai_evidence` y `novai_citations` migradas en DB, pero **ningún** servicio TS escribe en ellas. |
| **Extracción de URLs (`extract`)** | N/A | ❌ | ❌ | ❌ No | Inexistente. El sistema solo recupera snippets de hasta 600 chars. |

---

### 1.2 Auditoría Detallada de `src/features/novai/tools/research/web-research.ts`

* **A. Inputs que acepta ([Líneas 7-11](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L7-L11)):**
  * `query: z.string().min(1)` (requerido).
  * `top_k: z.number().int().min(1).max(10).optional().default(5)`.
  * `investigation_id: z.string().optional()` *(Decorativo: no se utiliza en el cuerpo de la función)*.
* **B. Outputs que devuelve ([Líneas 150-163, 217-230, 244-259](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L150-L259)):**
  * Éxito: `{ query, status: 'EXTERNAL_EVIDENCE', providerUsed: 'tavily' | 'brave', source: 'EXTERNAL_EVIDENCE', results: ExternalSource[], retrievedAt, totalResults, relevanceNote, credibilityNote, internalEvidenceNote }`.
  * Degradación: `{ query, status: 'EXTERNAL_RESEARCH_DISABLED', providerUsed: null, message, source: 'EXTERNAL_EVIDENCE', results: [], retrievedAt, internalEvidenceNote }`.
  * Error/Timeout: `{ query, status: 'EXTERNAL_RESEARCH_TIMEOUT' | 'EXTERNAL_RESEARCH_ERROR', providerUsed: null, source: 'EXTERNAL_EVIDENCE', results: [], error, retrievedAt, message }`.
* **C. Proveedor que utiliza ([Líneas 31-121](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L31-L121)):**
  * Primario: Tavily (`https://api.tavily.com/search`).
  * Fallback: Brave Search (`https://api.search.brave.com/res/v1/web/search`).
  * No implementado: Serper (`SERPER_API_KEY`).
* **D. Selección de proveedor ([Líneas 135-189](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L135-L189)):**
  * Si existe `TAVILY_API_KEY`, ejecuta Tavily. Si Tavily lanza error o timeout, registra warning y conmuta a Brave si `BRAVE_SEARCH_API_KEY` o `BRAVE_API_KEY` existe. Si no hay Tavily pero sí Brave, ejecuta Brave directamente.
* **E. Manejo de errores ([Líneas 174-185, 232-259](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L174-L259)):**
  * Captura en bloque `try/catch`. Nunca relanza excepción al harness del LLM; convierte el fallo en un resultado estructurado con `status: 'EXTERNAL_RESEARCH_ERROR'`.
* **F. Manejo de timeout ([Líneas 29, 32-34, 80-82, 236-258](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L29-L258)):**
  * `FETCH_TIMEOUT_MS = 8000` (8 segundos). Controlado con `AbortController` y `setTimeout`. Si aborta, retorna `status: 'EXTERNAL_RESEARCH_TIMEOUT'`.
* **G. Información de Tavily que conserva ([Líneas 55-73](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L55-L73)):**
  * `r.title`, `r.url`, `r.content` (recortado a 600 caracteres como `snippet`), `r.published_date` (como `publicationDate`), `r.score` (mapeado a `relevanceScore`, `score` y `credibilityScore`).
* **H. Información de Tavily que descarta o suprime:**
  * Envía `include_raw_content: false` e `include_answer: false` ([Líneas 44-45](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L44-L45)).
  * Descarta el `answer` generado por Tavily.
  * Trunca cualquier contenido mayor a 600 caracteres (`content.slice(0, 600)`).
  * Descarta metadatos de dominios, imágenes y scoring detallado.
* **I. Información que llega realmente al modelo:**
  * El LLM recibe vía `tool-result` todo el payload JSON devuelto por `executeWebResearch` (los 5 snippets de 600 chars, URLs, títulos, `relevanceScore` y notas directivas).
* **J. Información que llega a la UI:**
  * Por streaming SSE: `event-projection.ts:295-311` emite eventos `source` con `{ name: r.title, url: r.url, sourceType: 'external', retrievedAt }`.
  * En renderizado de mensajes: [`src/views/apps/novai/components/novai-message-item.tsx:212-250`](file:///d:/03.%20MATRIZ%20DAFO/src/views/apps/novai/components/novai-message-item.tsx#L212-L250) lee directamente `tool-result` y muestra las tarjetas `NovaiSourceCard` con título, snippet (excerpt), URL y badge `EXTERNAL_EVIDENCE`.
* **K. Información que queda persistida:**
  * **Solo el texto del chat**: `novai_messages` almacena la respuesta generada.
  * **Metadatos de corrida**: `novai_agent_runs` almacena `intent`, `context_snapshot`, `tokens`, `duration_ms` ([`agent-runtime.ts:245-280`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/agent-runtime.ts#L245-L280)).
  * **Vacío crítico**: **NO** se persisten las evidencias individuales en `novai_evidence` ni las citas en `novai_citations`.
* **L. Información que queda auditada:**
  * Logs estructurados en [`src/lib/logger`](file:///d:/03.%20MATRIZ%20DAFO/src/lib/logger): `novai.web_research.executed` registra `tenantId`, `userId`, `providerUsed`, `queryLength`, `resultsCount` ([Líneas 205-214](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L205-L214)). No loguea API keys ni contenido PII.

---

# 2. Qué afirmó la auditoría anterior

Revisión del documento [`doc/plans/AUDITORIA_FORENSE_NOVAI_2026-08-27.md`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans/AUDITORIA_FORENSE_NOVAI_2026-08-27.md):

1. **Aciertos de la auditoría anterior:**
   * ✅ **Causa raíz del incidente golden test (`0.68-0.74`)**: Identificó correctamente que `CONSULTANT` carecía de la herramienta `web_research` y que el modelo improvisaba números sin `CalculationEvent`.
   * ✅ **Falta de Epistemic Firewall**: Diagnosticó con precisión que el LLM podía generar texto con apariencia factual sin validación en tiempo de ejecución.
   * ✅ **Distinción Epistémica Inicial**: Estableció que `Tavily relevance score` no es credibilidad científica.
   * ✅ **Aislamiento Multi-tenant**: Verificó que `tenantId` proviene de `InvestigationsPrincipal` y nunca del body HTTP.
   * ✅ **Diseño de Reglas R1-R15**: Creó las directivas del `ResponseValidator`.

---

# 3. Qué afirmaciones eran incompletas o incorrectas

1. **Score vs Credibility (Incompletitud Crítica):**
   * *Afirmación previa:* Se afirmó que la semántica de score ya estaba resuelta separando `relevanceScore` de `credibilityScore`.
   * *Realidad en el código:* [`web-research.ts:70-72`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L70-L72) **sigue enviando activamente** `credibilityScore: typeof r.score === 'number' ? r.score : null` en el payload JSON entregado al LLM. El modelo sigue leyendo la clave `credibilityScore: 0.74`, lo que propicia que el LLM confunda relevancia con credibilidad.
2. **Persistencia de Evidencias (Afirmación no integrada):**
   * *Afirmación previa:* Se dio por implementado el modelo de evidencias trazables.
   * *Realidad en el código:* La migración SQL `2026-08-28T10-00-00_novai_evidence.sql` existe, pero **no hay una sola línea de código TypeScript** en `src/features/novai/` que inserte filas en `public.novai_evidence` o `public.novai_citations` tras ejecutar una búsqueda web o cita.
3. **Uso de `investigation_id`:**
   * *Afirmación previa:* Se documentó que `investigation_id` anclaba la búsqueda al expediente.
   * *Realidad en el código:* Es un parámetro **decorativo**; `executeWebResearch` no lo almacena, no lo valida contra la base de datos ni lo utiliza para vincular la evidencia al expediente.
4. **Profundidad de Extracción:**
   * *Afirmación previa:* La tool se catalogó como "investigador de evidencias".
   * *Realidad en el código:* Es únicamente un buscador de snippets de 600 caracteres. No tiene capacidad de inspeccionar documentos web completos.

---

# 4. Matriz Tavily

Evaluación técnica de las capacidades actuales de Tavily (API v0.8.0) frente a las necesidades reales de NovAi:

| Capacidad Tavily | Existe en API | Implementada en NovAi | ¿Es Necesaria? | Prioridad | Justificación Arquitectónica |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`search` (Búsqueda web)** | ✅ | ✅ ([`web-research.ts:36`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L36)) | **SÍ** | **P0** | Mecanismo fundamental de descubrimiento y retrieval inicial. |
| **`extract` (Extracción URL)** | ✅ | ❌ | **SÍ** | **P0** | **Indispensable.** Permite a NovAi abrir y leer el contenido limpio de una página seleccionada antes de citarla, superando la limitación de snippets de 600 caracteres. |
| **`raw_content`** | ✅ | ❌ (`false` fijo) | **SÍ (vía extract)** | **P1** | Necesario para análisis profundo bajo demanda; no debe activarse en el search general para no saturar el context window. |
| **`advanced search` (`search_depth`)** | ✅ | ✅ (`'advanced'` fijo) | **SÍ** | **P0** | Maximiza la precisión del ranking semántico. |
| **`domain filtering` (`include/exclude`)** | ✅ | ❌ | **SÍ** | **P1** | Permite acotar búsquedas a dominios oficiales/institucionales (`.gob`, `.org`) o excluir fuentes no fidedignas. |
| **`date filtering` (`days`, `time_range`)** | ✅ | ❌ | **SÍ** | **P1** | Crítico para distinguir noticias recientes de antecedentes históricos. |
| **`topic` (`'news' \| 'general' \| 'finance'`)** | ✅ | ❌ | **SÍ** | **P1** | Optimiza el índice según si se auditan datos macroeconómicos o noticias de mercado. |
| **`crawl` (Rastreo recursivo)** | ✅ | ❌ | **NO** | **P3** | Alta latencia y consumo excesivo de tokens. Diseñado para ingesta de documentación masiva, no para el flujo interactivo de NovAi. |
| **`map` (Mapeo de URLs)** | ✅ | ❌ | **NO** | **P3** | Baja utilidad para el razonamiento y diagnóstico estratégico actual. |
| **`research` (Agente de reporte autónomo)** | ✅ | ❌ | **NO** | **P3** | **Anti-patrón para NovAi.** Delegar la investigación a la "caja negra" de Tavily destruye la gobernanza multi-tenant, las reglas RLS y el firewall epistémico. NovAi debe ser el orquestador. |

### Decisión Técnica sobre Dependencias (Fetch vs SDK)

* **¿Instalar `tavily-python`?** ❌ **Terminantemente NO.** NovaStore es 100% Next.js/Node.js.
* **¿Usar `@tavily/core` (npm) vs `fetch` nativo?**
  * **Recomendación:** **Mantener `fetch` nativo con tipado Zod estricto.**
  * *Ventajas de `fetch` nativo:* Cero dependencias adicionales, control absoluto de timeouts (`AbortController`), gestión directa de fallbacks (Brave) y sanitización de payloads sin capas intermedias.

---

# 5. Problemas encontrados

Ordenados por severidad técnica y epistémica:

### 🔴 P0 — Críticos (Integridad Epistémica y Persistencia)

1. **Equivalencia engañosa `credibilityScore` en el payload JSON entregado al LLM:**
   * *Ubicación:* [`src/features/novai/tools/research/web-research.ts:71`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L71)
   * *Problema:* Se entrega `credibilityScore: r.score`. El LLM recibe un número de relevancia de búsqueda disfrazado de credibilidad y lo cita como "credibilidad de la fuente: 0.74".
2. **Desconexión total de la persistencia de evidencias (`novai_evidence` huérfana):**
   * *Ubicación:* [`supabase/migrations/2026-08-28T10-00-00_novai_evidence.sql`](file:///d:/03.%20MATRIZ%20DAFO/supabase/migrations/2026-08-28T10-00-00_novai_evidence.sql#L10) vs [`src/features/novai/agent-runtime.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/agent-runtime.ts)
   * *Problema:* Las tablas `novai_evidence` y `novai_citations` existen en PostgreSQL pero ningún servicio registra las fuentes recuperadas. No hay trazabilidad histórica persistente.
3. **Investigación superficial basada exclusivamente en snippets de 600 caracteres:**
   * *Ubicación:* [`src/features/novai/tools/research/web-research.ts:45,66`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L45-L66)
   * *Problema:* NovAi no puede leer artículos completos ni documentos web. Si un snippet no contiene el dato exacto, el LLM tiende a extrapolar o alucinar.

---

### 🟠 P1 — Importantes (Trazabilidad y Contexto)

4. **Parámetro `investigation_id` decorativo en `web_research`:**
   * *Ubicación:* [`src/features/novai/tools/research/web-research.ts:10,123`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L10-L123)
   * *Problema:* No se valida contra el tenant ni se asocia al contexto de la investigación activa.
5. **Pérdida de metadatos en la proyección de eventos (`event-projection.ts`):**
   * *Ubicación:* [`src/features/novai/event-projection.ts:295-311`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/event-projection.ts#L295-L311)
   * *Problema:* `projectWebResearch` omite `snippet`, `publicationDate`, `query` y `providerUsed` en el `SourceEvent`.
6. **Ausencia de filtros de búsqueda (dominio, fecha, categoría):**
   * *Ubicación:* [`src/features/novai/tools/research/web-research.ts:39-46`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L39-L46)
   * *Problema:* Búsquedas abiertas sin posibilidad de filtrar por fuentes oficiales (`include_domains: ['gob.*']`) o actualidad.

---

### 🟡 P2 — Mejoras (Observabilidad y Fallbacks)

7. **Observabilidad incompleta en logs de búsqueda:**
   * *Ubicación:* [`src/features/novai/tools/research/web-research.ts:205-214`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L205-L214)
   * *Problema:* No se registra la latencia (ms) de cada proveedor ni se vincula con `runId` o `conversationId`.
8. **Colisión conceptual de términos en `service.ts`:**
   * *Ubicación:* [`src/features/novai/service.ts:449`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/service.ts#L449)
   * *Problema:* `consolidateEvidence(internalEvidence, externalEvidence)` mezcla la nomenclatura de matrices DAFO (factores internos EFI vs factores externos EFE) con la clasificación epistémica de evidencias (datos internos del tenant vs web externa).

---

### ⚪ P3 — Futuro (Optimizaciones)

9. **Conector Serper como tercer fallback:**
   * *Ubicación:* [`src/features/novai/tools/research/web-research.ts:189-203`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts#L189-L203)
   * *Problema:* Código stub que no aporta funcionalidad real hoy.

---

# 6. Arquitectura actual

```
[Usuario / UI]
      │
      ▼ (POST /api/novai/chat)
[NovaiAgentRuntime]
      │
      ├─► [HybridIntentClassifier] ──► Determina Intent (ej: SEARCH_WEB)
      ├─► [NovaiToolSelector]      ──► Expone 'web_research'
      │
      ▼ (streamText vía Vercel AI SDK Core)
[LLM (Gemini / OpenRouter)]
      │
      ▼ (Tool Call: web_research { query, top_k })
[executeWebResearch]
      │
      ├─► Provider Router: TAVILY (https://api.tavily.com/search)
      │       └─► Fallback si falla: BRAVE (https://api.search.brave.com)
      │       └─► Si no hay keys: EXTERNAL_RESEARCH_DISABLED
      │
      ▼ (Devuelve JSON con snippets de 600 chars + credibilityScore: r.score)
[LLM (Genera Respuesta)]
      │
      ├─► [ResponseValidator] (Valida R1-R15: bloquea scores sin cálculo o fuentes inventadas)
      ├─► [Event Projection]  (Emite SourceEvent a la UI - descarta snippets y fechas)
      │
      ▼ (Streaming SSE)
[UI: NovaiMessageItem / NovaiSourceCard] ──► Muestra tarjetas visuales
      │
      ▼ (Fin del flujo)
[Persistencia] ──► Guarda mensaje en 'novai_messages'
                   ❌ NO guarda en 'novai_evidence'
                   ❌ NO guarda en 'novai_citations'
```

---

# 7. Arquitectura propuesta

```
                             [ USER INTENT ]
                                    │
                                    ▼
                      [ INTENT & CONTEXT RESOLVER ]
                 (Resuelve tenantId, active investigation,
                  conversationId, intent, domain scope)
                                    │
                                    ▼
                      [ RESEARCH ORCHESTRATOR ]
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
   [ TOOL: web_search ]                           [ TOOL: web_extract ]
 (Descubrimiento & Ranking)                    (Lectura Profunda de URL)
   ├── Tavily API (/search)                      ├── Tavily API (/extract)
   │     (domains, date, topic)                  │     (clean markdown text)
   └── Fallback: Brave Search                    └── Fallback: Fetch reader
            │                                               │
            ▼                                               ▼
   [ SEARCH CANDIDATES ]                         [ EXTRACTED CONTENT ]
 (URLs, Titles, RelevanceScore)                (Texto completo, fecha, autor)
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    │
                                    ▼
                      [ EVIDENCE NORMALIZATION ]
               (Estructura canónica ExternalEvidence:
                relevanceScore ≠ credibilityAssessment)
                                    │
                                    ▼
                      [ EVIDENCE STORE & AUDIT ]
            (Persistencia en 'novai_evidence' bajo RLS:
             tenant_id, investigation_id, run_id, URL,
             claim, excerpt, retrieved_at, FACT/INFERENCE)
                                    │
                                    ▼
                    [ EPISTEMIC FIREWALL & PROMPTS ]
           (Inyecta evidencia verificada al LLM con reglas:
            prohibido scores numéricos sin CalculationEvent)
                                    │
                                    ▼
                          [ LLM GENERATION ]
                                    │
                                    ▼
                     [ CITATION & INLINE LINKING ]
            (Mapea afirmaciones ──► InlineCitation ──► novai_citations)
                                    │
                                    ▼
                 [ UI: CARDS + STREAMING + CITATIONS ]
```

---

# 8. Modelo de evidencia recomendado

### Evaluación de Opciones

* **Opción A (Reutilizar `InvestigationState.internal[].evidence`):** ❌ Rechazado. Ese campo es un string embebido en el JSON de factores de la investigación; no soporta evidencias web externas ni citas relacionales.
* **Opción B (Extender `SourceEvent` en `events.ts`):** ❌ Rechazado. `events.ts` define eventos efímeros para el streaming SSE hacia la UI, no persistencia en base de datos.
* **Opción C (Crear una tabla nueva):** ❌ Rechazado. Es redundante.
* **Opción D (Utilizar `novai_evidence` y `novai_citations`):** 🏆 **RECOMENDADA.**
  * Ya existe la migración [`supabase/migrations/2026-08-28T10-00-00_novai_evidence.sql`](file:///d:/03.%20MATRIZ%20DAFO/supabase/migrations/2026-08-28T10-00-00_novai_evidence.sql).
  * Cuenta con aislamiento RLS nativo por `tenant_id` y `auth.uid()`.
  * Soporta `source_type: 'web_source'`, `claim`, `excerpt`, `location` (URL), `epistemic: 'FACT' | 'INFERENCE' | 'HYPOTHESIS'`, `confidence` y vinculación con `investigation_id` y `run_id`.
* **Opción E (Utilizar `metadata` JSONB):** ❌ Rechazado. No permite índices relacionales, auditoría estricta ni integridad referencial con las citas.

### Estructura de Dominio TypeScript Recomendada (Conceptual)

```typescript
export interface ExternalSourceEvidence {
  id: string // UUID
  tenantId: string
  investigationId?: string | null
  conversationId?: string | null
  runId?: string | null
  sourceType: 'web_source'
  url: string
  title: string
  publishedDate?: string | null
  retrievedAt: string
  provider: 'tavily' | 'brave'
  query: string
  excerpt: string // Fragmento exacto que fundamenta la afirmación
  fullContent?: string // Texto limpio si se extrajo
  relevanceScore: number | null // Tavily ranking [0..1]
  credibilityAssessment: 'UNKNOWN' | 'OFFICIAL_SOURCE' | 'ACADEMIC' | 'MEDIA' | 'UNVERIFIED'
  epistemicStatus: 'FACT' | 'INFERENCE' | 'HYPOTHESIS'
}
```

---

# 9. Cambios P0 / P1 / P2 / P3

### 🔴 P0 — Críticos

#### Cambio P0.1: Eliminar `credibilityScore` del output de búsqueda
* **Archivo:** [`src/features/novai/tools/research/web-research.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts)
* **Componente:** `ExternalSource` interface y mapeo de retorno en `callTavily`.
* **Problema:** Enviar `credibilityScore: r.score` induce al LLM a alucinar métricas de credibilidad sin base metodológica.
* **Solución:** Eliminar la propiedad `credibilityScore` de la respuesta y exponer únicamente `relevanceScore: r.score` con nota explicativa `relevance ≠ credibility`.
* **Riesgo:** Bajo.
* **Impacto:** Alto en integridad epistémica (erradica la alucinación del golden test `0.68-0.74`).
* **Dependencias:** Actualizar tipos en [`src/features/novai/tools/types.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/types.ts).
* **Tests:** `tests/novai/forensic-epistemic.test.ts`.

#### Cambio P0.2: Implementar la tool de extracción profunda `web_extract`
* **Archivo:** `src/features/novai/tools/research/web-extract.ts` (Nuevo).
* **Componente:** Tool modular `web_extract` consumiendo endpoint `/extract` de Tavily.
* **Problema:** NovAi no puede verificar afirmaciones complejas porque está limitado a snippets de 600 caracteres.
* **Solución:** Crear tool con schema `z.object({ urls: z.array(z.string().url()).min(1).max(3), query_context: z.string().optional() })` que recupere el markdown limpio de las páginas.
* **Riesgo:** Medio (gestión de tokens de entrada).
* **Impacto:** Alto (permite análisis real y citas fundamentadas).
* **Dependencias:** Registrar en `src/features/novai/tools/index.ts` y `modes.ts`.
* **Tests:** Test unitario mockeando respuesta `/extract`.

#### Cambio P0.3: Conectar el repositorio de persistencia `novai_evidence`
* **Archivo:** `src/features/novai/evidence-repository.ts` (Nuevo) e integración en [`agent-runtime.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/agent-runtime.ts).
* **Componente:** Servicio de persistencia de evidencias y citas.
* **Problema:** Los datos recuperados de la web se pierden al terminar la respuesta SSE.
* **Solución:** Guardar en `public.novai_evidence` y `public.novai_citations` cada fuente utilizada efectivamente por el agente en la respuesta.
* **Riesgo:** Bajo (tabla ya existe con RLS).
* **Impacto:** Máximo (trazabilidad y auditoría permanente).
* **Dependencias:** Migración `2026-08-28T10-00-00_novai_evidence.sql`.
* **Tests:** Tests de integración con Supabase client mock.

---

### 🟠 P1 — Importantes

#### Cambio P1.1: Contextualización real con `investigation_id`
* **Archivo:** [`src/features/novai/tools/research/web-research.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts)
* **Componente:** `executeWebResearch`.
* **Problema:** `investigation_id` es ignorado en el cuerpo de la función.
* **Solución:** Validar que `investigation_id` pertenezca al tenant del `principal` y asociarlo al evento `SourceEvent` y registro en `novai_evidence`.
* **Riesgo:** Bajo.
* **Impacto:** Previene contaminación cruzada de contexto entre investigaciones.

#### Cambio P1.2: Enriquecer parámetros de búsqueda en `web_research`
* **Archivo:** [`src/features/novai/tools/research/web-research.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts)
* **Componente:** `webResearchSchema` y `callTavily`.
* **Problema:** Imposibilidad de acotar por fecha o dominio oficial.
* **Solución:** Agregar al schema Zod `include_domains?: string[]`, `topic?: 'general' | 'news' | 'finance'`, `days?: number`.
* **Riesgo:** Bajo.
* **Impacto:** Búsquedas mucho más precisas y confiables.

#### Cambio P1.3: Completar metadatos en `event-projection.ts`
* **Archivo:** [`src/features/novai/event-projection.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/event-projection.ts)
* **Componente:** `projectWebResearch`.
* **Problema:** `SourceEvent` pierde `snippet`, `relevanceScore` y `publicationDate`.
* **Solución:** Mapear todos los campos en `SourceEvent` para que la UI los consuma fielmente.
* **Riesgo:** Nulo.
* **Impacto:** Renderizado enriquecido en la UI.

---

### 🟡 P2 — Mejoras

#### Cambio P2.1: Instrumentación y latencia en observabilidad
* **Archivo:** [`src/features/novai/tools/research/web-research.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts)
* **Componente:** Logging de ejecución.
* **Problema:** No se audita el tiempo de respuesta ni el `runId`.
* **Solución:** Medir `duration_ms` de la petición HTTP y recibir `runId` para auditoría unificada en `novai_agent_runs`.

---

### ⚪ P3 — Futuro

#### Cambio P3.1: Implementación completa de conector Serper
* **Archivo:** [`src/features/novai/tools/research/web-research.ts`](file:///d:/03.%20MATRIZ%20DAFO/src/features/novai/tools/research/web-research.ts)
* **Componente:** `callSerper`.
* **Problema:** Stub actual no funcional.
* **Solución:** Implementar cliente REST para Serper Google Search como tercer escalón de redundancia.

---

# 10. Tests y benchmark propuestos

Propuesta de suite reproducible en `tests/novai/web-research.test.ts` y script `scripts/benchmark-novai-research.ts`:

* **Caso A (Búsqueda exitosa Tavily):** Mock 200 de Tavily con 5 resultados. Verificar que devuelva `status: 'EXTERNAL_EVIDENCE'`, `providerUsed: 'tavily'` y `relevanceScore` sin `credibilityScore`.
* **Caso B (Fallback a Brave Search):** Mock 500/429 en Tavily y 200 en Brave. Verificar que conmute transparentemente y reporte `providerUsed: 'brave'`.
* **Caso C (Sin proveedores configurados):** Sin `TAVILY_API_KEY` ni `BRAVE_API_KEY`. Verificar retorno determinista `status: 'EXTERNAL_RESEARCH_DISABLED'` sin lanzar excepción.
* **Caso D (Timeout en proveedor):** Petición que excede 8000ms. Verificar aborto controlado y estado `status: 'EXTERNAL_RESEARCH_TIMEOUT'`.
* **Caso E (Resultados vacíos):** Tavily devuelve `results: []`. Verificar que el `ResponseValidator` impida al LLM afirmar que "validó los datos en la web".
* **Caso F (Aislamiento Fuente Externa vs Interna):** Verificar que un resultado web nunca emita `type: 'evidence'` (reservado para el expediente interno) sino `type: 'source'` con `sourceType: 'external'`.
* **Caso G (Relevance vs Credibility):** Verificar que texto con `score de relevancia 0.82` pase la validación, pero texto que afirme `credibilidad calculada 0.82` sin `CalculationEvent` sea degradado o rechazado (`R7/R9`).
* **Caso H (Extracción profunda de URL):** Ejecución de `web_extract` sobre URL mockeada. Verificar recuperación de contenido markdown y token budgeting.
* **Caso I (Citación inline):** Verificar que una afirmación del modelo genere una referencia en `novai_citations` vinculada a la `novai_evidence` correspondiente.
* **Caso J (Investigación activa correcta):** Búsqueda con `investigation_id` válido. Verificar trazabilidad en el log y persistencia con `investigation_id`.
* **Caso K (Investigación no existente / cross-tenant):** Búsqueda con `investigation_id` de otro tenant. Verificar rechazo por RLS/ReBAC sin filtrar datos ajenos.

---

# 11. Riesgos

1. **Riesgo de Latencia Acumulada:**
   * Ejecutar `web_search` seguido de `web_extract` puede añadir entre 2 y 4 segundos al Time-to-First-Token (TTFT).
   * *Mitigación:* Usar streaming SSE de eventos `trace` ("*Buscando fuentes...*", "*Analizando documento seleccionado...*") para mantener el feedback visual en la UI.
2. **Riesgo de Desborde de Tokens (Context Window Overflow):**
   * Extraer el texto completo de 3 páginas web puede sumar más de 10.000 tokens.
   * *Mitigación:* Aplicar `NovaiTokenBudget.trim()` sobre el texto extraído antes de inyectarlo en los mensajes del modelo, limitando la extracción a fragmentos relevantes (máx. 1.500 tokens por URL).
3. **Riesgo de Bloqueo por Rate Limits de Tavily:**
   * Consultas masivas o bucles del agente podrían agotar la cuota de la API key.
   * *Mitigación:* Limitar a 1 búsqueda y 2 extracciones por turno de conversación; fallback automático e ininterrumpido a Brave Search.

---

# 12. Plan de implementación por fases

```
[FASE 1: Saneamiento Epistémico P0]
  ├── 1.1 Eliminar credibilityScore de web-research.ts (dejar solo relevanceScore).
  ├── 1.2 Actualizar response-validator.ts para bloquear explícitamente "credibilidad = relevance".
  └── 1.3 Ejecutar tests de firewall epistémico (tests/novai/forensic-epistemic.test.ts).

[FASE 2: Capacidad de Extracción P0]
  ├── 2.1 Crear tool modular src/features/novai/tools/research/web-extract.ts (Tavily /extract REST).
  ├── 2.2 Registrar web_extract en catálogo maestro y asignar a modos CONSULTANT y RESEARCHER.
  └── 2.3 Test unitario de extracción con límites de tokens.

[FASE 3: Persistencia y Trazabilidad RLS P0/P1]
  ├── 3.1 Crear src/features/novai/evidence-repository.ts con métodos insertEvidence e insertCitation.
  ├── 3.2 Conectar agent-runtime.ts para persistir en 'public.novai_evidence' al recibir ToolResultEvent.
  └── 3.3 Validar tenant isolation y RLS en persistencia.

[FASE 4: Filtros Avanzados y UI P1/P2]
  ├── 4.1 Extender schema de web_research con include_domains, topic, days.
  ├── 4.2 Enriquecer proyección en event-projection.ts y vista novai-source-card.tsx.
  └── 4.3 Benchmark final y verificación integral end-to-end.
```

---

> [!IMPORTANT]
> **Estado del Repositorio:** No se ha modificado ningún archivo, no se han creado commits ni se han alterado la base de datos ni las variables de entorno. Quedo a la espera de tu revisión y aprobación explícita para comenzar con la **Fase 1**.