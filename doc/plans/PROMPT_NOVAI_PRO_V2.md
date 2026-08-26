# NOVAI — MASTER IMPLEMENTATION PROMPT v2.0
# DGTECNOVA AI HARNESS / NOVAINVESTIGATOR

Actúa como Staff/Principal Software Engineer especializado en:

- SaaS B2B multi-tenant
- ERP/Business Applications
- AI Agents / Agent Harnesses
- Vercel AI SDK
- TypeScript
- Next.js
- Supabase/PostgreSQL
- RAG y sistemas de evidencia
- Tool Calling
- Model Routing
- Streaming
- Agent observability
- AI UX
- Seguridad RBAC/RLS
- Arquitectura incremental y mantenible
- Diseño de sistemas de agentes de IA
- Arquitectura de software SODA / feature-oriented
- Sistemas de auditoría y trazabilidad
- Prompt engineering para agentes de código

Estás trabajando sobre el repositorio existente:

NovaInvestigator

============================================================
0. AUTORIDAD Y PRIORIDAD DE ESTA ESPECIFICACIÓN
============================================================

Este documento es la especificación maestra de implementación de NovAi.

No debes interpretar esta especificación como una invitación a
reescribir el proyecto.

Las prioridades son:

1. Seguridad y aislamiento multi-tenant
2. Integridad de datos
3. Fronteras arquitectónicas
4. Funcionalidad existente
5. Contratos de Tools
6. Provider independence
7. Trazabilidad y observabilidad
8. UX
9. Detalles de implementación

Si una decisión de implementación entra en conflicto con esta
especificación:

NO elijas silenciosamente una alternativa.

Debes:

1. identificar el conflicto;
2. explicar por qué existe;
3. proponer alternativas;
4. esperar decisión si el conflicto afecta arquitectura,
   seguridad, datos o comportamiento funcional.

============================================================
1. REGLAS ABSOLUTAS
============================================================

NO quiero que hagas una reescritura completa.

NO quiero que reemplaces la arquitectura existente simplemente
porque prefieres otra.

NO quiero una migración masiva de carpetas.

NO elimines funcionalidades existentes salvo que exista una razón
técnica documentada.

NO inventes:

- APIs
- tablas
- RPCs
- endpoints
- tools
- columnas
- permisos
- capacidades
- proveedores
- datos
- relaciones
- evidencia

si no existen o no pueden derivarse razonablemente del código
existente.

Antes de crear cualquier cosa:

INSPECCIONA.

Antes de duplicar una función:

BUSCA.

Antes de mover archivos:

JUSTIFICA.

Antes de modificar una arquitectura existente:

COMPRENDELA.

La aplicación debe continuar siendo ejecutable después de cada
fase de implementación.

============================================================
2. OBJETIVO GENERAL
============================================================

Transformar NovAi desde un chatbot con tools y acceso a datos en
un verdadero AI Agent Harness profesional de DGTECNOVA.

Actualmente NovAi está especializado en análisis profesionales de
investigaciones empresariales:

- EFI
- EFE
- DAFO/FODA
- CAME
- QSPM
- relaciones cruzadas
- evidencia
- auditoría metodológica
- diagnóstico estratégico
- análisis de investigaciones

El objetivo futuro es que el AI Harness pueda reutilizarse para
otros productos y módulos de DGTECNOVA.

Por tanto:

NovAi actualmente es el agente especializado de NovaInvestigator.

El AI Harness es la infraestructura reutilizable sobre la que
NovAi debe evolucionar.

Arquitectura conceptual:

DGTECNOVA AI HARNESS
        |
        +-- Agent Runtime
        +-- Model Router
        +-- Provider Adapters
        +-- Tool Runtime
        +-- Tool Gateway
        +-- Event Protocol
        +-- Streaming
        +-- Context Runtime
        +-- Memory Runtime
        +-- Observability
        +-- Security / Execution Policy
        |
        v
NOVAINVESTIGATOR DOMAIN
        |
        +-- Investigations
        +-- Evidence
        +-- Methodology
        +-- EFI
        +-- EFE
        +-- DAFO
        +-- CAME
        +-- QSPM
        +-- Strategic Analysis
        +-- Investigation Tools

Posteriormente:

DGTECNOVA AI HARNESS
        |
        +-- NovaInvestigator / NovAi
        |
        +-- NovaStore / NovAi
        |
        +-- futuros productos DGTECNOVA

============================================================
3. PRINCIPIO ARQUITECTÓNICO CENTRAL
============================================================

NovAi debe separar claramente:

1. Model
2. Model Router
3. Agent Orchestrator
4. Tool Registry
5. Tool Runtime / Execution
6. Tool Gateway
7. Evidence Engine
8. Analysis Engine
9. Validation/Audit Engine
10. Context/Memory
11. Event/Streaming Layer
12. UI
13. Observability
14. Security

La UI NO debe depender del proveedor concreto del modelo.

La UI tampoco debe depender directamente de formatos de streaming
específicos de:

- OpenAI
- Groq
- Gemini
- OpenRouter
- Cerebras
- Pollinations
- GitHub Models
- OpenCode Zen

Todos los proveedores deben terminar produciendo un protocolo
normalizado de eventos NovAi.

============================================================
4. HARNESS VS DOMAIN
============================================================

Cada componente debe clasificarse conceptualmente como:

A. HARNESS / GENERIC AI INFRASTRUCTURE

o:

B. NOVAINVESTIGATOR DOMAIN LOGIC

HARNESS:

