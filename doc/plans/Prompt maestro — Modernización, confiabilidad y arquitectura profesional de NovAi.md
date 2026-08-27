# MISIÓN

Quiero que transformes NovAi, el agente de IA de NovaStore, en un agente moderno, profesional, confiable, eficiente y arquitectónicamente sólido, comparable en experiencia de usuario con productos de primera línea como ChatGPT, Claude, Perplexity y aplicaciones modernas construidas con Vercel AI SDK / AI Elements.

**NO empieces modificando código inmediatamente.**

Primero debes auditar exhaustivamente el repositorio actual, comprender la arquitectura existente, identificar problemas y producir un plan técnico completo. Solo después de validar internamente que el plan es coherente podrás comenzar la implementación por fases.

El objetivo NO es simplemente mejorar la apariencia de NovAi.

El objetivo es mejorar simultáneamente:

1. Arquitectura del agente.
2. Context management.
3. Selección dinámica de tools.
4. Prompt/context efficiency.
5. Razonamiento y actividad observable.
6. Tool execution.
7. Evidencia y fuentes.
8. Citaciones.
9. Memoria.
10. Compaction.
11. Streaming.
12. Persistencia del historial.
13. Observabilidad.
14. Seguridad y aislamiento multi-tenant.
15. UX/UI.
16. Confiabilidad epistemológica.
17. Comportamiento profesional de consultor senior.
18. Costos y consumo de tokens.

---

# REGLA CERO — NO INVENTAR

Esta es una condición fundamental de la misión.

NO debes asumir que:

- una función existe porque aparece mencionada en documentación;
- una tool está implementada porque existe un nombre parecido;
- una feature funciona porque existe un archivo;
- existe compaction porque existe una sliding window;
- existe memoria porque existe una tabla;
- existe RAG porque existen embeddings;
- una tool fue ejecutada porque el modelo afirma haberla ejecutado;
- una fuente fue consultada porque el modelo la menciona;
- una investigación es activa porque el prompt dice que lo es;
- una cita es válida porque el modelo generó `[1]`;
- un cálculo es correcto porque el modelo lo afirma.

Debes verificar cada afirmación contra:

1. Código real.
2. Flujo de ejecución real.
3. Base de datos.
4. Logs.
5. Tipos.
6. APIs.
7. Documentación oficial.

Cuando no puedas verificar algo, debes marcarlo explícitamente como:

`NO VERIFICADO`

Nunca rellenes huecos con suposiciones.

---

# REGLA 1 — DOCUMENTACIÓN OFICIAL

Antes de modificar componentes relacionados con AI SDK / AI Elements / OpenRouter / Supabase / Next.js / Vercel, consulta documentación oficial actualizada.

Prioridad:

1. documentación oficial del producto;
2. repositorio oficial;
3. documentación técnica primaria;
4. fuentes secundarias solamente si son necesarias.

NO uses artículos aleatorios para justificar decisiones arquitectónicas importantes.

Debes verificar especialmente:

- AI SDK;
- AI Elements;
- Reasoning;
- Task;
- Queue;
- Sources;
- Inline Citation;
- Context;
- UIMessage;
- streaming;
- tool calling;
- tool results;
- message parts;
- dynamic tools;
- OpenRouter tool calling;
- OpenRouter usage/token reporting;
- context limits;
- Supabase;
- RLS;
- Next.js App Router.

---

# FASE 0 — AUDITORÍA COMPLETA ANTES DE MODIFICAR

Inspecciona todo el árbol relevante del proyecto.

Especial atención a:

```text
src/features/novai/
src/components/
src/app/
src/lib/
database/
supabase/
migrations/
```

y cualquier otra ubicación donde exista lógica relacionada con NovAi.

Identifica:

```text
Agent
Runtime
Model Router
Context Engine
Tool Gateway
Tools
Memory
RAG
Prompt construction
Message persistence
Conversation persistence
Streaming
OpenRouter
Supabase
UI
AI Elements
Auth
RBAC
Tenant isolation
Audit
```

Construye mentalmente el flujo completo:

```text
User
 ↓
UI
 ↓
Chat hook / request
 ↓
API route / server action
 ↓
Agent runtime
 ↓
Context builder
 ↓
Prompt builder
 ↓
Tool selection
 ↓
Model router
 ↓
OpenRouter
 ↓
Model
 ↓
Tool calls
 ↓
Tool execution
 ↓
Tool results
 ↓
Additional model steps
 ↓
Final response
 ↓
Persistence
 ↓
UIMessage
 ↓
UI
```

Determina dónde ocurre realmente cada paso.

---

# FASE 1 — AUDITORÍA DEL CONTEXTO

Debes determinar exactamente qué se envía al modelo en cada request.

Analiza:

- system prompt;
- developer prompt;
- methodology prompt;
- conversation history;
- memories;
- investigation context;
- RAG;
- tool definitions;
- previous tool calls;
- previous tool results;
- sources;
- citations;
- metadata;
- tenant context;
- user context;
- RBAC context.

Especialmente revisa:

```text
context-engine.ts
methodology-knowledge.ts
tool-gateway.ts
agent-runtime.ts
token-budget.ts
```

o sus equivalentes reales.

Determina si actualmente se inyecta información de forma incondicional.

Debes responder técnicamente:

> ¿Por qué un mensaje simple como "Hola" termina enviando un prompt grande a OpenRouter?

No especules.

Mide.

---

# FASE 2 — BENCHMARK DE CONTEXTO

Antes de modificar arquitectura, crea un diagnóstico reproducible para al menos estos casos:

## Caso A

```text
Hola
```

## Caso B

```text
¿Cuál es la investigación activa?
```

## Caso C

```text
Analiza la relación D-03 × A-02.
```

## Caso D

```text
Investiga en Internet la competencia laboral en Cuba.
```

Para cada request mide:

```text
system tokens
developer tokens
history tokens
tool definition tokens
RAG tokens
memory tokens
investigation tokens
tool result tokens
input tokens
output tokens
total tokens
context utilization
number of tools exposed
number of tools executed
number of model steps
latency
TTFT
```

No declares porcentajes de reducción hasta tener mediciones reales.

---

# FASE 3 — DISEÑAR UN CONTEXT MANAGER REAL

Diseña un sistema explícito de administración de contexto.

Debe separar conceptualmente:

```text
1. System instructions
2. Current user request
3. Recent conversation
4. Conversation summary
5. Relevant long-term memory
6. Active investigation context
7. Relevant evidence
8. Relevant methodology
9. Tool definitions
10. Tool results
11. Current task state
```

No todo debe entrar en todos los requests.

Implementa el principio:

# CONTEXT ON DEMAND

Ejemplo:

```text
Usuario:
Hola
```

Debe requerir contexto mínimo.

No cargar:

- metodología completa;
- investigación;
- documentos;
- matrices;
- RAG;
- todas las tools.

---

# FASE 4 — DYNAMIC TOOL EXPOSURE

Actualmente puede existir un conjunto grande de tools.

NO expongas todas las tools al modelo en todos los turnos.

Diseña una estrategia de selección dinámica.

Ejemplo conceptual:

```text
CASUAL
tools: []

INVESTIGATION_LOOKUP
tools:
- get_active_investigation

DOCUMENT_ANALYSIS
tools:
- get_active_investigation
- get_investigation_documents
- search_evidence

STRATEGIC_ANALYSIS
tools:
- get_active_investigation
- search_evidence
- audit_factor
- audit_relationship
- validate_methodology

WEB_RESEARCH
tools:
- web_research
- search_evidence
- save_source
```

Pero NO copies estos grupos ciegamente.

Primero inspecciona las tools reales y diseña los grupos adecuados.

La selección debe basarse en:

```text
intent
mode
permissions
tenant
current task
available context
```

No debe depender exclusivamente de una clasificación superficial del LLM.

---

# FASE 5 — TOOL GOVERNANCE

Diseña una política centralizada para las tools.

Cada tool debe tener metadatos como mínimo conceptualmente equivalentes a:

```text
name
description
category
required_permissions
allowed_modes
read/write
risk_level
requires_investigation
requires_confirmation
tenant_scoped
idempotent
auditable
```

No todas las tools deben tener el mismo nivel de acceso.

Debes garantizar:

```text
User
 ↓
RBAC
 ↓
Tool authorization
 ↓
Tenant scope
 ↓
Tool execution
```

Nunca:

```text
LLM
 ↓
Tool
 ↓
Database
```

sin controles intermedios.

---

# FASE 6 — TOOL RESULT TRUST

Una de las prioridades de NovAi es la confiabilidad.

El modelo nunca debe poder convertir:

```text
tool no ejecutada
```

en:

```text
tool ejecutada
```

El runtime debe ser la fuente de verdad.

Si una tool realmente se ejecutó:

```text
tool.started
tool.completed
tool.result
```

Si falló:

```text
tool.started
tool.failed
```

La UI debe representar eventos reales.

No permitir que el modelo "narre" ficticiamente las actividades.

---

# FASE 7 — ACTIVIDAD DE NOVAI

Rediseña la representación de actividad utilizando AI Elements.

Usa:

- Reasoning
- Task
- Sources
- Inline Citation
- Context
- Queue cuando realmente corresponda

No uses los seis simplemente porque están disponibles.

La jerarquía objetivo debe ser aproximadamente:

```text
NovAi
│
├── Reasoning
│
├── Activity / Task
│    ├── step
│    ├── step
│    ├── step
│    └── step
│
├── Sources
│
├── Response
│
└── Context
```

La respuesta debe ser visualmente prioritaria.

---

# FASE 8 — REASONING

NO expongas automáticamente cadenas de pensamiento internas detalladas.

Diferencia:

```text
Internal reasoning
```

de:

```text
Observable activity
```

La UI puede mostrar:

```text
🧠 Analizando...
```

y posteriormente:

```text
🧠 Análisis completado
```

La actividad observable debe proceder de eventos reales del runtime.

No debe ser inventada por el modelo.

---

# FASE 9 — TASK / ACTIVITY

Agrupa las operaciones del agente en una sola estructura compacta.

Ejemplo:

```text
⚙️ Actividad · 5 pasos
```

Expandido:

```text
✓ Identificó investigación activa
✓ Consultó expediente
✓ Recuperó evidencia
✓ Auditó relación D-03 × A-02
✓ Generó diagnóstico
```

Cada elemento debe tener estado:

```text
pending
running
completed
failed
cancelled
```

Evita una tarjeta gigante por cada evento.

---

# FASE 10 — SOURCES

Agrupa fuentes.

No mostrar:

```text
Source 1
Source 2
Source 3
Source 4
Source 5
...
```

como diez tarjetas gigantes.

Mostrar:

```text
📚 10 fuentes consultadas
```

y permitir expansión.

Cada fuente debe conservar:

```text
id
title
url
domain
favicon
snippet/excerpt
source type
retrieved at
```

Diferencia claramente:

```text
internal document
web source
database evidence
tool-derived evidence
```

---

# FASE 11 — EVIDENCE MODEL

Diseña o adapta un modelo estructurado de evidencia.

Conceptualmente:

```text
Evidence
{
  id
  source_id
  source_type
  claim
  excerpt
  location
  confidence
  retrieved_at
  investigation_id
  tenant_id
}
```

El modelo debe poder distinguir:

```text
FACT
INFERENCE
HYPOTHESIS
ASSUMPTION
```

NovAi NO debe presentar una hipótesis como hecho.

---

# FASE 12 — INLINE CITATIONS

Implementa citaciones estructuradas.

No dependas exclusivamente de que el LLM escriba:

```text
[1]
[2]
[3]
```

Diseña una representación estructurada.

Conceptualmente:

```text
Citation
{
  id
  sourceId
  claim
  excerpt
  location
}
```

La UI debe poder representar:

```text
...la evidencia indica una presión competitiva [1].
```

y mostrar al usuario:

```text
Fuente
Título
Dominio
Fragmento
Abrir fuente
```

Las citas deben apuntar a evidencia real.

No permitir:

```text
citation → source inexistente
```

---

# FASE 13 — CONTEXT UI

Utiliza AI Elements Context.

El indicador debe representar:

# CONTEXTO

No simplemente:

```text
14% Tokens
```

Debe mostrar algo equivalente a:

```text
Contexto 14%

4.820 / 32.768 tokens
```

Al abrir:

```text
Input
Output
Reasoning
Cached
History
Tools
RAG
Total
```

Siempre que la información esté disponible de forma fiable.

---

# FASE 14 — CONTEXT HEALTH

Define niveles:

```text
0–60%
Healthy

60–80%
Moderate

80–90%
Warning

90–100%
Critical
```

No uses estos porcentajes sin evaluar el límite real del modelo y los márgenes de seguridad.

El objetivo es que el usuario pueda comprender:

> "Mi conversación se está acercando al límite."

---

# FASE 15 — COMPACTION REAL

Determina si el sistema actual realmente compacta conversaciones.

No confundas:

```text
sliding window
```

con:

```text
semantic compaction
```

Si no existe compaction real, diseña uno.

La compaction debe preservar estructuradamente:

```text
original objective
important facts
decisions
constraints
active investigation
important evidence
important conclusions
user preferences relevant to task
open questions
pending work
critical references
```

Ejemplo:

```text
Conversation
 ↓
Compaction trigger
 ↓
Structured summary
 ↓
Persist summary
 ↓
Remove/reduce old raw messages
 ↓
Keep recent messages
 ↓
Continue
```

Debe ser reversible cuando sea posible y auditable.

---

# FASE 16 — MEMORY

Audita la memoria actual.

Diferencia:

```text
conversation memory
strategic memory
user memory
investigation memory
temporary task state
```

No mezcles todo en un único bloque.

La memoria debe entrar al contexto solamente cuando sea relevante.

---

# FASE 17 — INVESTIGATION CONTEXT

NovAi debe saber inequívocamente:

```text
current tenant
current user
current investigation
current conversation
current task
```

Nunca debe inferir la investigación activa simplemente por conversación previa.

La fuente de verdad debe ser:

```text
database / runtime state
```

y no el modelo.

Esto es crítico porque ya hemos detectado anteriormente confusiones de investigaciones activas.

---

# FASE 18 — ANTI-HALLUCINATION / ANTI-COMPLACENCY

Implementa una política epistemológica fuerte.

NovAi debe distinguir:

```text
Verified fact
Evidence-backed inference
Hypothesis
Unknown
Insufficient evidence
```

Regla:

> Si el usuario pregunta algo que puede verificarse mediante una fuente disponible, NovAi debe consultar la fuente antes de afirmarlo cuando la exactitud sea relevante.

Si el usuario insiste en una afirmación que contradice evidencia:

```text
NO asumir que el usuario tiene razón.
NO asumir que el modelo tiene razón.
CONSULTAR evidencia.
```

Ejemplo:

```text
Usuario:
¿No demuestra esto una relación alta?

NovAi:
Voy a verificar los factores y la evidencia antes de clasificarla.
```

No debe inventar justificaciones para una clasificación previamente asumida.

---

# FASE 19 — CONSULTOR SENIOR

NovAi debe comportarse como un consultor senior.

Características:

```text
preciso
crítico
estructurado
evidence-based
no complaciente
transparente
humilde epistemológicamente
estratégico
profesional
```

Debe poder decir:

```text
No hay evidencia suficiente.
```

Debe poder decir:

```text
La hipótesis planteada no está respaldada por los datos disponibles.
```

Debe poder decir:

```text
Necesito consultar el expediente antes de concluir.
```

Debe poder corregir al usuario.

Pero debe hacerlo profesionalmente.

No debe adoptar un tono:

```text
pedante
arrogante
autosuficiente
condescendiente
```

---

# FASE 20 — PROMPT ARCHITECTURE

Audita el prompt actual.

No mantengas un mega-prompt universal.

Divide conceptualmente:

```text
Core Identity
+
Behavior
+
Safety
+
Evidence policy
+
Current mode
+
Relevant methodology
+
Relevant context
+
Tool instructions
+
Current task
```

Solo incorporar lo necesario.

Ejemplo:

```text
Core Prompt
+
CHAT mode
```

vs.

```text
Core Prompt
+
CONSULTANT mode
+
EFI methodology
+
relevant evidence
```

No cargar metodologías completas si no son necesarias.

---

# FASE 21 — METHODOLOGY ON DEMAND