- Agent Runtime
- Agent Orchestrator
- Model Router
- Provider Adapters
- Tool Registry
- Tool Runtime
- Tool lifecycle
- Tool authorization
- Normalized Agent Events
- Streaming
- Context Runtime
- Memory Runtime
- Retry policies
- Provider capability detection
- Observability
- Execution tracing
- Generic security policies

DOMAIN:

- Investigations
- Factors
- Evidence
- EFI
- EFE
- DAFO
- CAME
- QSPM
- Strategic relationships
- Strategic methodology
- Investigation-specific analysis
- Investigation-specific tools
- Strategic audit
- Methodological validation

REGLA:

El Harness NO debe conocer conceptos específicos como:

EFI
EFE
DAFO
CAME
QSPM

El Domain puede utilizar el Harness.

No invertir esta dependencia.

============================================================
5. SODA Y ORGANIZACIÓN DE CARPETAS
============================================================

El proyecto existente utiliza una arquitectura orientada a
features / SODA-like.

NO reemplazar:

src/features/

por:

src/domains/

solo por razones de nomenclatura.

La arquitectura existente debe evolucionar incrementalmente.

Conceptualmente:

FEATURES
= capacidades funcionales del producto

LIB / INFRASTRUCTURE
= capacidades técnicas compartidas

AI HARNESS
= infraestructura reutilizable de agentes

NOVAI DOMAIN
= lógica específica de NovaInvestigator

APP
= entrada/routing de aplicación

UI
= presentación y componentes reutilizables

No realizar migraciones masivas de carpetas durante esta fase.

La ubicación física actual de un componente no determina por sí sola
si conceptualmente pertenece al Harness.

Primero establece la frontera conceptual.

Después, en fases posteriores, puede extraerse físicamente si existe
un beneficio real.

============================================================
6. INSPECCIÓN OBLIGATORIA ANTES DE MODIFICAR
============================================================

Antes de editar código, inspecciona completamente:

src/features/novai/

y específicamente:

- service.ts
- tools.ts
- tool-gateway.ts
- context-builder.ts
- context-engine.ts
- evidence-engine.ts
- methodology-knowledge.ts
- memory-engine.ts
- todos los clients/providers
- componentes UI de NovAi
- route handlers relacionados
- tipos TypeScript
- schemas de Supabase relacionados
- cualquier implementación de calculateAnalysis()
- auditInvestigationConsistency()
- propose-dafo
- propose-qspm

También inspecciona:

- package.json
- versiones actuales de Vercel AI SDK
- @ai-elements
- dependencias de streaming
- Supabase
- autenticación
- autorización
- RLS
- tenant/workspace scoping
- permisos existentes
- servicios existentes
- repositories
- queries
- RPCs
- validators
- engines
- tests existentes

Antes de implementar, construye internamente un mapa:

EXISTE

PARCIAL

FALTA

DUPLICADO

DEBE REUTILIZARSE

DEBE REFACTORIZARSE

NO IMPLEMENTES una función nueva si existe una capacidad equivalente.

============================================================
7. ESTADO ACTUAL CONOCIDO
============================================================

El sistema actualmente posee tools relacionadas con:

- list_investigations
- get_investigation_details
- get_investigations_stats
- list_kanban_tasks
- get_kanban_board_summary
- list_workspace_members_and_teams
- get_tenant_billing_and_quota_info

También existen capacidades relacionadas con:

- evidence-engine
- methodology knowledge
- memory engine
- context engine
- tool gateway
- calculateAnalysis()
- auditInvestigationConsistency()
- propose-dafo
- propose-qspm

Estas capacidades existentes deben aprovecharse.

No dupliques lógica matemática que ya existe.

No dupliques lógica de auditoría que ya existe.

No dupliques lógica de evidencia que ya existe.

============================================================
8. NUEVA TAXONOMÍA DE TOOLS
============================================================

Organiza conceptualmente las tools en:

A. Investigation Tools
B. Evidence Tools
C. Analysis Tools
D. Audit Tools
E. Research Tools
F. Platform Tools

No necesariamente deben existir seis archivos físicos.

La separación conceptual es obligatoria.

Las tools de dominio pertenecen a NovaInvestigator.

El mecanismo que registra, valida, autoriza y ejecuta tools pertenece
al Harness.

============================================================
9. TOOL RUNTIME VS DOMAIN TOOLS
============================================================

Separar:

HARNESS:

- registerTool()
- validateToolInput()
- authorizeTool()
- executeTool()
- timeout
- retry
- lifecycle
- error normalization
- tool events
- telemetry

DOMAIN:

- get_active_investigation
- search_evidence
- get_factor_evidence
- verify_claim
- audit_factor
- audit_relationship
- find_contradictions
- validate_methodology
- calculate_matrix
- trace_strategy
- compare_strategies
- challenge_analysis

NO mezclar estas responsabilidades.

============================================================
10. TOOL: get_active_investigation
============================================================

Implementar:

get_active_investigation

OBJETIVO:

Determinar de manera determinista cuál es la investigación activa
del contexto actual.

NO permitir que el LLM deduzca la investigación activa únicamente
desde memoria conversacional.

Debe considerar:

- authenticated principal
- tenant
- workspace
- contexto actual
- investigación seleccionada
- investigación activa si existe

Debe devolver al menos:

- investigationId
- name/title
- status
- workspaceId
- tenantId
- objective
- current state/version
- updatedAt

Debe validar tenant/workspace.

Debe impedir acceso cross-tenant.

Si no existe investigación activa:

return:

NO_ACTIVE_INVESTIGATION

No inventar una.

UI:

🔎 Investigación activa

FCBC

============================================================
11. TOOL: get_investigation_documents
============================================================

Implementar:

get_investigation_documents

Debe devolver los documentos asociados a la investigación.

Metadata mínima:

- documentId
- investigationId
- name
- type
- version
- source
- uploadedAt
- updatedAt
- page count si existe
- checksum si existe
- status

No devolver contenido completo por defecto.

Debe soportar filtros y paginación cuando la infraestructura existente
lo permita.

UI:

📚 Documentos consultados

- Documento A
- Documento B
- Documento C

============================================================
12. TOOL: search_evidence
============================================================

Implementar:

search_evidence

OBJETIVO:

Buscar evidencia relevante dentro del contexto de investigación.

Input:

- investigationId
- query
- optional factorId
- optional documentIds
- optional source type
- topK

Output normalizado:

- evidenceId
- factorId
- documentId
- title
- content/snippet
- source
- page/section
- relevance
- timestamp/version
- confidence si existe

IMPORTANTE:

La unidad principal debe ser evidencia, no simplemente documentos.

Debe respetar:

- tenant
- workspace
- investigation
- RLS
- permisos

UI:

🔎 Evidencia encontrada

Cada resultado debe ser expandible.

============================================================
13. TOOL: get_factor_evidence
============================================================

Implementar:

get_factor_evidence

Input:

- investigationId
- factorId

Debe localizar toda evidencia disponible para:

- strength
- weakness
- opportunity
- threat

Debe incluir:

- factor
- factor type
- factor description
- evidence
- source
- document
- page/section
- evidence quality
- possible contradictions

Debe utilizarse para responder preguntas como:

"¿De dónde sale D-03?"

NO permitir que el LLM invente evidencia.

============================================================
14. TOOL: verify_claim
============================================================

Implementar:

verify_claim

Input:

- investigationId
- claim
- optional factorId
- optional evidenceIds

Output:

SUPPORTED
PARTIALLY_SUPPORTED
UNSUPPORTED
CONTRADICTED
INSUFFICIENT_EVIDENCE

Además:

- evidenceUsed
- sources
- contradictions
- confidence
- explanation

Regla:

Una hipótesis no es un hecho.

Una inferencia no es evidencia.

Una opinión del LLM no es evidencia.

Distinguir:

FACT
EVIDENCE
INFERENCE
HYPOTHESIS
ASSUMPTION
CONCLUSION

============================================================
15. TOOL: audit_factor
============================================================

Implementar:

audit_factor

Debe revisar un factor de EFI/EFE/DAFO.

Validar:

- existencia
- descripción
- clasificación
- evidencia
- duplicidad
- peso
- rating
- rango
- coherencia
- calidad de evidencia
- contradicciones
- dependencia de supuestos

Output:

VALID
WARNING
INVALID

Con findings estructurados:

- severity
- code
- message
- evidence
- recommendation

============================================================
16. TOOL: audit_relationship
============================================================

IMPLEMENTAR COMO TOOL DE PRIMER NIVEL.

Input:

- investigationId
- internalFactorId
- externalFactorId
- optional quadrant

Debe auditar una relación:

SO
ST
WO
WT

o equivalente existente en el modelo de datos.

Debe recuperar:

1. factor interno
2. factor externo
3. evidencia de ambos
4. relación almacenada
5. justificación existente
6. metodología correspondiente

Debe evaluar:

- existencia de ambos factores
- calidad de evidencia
- coherencia semántica
- existencia de vínculo estratégico
- justificación
- contradicciones
- fuerza asignada
- fuerza que realmente debería tener según evidencia

Output:

relationshipStatus

strength

confidence

evidenceForInternal

evidenceForExternal

supportingEvidence

contradictingEvidence

findings

recommendation

IMPORTANTE:

No asumir que dos factores relacionados temáticamente constituyen
automáticamente una relación estratégica.

Ejemplo:

D-03 existe

A-02 existe

NO significa automáticamente:

D-03 × A-02 = relación fuerte.

La tool debe verificarlo.

============================================================
17. TOOL: find_contradictions
============================================================

Implementar:

find_contradictions

Debe buscar contradicciones entre:

- evidencia
- factores
- EFI
- EFE
- DAFO
- CAME
- QSPM
- estrategias
- conclusiones

Tipos:

FACTOR_EVIDENCE_CONTRADICTION

FACTOR_FACTOR_CONTRADICTION

MATRIX_CONTRADICTION

STRATEGY_CONTRADICTION

SOURCE_CONTRADICTION

Output:

- contradictionId
- severity
- entities
- evidenceA
- evidenceB
- explanation
- recommendation

Reutilizar auditInvestigationConsistency() si ya detecta parte
de esto.

NO duplicar lógica.

============================================================
18. TOOL: validate_methodology
============================================================

Implementar:

validate_methodology

Debe aceptar:

EFI
EFE
DAFO
CAME
QSPM

Debe reutilizar:

- methodology-knowledge.ts
- validators existentes
- engines existentes

EFI:

- weights
- ratings
- weighted scores
- total
- range
- evidence

EFE:

igual.

DAFO:

- factor classification
- duplicates
- evidence
- cross relationships

CAME:

- relationship with DAFO
- correct transformation
- strategic coherence

QSPM:

- weights
- AS
- TAS
- totals
- strategies
- consistency

Output:

- methodology
- status
- score
- errors
- warnings
- recommendations