La base metodológica de NovAi debe ser modular.

No cargar siempre:

```text
EFI
EFE
DAFO
CAME
QSPM
PESTEL
Porter
...
```

si el usuario simplemente dice:

```text
Hola
```

Cargar solamente la metodología relevante.

Ejemplo:

```text
Pregunta sobre EFI
→ EFI methodology

Pregunta sobre CAME
→ CAME methodology

Pregunta sobre DAFO relationship
→ relevant DAFO methodology
```

---

# FASE 22 — MODEL ROUTING

Audita el Model Router.

Determina si actualmente el modelo usado es apropiado para:

```text
casual conversation
reasoning
research
analysis
tool execution
structured output
```

No asumas que un único modelo debe resolver todo.

Diseña routing basado en:

```text
task complexity
reasoning requirements
latency
cost
tool capability
context size
```

No implementes modelos específicos sin verificar disponibilidad y capacidades actuales.

---

# FASE 23 — STREAMING

Audita el streaming de extremo a extremo.

Debe soportar correctamente:

```text
message start
reasoning
tool call
tool execution
tool result
next step
source discovery
final text
completion
error
```

La UI debe actualizarse en tiempo real.

No esperar al final para mostrar toda la actividad.

---

# FASE 24 — UI MESSAGE PARTS

Aprovecha el modelo de partes de AI SDK.

La representación conceptual debe distinguir:

```text
text
reasoning
tool-call
tool-result
source
data
step
```

No convertir toda la ejecución del agente en un único string.

Esto permitirá que la UI sea:

```text
stateful
streaming
collapsible
auditable
```

---

# FASE 25 — MESSAGE PERSISTENCE

Audita la persistencia del historial.

El historial debe persistir correctamente en Supabase.

Verifica:

```text
conversation
messages
message parts
tool calls
tool results
sources
citations
context metadata
```

Debe existir una relación clara:

```text
tenant
 ↓
user
 ↓
conversation
 ↓
message
 ↓
parts
```

---

# FASE 26 — SUPABASE / RLS

Toda persistencia debe respetar:

```text
tenant_id
user authorization
RBAC
RLS
```

Nunca confiar únicamente en:

```text
client-side filtering
```

o:

```text
conversation_id
```

para proteger información.

Audita las consultas de:

```text
conversations
messages
investigations
documents
sources
memories
tool logs
```

---

# FASE 27 — OBSERVABILITY

Implementa observabilidad real.

Cada ejecución debería poder rastrearse mediante un identificador como:

```text
run_id
```

y opcionalmente:

```text
conversation_id
message_id
tool_call_id
```

Registrar:

```text
model
latency
tokens
tools exposed
tools executed
errors
context size
input size
output size
cache usage
```

Nunca registrar secretos.

---

# FASE 28 — TOKEN ACCOUNTING

No mostrar al usuario un número de tokens inventado.

Si el proveedor entrega usage real:

```text
usar usage real
```

Si solamente existe una estimación:

```text
mostrar estimación
```

y distinguirla de uso real.

Nunca presentar:

```text
estimated
```

como:

```text
actual
```

---

# FASE 29 — COST CONTROL

Define métricas:

```text
tokens/request
tokens/conversation
tokens/tool
tokens/RAG
tokens/history
tokens/system
cost/request
cost/conversation
```

El objetivo es minimizar tokens sin degradar calidad.

No optimizar únicamente por cantidad de tokens.

---

# FASE 30 — ERROR UX

Diseña estados:

```text
Thinking
Executing tool
Waiting
Completed
Failed
Retrying
Cancelled
```

Una tool fallida no debe parecer completada.

Ejemplo:

```text
⚠️ No se pudo consultar la fuente
```

y la respuesta debe conocer que esa fuente no pudo verificarse.

---

# FASE 31 — UI FINAL

El mensaje final debería parecer aproximadamente:

```text
┌──────────────────────────────────────────────┐
│ ✨ NovAi                                     │
│                                              │
│ 🧠 Analizó la solicitud                  ▾  │
│                                              │
│ ⚙️ Actividad · 4 pasos                    ▾ │
│                                              │
│ 📚 6 fuentes consultadas                   ▾ │
│                                              │
│ La evidencia disponible indica que... [1]   │
│                                              │
│ Sin embargo, no existe evidencia suficiente  │
│ para afirmar que... [2]                      │
│                                              │
│ Copiar   Regenerar             Contexto 18% │
└──────────────────────────────────────────────┘
```

La respuesta debe ser el elemento visual dominante.

---

# FASE 32 — NO SOBREDISEÑAR

No conviertas NovAi en un dashboard.

La conversación debe sentirse como:

```text
ChatGPT
Claude
Perplexity
```

y no como:

```text
monitor de logs
```

Los detalles técnicos deben estar disponibles bajo demanda.

---

# FASE 33 — ACCESIBILIDAD

Verifica:

```text
keyboard navigation
screen readers
focus states
aria labels
contrast
mobile
responsive behavior
reduced motion
```

Los accordions/collapsibles deben ser realmente accesibles.

---

# FASE 34 — PERFORMANCE

Mide:

```text
TTFT
total response time
UI render time
number of React renders
stream processing
database queries
tool latency
```

No afirmes mejoras sin medirlas.

---

# FASE 35 — TESTING

Implementa tests para:

## Context

```text
hola → minimal context
```

## Tools

```text
hola → no unnecessary tools
```

## Investigation

```text
active investigation → correct DB investigation
```

## Evidence

```text
unsupported claim → not presented as fact
```

## Citation

```text
citation → real source
```

## Tenant

```text
tenant A → cannot see tenant B
```

## RBAC

```text
unauthorized user → tool denied
```

## Compaction

```text
long conversation → summary + recent context
```

## UI

```text
tool execution → Task state updates
```

---

# FASE 36 — TEST MATRIX DE NOVAI

Crea una matriz de pruebas mínima:

| Scenario | Expected |
|---|---|
| Hola | Minimal context |
| Pregunta casual | Minimal tools |
| Investigación activa | Correct investigation |
| Pregunta sobre documento | Relevant document |
| Análisis EFI | EFI methodology |
| Análisis EFE | EFE methodology |
| Relación DAFO | Relevant evidence |
| Web research | Web tools only when necessary |
| Tool failure | Visible failure |
| Unsupported claim | No hallucinated fact |
| Long chat | Compaction |
| 80% context | Warning |
| 90% context | Critical warning |
| Unauthorized tool | Denied |
| Tenant mismatch | Denied |
| Citation | Real source |
| No source | No fake citation |

---

# FASE 37 — MIGRACIÓN INCREMENTAL

NO hagas una reescritura masiva.

Cada fase debe dejar la aplicación ejecutable.

Orden recomendado:

```text
1. Audit
2. Instrumentation
3. Context measurement
4. Tool inventory
5. Dynamic tool architecture
6. Context manager
7. Methodology modularization
8. Evidence model
9. Citation model
10. Compaction
11. Runtime events
12. UIMessage integration
13. AI Elements UI
14. Context UI
15. Tests
16. Performance optimization
17. Final audit
```

---

# FASE 38 — COMPATIBILIDAD

Preserva:

- UI general de NovaStore;
- identidad visual;
- rutas;
- autenticación;
- RBAC;
- tenant isolation;
- investigaciones;
- funcionalidades existentes.

No cambies comportamiento no relacionado con esta misión.

---

# FASE 39 — NO BORRAR SIN JUSTIFICACIÓN

Antes de eliminar cualquier componente:

1. identificar dependencias;
2. verificar referencias;
3. comprobar si se usa en producción;
4. crear migración si corresponde;
5. justificar eliminación.

No eliminar código simplemente porque parece antiguo.

---

# FASE 40 — PLAN ANTES DE IMPLEMENTAR

Después de la auditoría debes presentar:

## A. Estado actual

Qué existe realmente.

## B. Problemas encontrados

Clasificados:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

## C. Arquitectura actual

Diagrama.

## D. Arquitectura propuesta

Diagrama.

## E. Context pipeline

Diagrama.

## F. Tool pipeline

Diagrama.

## G. Memory pipeline

Diagrama.

## H. UI pipeline

Diagrama.

## I. Database changes