============================================================
19. TOOL: calculate_matrix
============================================================

NO duplicar calculateAnalysis().

Primero inspecciona:

calculateAnalysis()

Si ya existe un motor determinista suficiente, crea una fachada/tool
sobre él.

Implementar conceptualmente:

calculate_matrix

Input:

- investigationId
- matrixType
- optional version

Debe soportar cuando la infraestructura existente lo permita:

EFI
EFE
DAFO
CAME
QSPM

Nunca pedir al LLM que realice cálculos matemáticos críticos.

Todos los cálculos deben ser deterministas.

Ejemplo EFI:

weightedScore = weight * rating

Validar:

sum(weights) = 1

QSPM:

TAS = weight * AS

etc.

La tool debe devolver:

- input summary
- calculation
- totals
- validation
- warnings

============================================================
20. TOOL: trace_strategy
============================================================

Implementar:

trace_strategy

OBJETIVO:

Permitir rastrear una estrategia hasta sus fundamentos.

Ejemplo:

Strategy S-03

↓

QSPM

↓

CAME

↓

DAFO

↓

D-03 × A-02

↓

D-03

↓

evidence

↓

source document

Debe devolver un grafo o estructura equivalente.

La UI debe poder visualizarlo.

============================================================
21. TOOL: compare_strategies
============================================================

Implementar:

compare_strategies

Debe comparar dos o más estrategias.

Debe explicar:

- score
- difference
- factors driving difference
- QSPM contribution
- evidence
- strategic implications

No limitarse a:

Strategy A > Strategy B.

Debe explicar POR QUÉ.

============================================================
22. TOOL: challenge_analysis
============================================================

Implementar:

challenge_analysis

Esta es una tool de "red team" metodológico.

Debe buscar:

- assumptions
- unsupported claims
- weak evidence
- logical gaps
- contradictions
- overstatements
- methodological violations
- alternative interpretations

Output:

- criticalFindings
- warnings
- alternativeInterpretations
- missingEvidence
- recommendations

Regla:

NovAi NO debe intentar justificar automáticamente la conclusión
existente.

Debe intentar encontrar razones válidas para cuestionarla.

============================================================
23. TOOL: web_research
============================================================

Implementar solo si la infraestructura existente lo permite.

Primero inspeccionar si ya existe infraestructura de búsqueda web.

No inventar un proveedor ni una API.

Debe estar separada de la evidencia interna.

Debe devolver:

- source
- title
- URL
- publication date
- retrieved date
- snippet
- credibility metadata si existe

Distinguir:

INTERNAL_EVIDENCE

EXTERNAL_EVIDENCE

Nunca mezclar ambas silenciosamente.

Las fuentes externas deben aparecer claramente en UI.

============================================================
24. NORMALIZED NOVAI EVENT PROTOCOL
============================================================

Crear una capa de eventos independiente del proveedor.

Definir tipos TypeScript equivalentes conceptualmente a:

NovaiEvent

Tipos mínimos:

- agent-start
- step-start
- step-update
- step-complete
- tool-call
- tool-result
- evidence
- calculation
- audit
- warning
- source
- text-delta
- message-complete
- error

Ejemplo:

{
  type: "tool-call",
  id,
  tool: "get_factor_evidence",
  input
}

Luego:

{
  type: "tool-result",
  id,
  tool: "get_factor_evidence",
  result,
  durationMs
}

Los nombres exactos pueden adaptarse al código existente.

IMPORTANTE:

La UI nunca debe depender directamente de:

- Groq tool_calls
- OpenAI tool_calls
- Gemini parts
- OpenRouter format
- Pollinations SSE format
- provider-specific reasoning_content

Todo debe normalizarse primero.

============================================================
25. AGENT TRACE VS CHAIN OF THOUGHT
============================================================

NO expongas ni almacenes como UI el Chain of Thought privado
del modelo.

No conviertas:

<think>...</think>

ni:

reasoning_content

ni cualquier equivalente del proveedor

en una transcripción del pensamiento privado.

Sí se puede mostrar:

- qué herramienta se utilizó
- qué operación se ejecutó
- qué evidencia se consultó
- qué cálculo se realizó
- qué validación se ejecutó
- qué contradicción se detectó
- qué resultado produjo una tool
- qué fuentes fueron utilizadas
- qué criterio resumido utilizó NovAi
- qué conclusión verificable se obtuvo

La UI debe mostrar:

AGENT TRACE / WORK TRACE

NO:

PRIVATE MODEL THOUGHTS

Ejemplo correcto:

✓ NovAi identificó la investigación activa
✓ Recuperó evidencia de D-03
✓ Recuperó evidencia de A-02
✓ Auditó la relación
✓ Detectó evidencia insuficiente
✓ Generó conclusión

============================================================
26. PROVIDER ARCHITECTURE
============================================================

Inspecciona todos los clientes actuales:

- pollinations-client.ts
- groq-client.ts
- openrouter-client.ts
- gemini-client.ts
- cerebras-client.ts
- github-models-client.ts
- opencode-zen-client.ts

Objetivo:

Todos deben converger hacia el mismo pipeline de Agent Harness.

Preferir Vercel AI SDK Core si las versiones actuales del repo lo
permiten.

No migrar ciegamente.

Primero verificar:

- versión AI SDK
- APIs actuales
- compatibilidad de cada proveedor
- streaming
- tool calling
- reasoning metadata
- structured output
- capability detection

Crear adapters si es necesario.

Arquitectura:

Agent
  ↓
Model Router
  ↓
Provider Adapter
  ↓
Provider API

El Agent NO debe tener lógica:

if provider === "groq"

else if provider === "gemini"

etc.

============================================================
27. MODEL ROUTER
============================================================

El Model Router pertenece conceptualmente al AI Harness.

No debe contener reglas específicas de:

- EFI
- EFE
- DAFO
- CAME
- QSPM

Debe seleccionar modelos según capacidades genéricas:

- complexity
- cost
- availability
- tool calling
- reasoning capability
- structured output
- context window
- latency
- streaming

Nunca asumir que un modelo soporta una capacidad solo por su nombre.

Debe existir capability detection.

Ejemplo conceptual:

supportsTools
supportsReasoning
supportsStructuredOutput
supportsStreaming
supportsVision

============================================================
28. REASONING
============================================================

Si un proveedor entrega reasoning tokens, pueden procesarse
internamente para observabilidad SOLO si las políticas y el SDK
lo permiten.

NO exponerlos como Chain of Thought privado.

Para UI utilizar:

Agent Trace.

Opcionalmente mostrar resúmenes verificables como:

"NovAi verificó la evidencia de D-03 y A-02 antes de evaluar la relación."

Nunca:

"El modelo pensó durante 7 segundos que..."

============================================================
29. PROVIDER FALLBACK
============================================================

Si un proveedor no soporta:

- tools
- reasoning
- structured output
- streaming

etc., el sistema debe degradar de forma explícita.

NO simular tool calling con texto sin que el Harness lo sepa.

Registrar capabilities:

supportsTools
supportsReasoning
supportsStructuredOutput
supportsStreaming

El Agent debe saber qué capacidades tiene realmente disponibles.

============================================================
30. UI / AI ELEMENTS
============================================================

Inspeccionar si el proyecto ya utiliza:

@ai-elements

Si existe, reutilizarlo.

Componentes conceptuales:

NovaiChat
NovaiMessage
NovaiToolCall
NovaiToolResult
NovaiEvidenceCard
NovaiAuditCard
NovaiCalculationCard
NovaiSourceCard
NovaiTrace
NovaiWarning
NovaiConclusion

Utilizar AI Elements cuando sea apropiado.

NO utilizar un componente denominado Reasoning/ChainOfThought para
mostrar pensamiento privado del modelo.

Si AI Elements permite representar tool execution, tasks, sources,
context o work trace, reutilizar esas capacidades.

============================================================
31. UI: AGENT TRACE
============================================================

Cada ejecución importante debe poder visualizar:

🔎 Investigación identificada

🔧 Tool utilizada

📚 Evidencia consultada

🧮 Cálculo

🔗 Relación auditada

⚠️ Advertencia

✅ Validación

📌 Conclusión

Ejemplo:

NovAi

────────────────────────

🔎 Investigación

FCBC

✓ Investigación identificada

📚 Evidencia

D-03

A-02

✓ 4 evidencias consultadas

🔗 Auditoría

D-03 × A-02

⚠️ Relación débil

🧮 Validación

DAFO ✓

────────────────────────

Conclusión

La relación puede considerarse plausible,

pero la evidencia actual no justifica

una fuerza alta.

[Ver evidencia]

[Ver auditoría]

[Ver matriz]

============================================================
32. TOOL UI
============================================================

Cada tool-call debe tener:

- nombre amigable
- estado
- duración
- input resumido
- resultado resumido

NO mostrar JSON bruto por defecto.

Ejemplo:

🔧 Auditando relación

D-03 × A-02

✓ Completado · 1.4s

[Ver detalles]

============================================================
33. EVIDENCE UI
============================================================

Crear:

EvidenceCard

Mostrar:

- factor
- evidencia
- fuente
- documento
- página
- fecha
- confidence/quality
- botón para abrir fuente/documento

Debe ser trazable.

============================================================
34. AUDIT UI
============================================================

Crear:

AuditCard

Mostrar:

VALID
WARNING
INVALID

Con severity:

INFO
LOW
MEDIUM
HIGH
CRITICAL

Ejemplo:

⚠ WARNING

D-03 × A-02

La evidencia confirma ambos factores,

pero no demuestra suficientemente

el vínculo estratégico.

============================================================
35. CALCULATION UI
============================================================

Crear:

CalculationCard

Ejemplo:

EFI

Weight × Rating

D-03

0.20 × 3 = 0.60

Total EFI

2.74

[Ver cálculo completo]

Los cálculos deben provenir del backend determinista.

============================================================
36. SOURCE UI
============================================================

Crear:

SourceCard

Separar:

Fuente interna

Fuente externa

Mostrar:

- nombre
- tipo
- fecha
- documento
- página
- URL si existe

============================================================
37. STREAMING
============================================================

La respuesta debe poder comenzar inmediatamente.

Flujo:

user message

↓

agent

↓

tool-call event

↓

tool-result event

↓

text

↓

complete

No esperar a terminar todo para mandar texto si el SDK permite
streaming.

Mantener compatibilidad con streaming existente.

El streaming del proveedor debe ser transformado al protocolo
normalizado antes de llegar a UI.

============================================================
38. SECURITY
============================================================

CRÍTICO:

Cada tool debe recibir contexto del principal autenticado.

Nunca confiar en:

tenantId enviado por el cliente.

El backend debe obtener:

tenantId
workspaceId
userId
roles
permissions

desde el principal autenticado.

Toda consulta debe respetar:

tenant isolation
workspace isolation
RLS
RBAC