Tablas/migraciones necesarias.

## J. Files affected

Lista exacta.

## K. Risks

Riesgos técnicos.

## L. Migration strategy

Fases.

## M. Tests

Tests necesarios.

NO empieces a implementar hasta haber terminado esta auditoría.

---

# CRITERIOS DE ACEPTACIÓN

La misión solamente puede considerarse completada cuando:

### Context

Un:

```text
Hola
```

NO arrastra innecesariamente:

- metodología completa;
- todas las tools;
- investigación;
- RAG;
- memoria irrelevante.

### Tools

Las tools se exponen dinámicamente.

### Evidence

NovAi distingue hechos, inferencias e hipótesis.

### Investigation

NovAi nunca confunde investigaciones.

### Citations

Las citas corresponden a fuentes reales.

### Activity

La actividad mostrada corresponde a eventos reales del runtime.

### Context

El usuario puede ver claramente la utilización de contexto.

### Compaction

Existe un mecanismo real para evitar que conversaciones largas destruyan la utilidad del contexto.

### UI

La respuesta domina visualmente la conversación.

### Performance

Existe evidencia cuantitativa de mejora.

### Security

Tenant isolation y RBAC permanecen intactos.

### Reliability

NovAi puede decir:

> "No tengo evidencia suficiente."

y no inventar una respuesta para complacer al usuario.

---

# PRINCIPIO ARQUITECTÓNICO FINAL

NovAi debe evolucionar desde:

```text
LLM + mega prompt + todas las tools + historial completo
```

hacia:

```text
                    NOVAI
                      │
                 Intent / Task
                      │
               Context Manager
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   Memory         Evidence       Investigation
       │              │              │
       └──────────────┼──────────────┘
                      │
             Dynamic Tool Set
                      │
                Model Router
                      │
                  OpenRouter
                      │
                Agent Runtime
                      │
          ┌───────────┼───────────┐
          │           │           │
        Text        Tools       Sources
          │           │           │
          └───────────┼───────────┘
                      │
                  UIMessage
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   Reasoning         Task          Sources
       │              │              │
       └──────────────┼──────────────┘
                      │
                Final Response
                      │
                  Citations
                      │
                   Context
```

# PRINCIPIO DE CONFIABILIDAD

La regla fundamental de NovAi debe ser:

> **El modelo puede interpretar evidencia, pero no puede crear evidencia.**
>
> **El modelo puede razonar sobre acciones, pero no puede afirmar que una acción ocurrió si el runtime no la ejecutó.**
>
> **El modelo puede proponer una hipótesis, pero no puede presentarla como un hecho sin evidencia.**
>
> **El usuario puede plantear una premisa, pero NovAi debe verificarla cuando la evidencia esté disponible.**

# PRINCIPIO DE UX

> **La actividad de NovAi debe ser visible, pero nunca competir con la respuesta.**

# PRINCIPIO DE CONTEXTO

> **No introducir contexto porque existe. Introducir contexto porque es necesario.**

# PRINCIPIO DE TOOLS

> **No exponer una tool porque NovAi puede usarla. Exponerla porque NovAi necesita usarla.**

# PRINCIPIO DE EVIDENCIA

> **No decir "consulté" si no existe un evento verificable de consulta.**

# PRINCIPIO DE PROFESIONALIDAD

NovAi debe comportarse como un:

**Senior Strategic Management Consultant + Research Analyst + Evidence Auditor**

y no como un chatbot complaciente.

---

# INSTRUCCIÓN FINAL

Empieza AHORA solamente por la auditoría.

NO modifiques código todavía.

NO hagas commits.

NO cambies migraciones.

NO instales dependencias.

NO reemplaces componentes.

Primero inspecciona el repositorio completo relevante y la documentación oficial necesaria.

Después entrega:

1. diagnóstico;
2. arquitectura actual;
3. problemas críticos;
4. evidencia concreta;
5. benchmark actual;
6. arquitectura objetivo;
7. plan de implementación por fases;
8. archivos que cambiarías;
9. migraciones necesarias;
10. riesgos;
11. estrategia de pruebas;
12. criterios de aceptación.

Después de presentar ese plan, espera aprobación antes de comenzar la implementación.