No permitir:

tenant A → investigation tenant B

Tool Gateway debe permanecer como enforcement point.

============================================================
39. TOOL PERMISSIONS
============================================================

Cada tool debe declarar conceptualmente:

- required permission
- scope
- risk
- read/write

Ejemplo:

get_factor_evidence:

read

investigation scope

low risk

audit_relationship:

read

investigation scope

medium risk

modify_analysis:

write

investigation scope

high risk

Aunque inicialmente las nuevas tools sean read-only, diseñar el
sistema para permitir posteriormente tools write.

No inventar permisos nuevos si ya existe un sistema de permisos.

Reutilizarlo.

============================================================
40. IDEMPOTENCY
============================================================

Las tools read-only deben ser seguras para reintentos.

Las futuras tools write deben requerir:

- idempotency key
- validación server-side

No implementar persistencia de escritura nueva salvo que exista
requisito explícito.

============================================================
41. OBSERVABILITY
============================================================

Registrar cuando la infraestructura existente lo permita:

- requestId
- conversationId
- agentRunId
- tenantId
- workspaceId
- userId
- model
- provider
- tool
- tool duration
- success/failure
- tokens si disponibles
- latency
- errors
- audit findings

NO registrar secretos.

NO registrar información sensible innecesaria.

No almacenar Chain of Thought privado.

============================================================
42. ERROR HANDLING
============================================================

Las tools nunca deben hacer que el agente invente una respuesta.

Si falla:

get_factor_evidence

NovAi debe decir:

"No pude verificar la evidencia de D-03 porque..."

NO:

"Según la evidencia..."

Crear errores estructurados.

Distinguir:

TOOL_ERROR

AUTHORIZATION_ERROR

NOT_FOUND

INSUFFICIENT_EVIDENCE

VALIDATION_ERROR

PROVIDER_ERROR

TIMEOUT

etc., solo cuando sean compatibles con las convenciones existentes.

============================================================
43. ANTI-COMPLACENCY
============================================================

Implementar reglas:

Si el usuario afirma:

"D-03 es fuerza 0"

NovAi no debe aceptar la afirmación como hecho.

Debe:

1. identificar investigación
2. recuperar D-03
3. recuperar evidencia
4. verificar clasificación
5. verificar relación si aplica
6. evaluar
7. responder

Si existe evidencia canónica, usarla.

Si no existe:

INSUFFICIENT_EVIDENCE

No inventar.

============================================================
44. FACT / INFERENCE / HYPOTHESIS
============================================================

Cada conclusión importante debe poder clasificarse como:

FACT
EVIDENCE
INFERENCE
HYPOTHESIS
ASSUMPTION
CONCLUSION

La UI debería mostrar esta distinción cuando sea relevante.

============================================================
45. NO OVER-TOOLING
============================================================

No crear una tool para cada pequeña operación.

Preferir tools semánticas y de alto nivel.

Ejemplo correcto:

audit_relationship()

No:

get_factor_name()

get_factor_weight()

get_factor_rating()

get_factor_type()

get_factor_source()

si todo eso puede recuperarse mediante:

get_factor_evidence()

o contexto apropiado.

============================================================
46. NO DUPLICATION
============================================================

Antes de implementar cada tool:

Buscar si ya existe lógica equivalente.

Especialmente:

calculateAnalysis()

auditInvestigationConsistency()

evidence-engine

methodology-knowledge

context-engine

memory-engine

tool-gateway

Si existe:

crear adapter/facade.

No duplicar algoritmos.

============================================================
47. TESTS
============================================================

Crear tests unitarios para cada nueva tool.

Casos mínimos:

1. investigación válida
2. investigación inexistente
3. tenant incorrecto
4. workspace incorrecto
5. factor inexistente
6. evidencia inexistente
7. contradicción
8. datos incompletos
9. weights inválidos
10. relaciones inválidas

Crear casos específicos:

D-03 × A-02

Debe demostrar que NovAi no acepta automáticamente una relación
solo porque ambos factores existan.

============================================================
48. TESTS DE AGENTE
============================================================

Crear escenarios:

A.

"¿Qué investigaciones tengo?"

Debe usar:

list_investigations

B.

"¿Cuál es la investigación activa?"

Debe usar:

get_active_investigation

C.

"¿De dónde sale D-03?"

Debe usar:

get_factor_evidence

D.

"¿Está bien justificada D-03 × A-02?"

Debe usar:

get_active_investigation

get_factor_evidence

audit_relationship

E.

"¿Hay contradicciones?"

Debe usar:

find_contradictions

F.

"¿Por qué la estrategia A es mejor que B?"

Debe usar:

compare_strategies

G.

"¿Esta EFI es metodológicamente correcta?"

Debe usar:

validate_methodology

============================================================
49. UI TESTING
============================================================

Verificar:

- tool-call visible
- tool-result visible
- evidence card
- audit card
- calculation card
- source card
- loading states
- error states
- streaming
- responsive layout
- mobile
- desktop

No mostrar JSON bruto al usuario normal.

Agregar "Ver detalles" para debugging avanzado.

============================================================
50. ACCESSIBILITY
============================================================

Todas las tarjetas:

- keyboard accessible
- aria labels
- estados visibles
- no depender solo de color
- loading state accesible
- error state accesible

============================================================
51. PERFORMANCE
============================================================

No cargar toda la investigación si solo se necesita un factor.

Preferir:

get_factor_evidence()

sobre:

get_investigation_details()

cuando la pregunta sea puntual.

Evitar duplicar queries.

Cachear solo datos seguros y con invalidación apropiada.

No cachear entre tenants.

No cachear datos de investigación sin estrategia clara de
invalidación.

============================================================
52. DOCUMENTACIÓN
============================================================

Actualizar documentación técnica.

Crear o actualizar:

NOVAI_ARCHITECTURE.md

Debe explicar:

- architecture
- Harness boundary
- NovaInvestigator domain
- event protocol
- tools
- permissions
- provider adapters
- UI
- audit
- evidence
- model router
- security
- observability

Crear:

NOVAI_TOOLS.md

Con cada tool:

- name
- purpose
- category
- input
- output
- permissions
- scope
- side effects
- failure modes
- examples

Si existe una estructura docs/architecture/ apropiada, utilizarla
en lugar de crear documentación dispersa.

============================================================
53. IMPLEMENTACIÓN INCREMENTAL
============================================================

NO intentar hacer todo en un único cambio gigante.

Fases:

PHASE 1

Audit existing architecture.

PHASE 2

Define/normalize provider pipeline.

PHASE 3

Define NovaiEvent protocol.

PHASE 4

Normalize tool events.

PHASE 5

Implement Agent Trace.

PHASE 6

Evidence/Audit/Calculation/Source UI.

PHASE 7

Missing investigation/evidence tools.

PHASE 8

Methodology/audit tools.

PHASE 9

Strategy trace/comparison.

PHASE 10

Challenge/red-team.

PHASE 11

Tests.

PHASE 12

Documentation.

PHASE 13

Architectural extraction candidates for the future DGTECNOVA
AI Harness.

IMPORTANTE:

PHASE 13 NO significa realizar automáticamente una migración masiva.

Debe producir:

- candidatos
- dependencias
- riesgos
- propuesta de extracción
- impacto

Después de cada fase:

- run TypeScript
- run lint
- run tests
- verify build
- verify critical flows

No avanzar si se rompe la aplicación.

============================================================
54. CRITERIOS DE ARQUITECTURA HARNESS
============================================================

La implementación debe dejar preparada la posibilidad de extraer
posteriormente componentes genéricos hacia un DGTECNOVA AI Harness.

Candidatos típicos:

- Agent Runtime
- Model Router
- Provider Adapter interface
- Tool Registry
- Tool Runtime
- Tool authorization
- Event protocol
- Streaming normalization
- Agent Trace
- capability detection
- observability

Estos componentes NO deben depender directamente de:

- EFI
- EFE
- DAFO
- CAME
- QSPM
- investigation-specific tables

Si un componente genérico necesita conocer estos conceptos, eso es
una señal de acoplamiento que debe ser reportada.

============================================================
55. FUTURA REUTILIZACIÓN EN NOVASTORE
============================================================

El diseño debe permitir eventualmente:

NovaStore
    ↓
DGTECNOVA AI Harness
    ↓
NovaStore Domain Tools

sin necesitar:

- copiar NovAi
- copiar Model Router
- copiar Provider Clients
- duplicar Tool Runtime
- duplicar Event Protocol
- duplicar Agent Trace

NovaStore podrá tener tools completamente diferentes.

Por tanto:

HARNESS = reutilizable

TOOLS = domain-specific

DATA = tenant/product-specific

PROMPTS = agent/domain-specific

POLICIES = configurable y segura

============================================================
56. CRITERIOS DE ACEPTACIÓN
============================================================

Consideraré terminado cuando:

1. NovAi pueda identificar determinísticamente la investigación activa.

2. NovAi pueda recuperar evidencia específica.

3. NovAi pueda verificar claims.

4. NovAi pueda auditar factores.

5. NovAi pueda auditar relaciones DAFO.

6. NovAi pueda validar EFI/EFE/DAFO/CAME/QSPM.

7. NovAi pueda detectar contradicciones.

8. NovAi pueda rastrear una estrategia hasta su evidencia.

9. NovAi pueda comparar estrategias.

10. NovAi pueda desafiar conclusiones.

11. La UI pueda mostrar Agent Trace.

12. La UI pueda mostrar tool calls.

13. La UI pueda mostrar evidencia.

14. La UI pueda mostrar auditorías.

15. La UI pueda mostrar cálculos.

16. La UI pueda mostrar fuentes.

17. El sistema no dependa del proveedor para representar estos eventos.

18. No se exponga Chain of Thought privado.

19. Todo respete tenant/workspace/RBAC/RLS.

20. Los cálculos críticos sean deterministas.

21. Los tests cubran las nuevas capacidades.

22. La aplicación siga compilando.

23. Los Provider Adapters estén aislados del Domain.

24. El Model Router no contenga lógica específica de NovaInvestigator.

25. El Tool Runtime no contenga lógica específica de EFI/EFE/DAFO.

26. La UI consuma eventos normalizados.

27. Las tools utilicen lógica existente cuando esté disponible.

28. No existan duplicaciones innecesarias de engines o cálculos.

29. El sistema pueda evolucionar hacia un DGTECNOVA AI Harness
    reutilizable.

============================================================
57. REGLAS DE IMPLEMENTACIÓN POR FASE
============================================================

Antes de cada fase:

1. inspeccionar código relevante;
2. identificar dependencias;
3. identificar código reutilizable;
4. identificar riesgos;
5. presentar plan de la fase.

Durante la fase:

- realizar cambios pequeños;
- mantener tipos estrictos;
- evitar any salvo justificación documentada;
- mantener compatibilidad;
- reutilizar abstracciones existentes;
- agregar tests.

Después de la fase:

- verificar TypeScript;
- verificar lint;
- ejecutar tests;
- verificar build;
- verificar comportamiento;
- revisar cambios.

No realizar cambios no relacionados con la fase actual.

============================================================
58. FORMATO DE REPORTE DE CADA FASE
============================================================

Después de cada fase informa:

### Implementado

- ...

### Reutilizado

- ...

### Refactorizado

- ...

### Nuevo

- ...

### Harness / Infrastructure

- ...

### NovaInvestigator Domain

- ...

### Archivos modificados

- ...

### Archivos creados

- ...

### Archivos eliminados

- ...

### Tests

- ...

### Validaciones ejecutadas

- TypeScript
- lint
- tests
- build

### Riesgos

- ...

### Deuda técnica

- ...

### Decisiones arquitectónicas

- ...

### Próxima fase

- ...

============================================================
59. REGLA FINAL
============================================================

El objetivo NO es hacer que NovAi parezca inteligente.

El objetivo es hacer que NovAi sea:

VERIFICABLE

TRAZABLE

AUDITABLE

DETERMINISTA donde corresponda

SEGURO

MULTI-TENANT

OBSERVABLE

EXPLICABLE

ESCALABLE

MANTENIBLE

PROVIDER-INDEPENDENT

REUTILIZABLE

La interfaz debe permitir al usuario entender:

"¿Qué hizo NovAi?"

"¿Qué datos consultó?"

"¿Qué evidencia encontró?"

"¿Qué cálculo hizo?"

"¿Qué validó?"

"¿Qué problema detectó?"

"¿Qué fuentes utilizó?"

"¿Por qué llegó a esa conclusión?"

sin exponer el Chain of Thought privado del modelo.

Prioriza:

EXACTITUD

sobre espectacularidad.

TRAZABILIDAD

sobre apariencia de inteligencia.

EVIDENCIA

sobre afirmaciones.

DETERMINISMO

sobre improvisación.

SEGURIDAD

sobre conveniencia.

ARQUITECTURA INCREMENTAL

sobre reescritura.

No inventes capacidades.

No inventes datos.

No inventes evidencia.

No inventes herramientas.

No inventes APIs.

No inventes tablas.

No inventes permisos.

No inventes comportamiento.

INSPECCIONA EL CÓDIGO ANTES DE IMPLEMENTAR.

============================================================
60. ORDEN DE TRABAJO OBLIGATORIO
============================================================

Primero:

INSPECCIONA.

Segundo:

PRESENTA UN PLAN TÉCNICO.

Tercero:

IDENTIFICA QUÉ YA EXISTE.

Cuarto:

IDENTIFICA QUÉ ES PARCIAL.

Quinto:

IDENTIFICA QUÉ FALTA.

Sexto:

IDENTIFICA QUÉ DEBE REUTILIZARSE.

Séptimo:

IDENTIFICA QUÉ DEBE REFACTORIZARSE.

Octavo:

IDENTIFICA QUÉ PERTENECE CONCEPTUALMENTE AL FUTURO HARNESS.

Noveno:

IDENTIFICA QUÉ PERTENECE AL NOVAINVESTIGATOR DOMAIN.

Décimo:

IMPLEMENTA INCREMENTALMENTE.

No empieces modificando código antes de haber inspeccionado
la arquitectura y presentado el plan de la fase correspondiente.

============================================================
61. REGLA ESPECIAL PARA AGENTES DE CÓDIGO
============================================================

No interpretes una instrucción de este documento de forma literal
si hacerlo rompe una capacidad existente o contradice la arquitectura
real descubierta durante la inspección.

Cuando encuentres una diferencia entre:

A. esta especificación

y:

B. el código real

NO inventes una solución.

Reporta:

- qué dice la especificación;
- qué hace actualmente el código;
- cuál es la diferencia;
- qué impacto tiene;
- qué solución propones.

La implementación debe basarse en evidencia del repositorio.

============================================================
62. REGLA SOBRE CAMBIOS DE ARQUITECTURA
============================================================

Un cambio de arquitectura solo está justificado si:

- elimina duplicación real;
- reduce acoplamiento;
- mejora seguridad;
- mejora testabilidad;
- mejora mantenibilidad;
- permite reutilización;
- resuelve una limitación técnica real;
- o es necesario para cumplir una capacidad de NovAi.

"No me gusta esta arquitectura"

NO es una razón suficiente.

============================================================
63. DEFINICIÓN DE ÉXITO
============================================================

NovAi habrá evolucionado correctamente cuando pueda actuar como
un profesional que:

1. identifica correctamente el contexto;
2. identifica correctamente la investigación;
3. consulta datos reales;
4. recupera evidencia;
5. distingue hechos de inferencias;
6. audita afirmaciones;
7. valida metodología;
8. ejecuta cálculos deterministas;
9. identifica contradicciones;
10. cuestiona conclusiones;
11. rastrea estrategias hasta su evidencia;
12. explica resultados verificables;
13. muestra qué hizo mediante Agent Trace;
14. mantiene aislamiento multi-tenant;
15. utiliza el proveedor de IA como una implementación intercambiable;
16. puede evolucionar posteriormente hacia el DGTECNOVA AI Harness.

La meta no es:

"un chatbot que responde bonito".

La meta es:

"un sistema de agentes profesional, verificable, auditable,
trazable y seguro".

============================================================
FIN DEL MASTER IMPLEMENTATION PROMPT v2.0
============================================================