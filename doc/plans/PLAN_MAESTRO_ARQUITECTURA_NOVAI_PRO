Sí. Y para **NovAi** yo no haría simplemente un chatbot conectado a Supabase. Lo diseñaría como una **plataforma de agentes multi-tenant**, donde el LLM es solo una pieza.

La arquitectura que te recomiendo es esta:

```text
                         ┌──────────────────────────┐
                         │         NOVASTORE        │
                         │      SaaS B2B Multi       │
                         │          Tenant           │
                         └────────────┬─────────────┘
                                      │
                              ┌───────▼───────┐
                              │     NovAi     │
                              │ Agent Runtime │
                              └───────┬───────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
       ┌─────▼─────┐           ┌──────▼──────┐          ┌─────▼─────┐
       │   Model   │           │   Context   │          │   Agent   │
       │   Router  │           │   Engine    │          │  Planner  │
       └─────┬─────┘           └──────┬──────┘          └─────┬─────┘
             │                        │                        │
       ┌─────▼──────────┐       ┌─────▼──────────┐       ┌────▼─────┐
       │ LLM Providers  │       │ RAG + Memory   │       │  Tools   │
       │ Free/Low/Paid  │       │ Knowledge      │       │ Gateway  │
       └────────────────┘       └──────┬──────────┘       └────┬─────┘
                                       │                        │
                              ┌────────▼────────┐       ┌──────▼────────┐
                              │    Supabase     │       │ NovaStore API │
                              │ DB + Vector +   │       │ Stripe GitHub │
                              │ Auth + Storage  │       │ etc.           │
                              └─────────────────┘       └───────────────┘
```

## 1. La regla arquitectónica #1

Hay que separar **inteligencia, conocimiento, memoria y autoridad**.

Son cuatro cosas diferentes:

```text
LLM
 ↓
"¿Qué debería hacer?"

Knowledge/RAG
 ↓
"¿Qué información tengo?"

Memory
 ↓
"¿Qué ocurrió anteriormente?"

RBAC/Policies
 ↓
"¿Qué tiene permitido hacer?"

Tools
 ↓
"¿Cómo ejecuto la acción?"
```

Esto es crítico.

**Nunca permitas que el LLM determine por sí mismo si puede acceder a algo.**

El modelo puede *solicitar*:

```text
get_workspace_members()
```

pero el backend decide:

```text
¿Quién es el usuario?
¿A qué tenant pertenece?
¿Qué workspace?
¿Qué rol tiene?
¿Tiene ese permiso?
¿La suscripción permite esta capacidad?
¿La herramienta puede ejecutarse?
```

---

# 2. NovAi Agent Runtime

El núcleo debería ser:

```text
NovAi Agent Runtime
```

No el modelo.

Yo lo dividiría así:

```text
Agent Runtime
│
├── Session Manager
├── Identity Context
├── Context Builder
├── Model Router
├── Planner
├── Tool Executor
├── RAG Engine
├── Memory Manager
├── Guardrails
├── Output Validator
└── Audit Logger
```

Flujo:

```text
Usuario
  ↓
Authentication
  ↓
Tenant Resolution
  ↓
RBAC
  ↓
NovAi Session
  ↓
Intent Detection
  ↓
Context Builder
  ↓
RAG / Memory
  ↓
Model Router
  ↓
LLM
  ↓
¿Necesita herramienta?
  │
 ┌┴─────┐
No     Sí
│       │
│    Permission
│       ↓
│    Tool
│       ↓
│    Result
│       │
└───┬───┘
    ↓
Validation
    ↓
Response
```

---

# 3. Model Router

Aquí está una de las partes más importantes.

No hagas:

```text
NovAi → Gemini
```

Haz:

```text
NovAi
  ↓
Model Router
  ↓
Task Classification
  ↓
Modelo apropiado
```

Por ejemplo:

| Tipo de tarea            | Modelo                      |
| ------------------------ | --------------------------- |
| Conversación             | modelo rápido/free          |
| Pregunta sobre NovaStore | modelo general              |
| Análisis estratégico     | modelo reasoning            |
| Código                   | Qwen Coder                  |
| Investigación profunda   | modelo reasoning + tools    |
| Resumen                  | modelo económico            |
| Vision                   | modelo multimodal           |
| Acción crítica           | modelo potente + validación |

Y añade un sistema de **tiers**:

```text
FREE
 ↓
LOW_COST
 ↓
PREMIUM
 ↓
FALLBACK
```

Ejemplo:

```text
Gemma
  ↓ falla
Qwen
  ↓ falla
DeepSeek
  ↓ falla
otro proveedor
```

Así NovAi nunca depende de un proveedor concreto.

---

# 4. RAG: aquí estará el cerebro de NovaStore

Yo crearía una **Master Knowledge Base**.

Y aquí conectamos directamente con el proyecto que ya estás construyendo para convertir NovAi en consultor estratégico senior.

No sería simplemente:

```text
PDF → embeddings
```

Sería una arquitectura de conocimiento estructurado.

```text
                 KNOWLEDGE BASE
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
 Strategic        NovaStore         Technical
 Methodology      Knowledge         Knowledge
       │               │                │
       ▼               ▼                ▼
 Frameworks       Modules           Architecture
 Models           Features          Code
 Principles       Business Rules    APIs
```

Y añadiría:

```text
Policies
Definitions
Decisions
Requirements
Processes
Metrics
Experiments
Research
Documentation
```

### Ejemplo

NovAi recibe:

> ¿Cómo debería diseñar el módulo de pricing?

No debería inventar.

Debe recuperar:

```text
Strategic methodology
+
NovaStore pricing requirements
+
Stripe architecture
+
Existing database model
+
Previous architectural decisions
```

Y entonces razonar.

---

# 5. RAG híbrido

No utilizaría únicamente búsqueda vectorial.

Usaría:

```text
Semantic Search
+
Keyword Search
+
Metadata Filtering
+
Structured SQL
+
Knowledge Graph/Relations
```

Por ejemplo:

```text
Query
 ↓
Embedding
 ↓
Vector Search
       +
Keyword Search
       +
Tenant filter
       +
Knowledge type
       +
Version
       +
Permission
 ↓
Reranking
 ↓
Context
```

Esto evita que NovAi encuentre un documento excelente pero perteneciente a otro tenant. Ese bug sería **game over** en un SaaS B2B.

---

# 6. Supabase

Supabase sería una pieza central, pero no todo debería pasar directamente por el LLM.

Yo organizaría las tablas conceptualmente así:

```text
tenants
│
├── workspaces
│   │
│   ├── workspace_members
│   ├── teams
│   └── team_members
│
├── subscriptions
├── entitlements
│
└── novai
    ├── conversations
    ├── messages
    ├── agent_runs
    ├── tool_calls
    ├── memories
    ├── knowledge_documents
    ├── knowledge_chunks
    ├── embeddings
    ├── knowledge_sources
    └── audit_events
```

Y utilizaría **RLS como última barrera**, no como sustituto de la lógica de autorización.

---

# 7. Memoria

NovAi necesita varios tipos de memoria.

No mezcles todo.

### A. Memoria de conversación

```text
conversation
 ├── messages
 ├── tool calls
 └── summaries
```

Para recordar:

> "Hace 10 minutos estábamos diseñando pricing."

---

### B. Memoria del usuario

Preferencias no sensibles:

```text
user_preferences
user_work_patterns
interaction_preferences
```

---

### C. Memoria del workspace

Esto es muchísimo más importante para NovaStore.

```text
workspace_memory
```

Puede almacenar:

* decisiones;
* objetivos;
* proyectos;
* contexto;
* estrategias;
* configuraciones relevantes.

---

### D. Memoria estratégica

Esta sería especial:

```text
Strategic Memory
```

Ejemplo:

```text
Decision:
NovaStore utiliza Stripe como payment processor.

Reason:
Delegar payment processing a Stripe.

Date:
2026-08-20

Status:
Active
```

Así NovAi no vuelve mañana con una propuesta que contradiga una decisión arquitectónica ya aprobada.

---

# 8. Tool Gateway

Este es otro componente crítico.

**Nunca le des acceso directo al modelo a Supabase.**

Haz:

```text
LLM
 ↓
Tool Gateway
 ↓
Authorization
 ↓
Validation
 ↓
Tool
 ↓
Backend
```

Herramientas:

```text
Workspace Tools
├── get_workspace()
├── list_members()
├── get_projects()
└── get_workspace_settings()

NovaStore Tools
├── get_module()
├── get_feature()
├── get_subscription()
├── get_entitlements()
└── get_usage()

Knowledge Tools
├── search_knowledge()
├── get_document()
└── search_decisions()

Development Tools
├── github_search()
├── inspect_repository()
├── create_branch()
└── run_tests()

Billing Tools
├── get_subscription()
├── get_invoice()
├── get_usage()
└── create_checkout_session()
```

---

# 9. RBAC + ABAC

Aquí aprovecharía directamente la arquitectura RBAC que estás rediseñando.

No usaría únicamente:

```text
role = admin
```

NovAi necesita evaluar:

```text
Identity
+
Tenant
+
Workspace
+
Role
+
Team
+
Resource
+
Action
+
Subscription
+
Policy
```

Por ejemplo:

```text
Can NovAi execute:

delete_workspace()
```

El Policy Engine evalúa:

```text
user.role
workspace.role
resource.owner
subscription.entitlement
action
tenant
```

Y responde:

```text
ALLOW
```

o:

```text
DENY
```

El LLM **no participa en esta decisión**.

---

# 10. Stripe

Aquí también hay que separar conceptos.

Stripe es el **sistema de pagos**, mientras NovaStore mantiene el estado comercial que necesita para controlar acceso.

```text
Stripe
 │
 ├── Customer
 ├── Product
 ├── Price
 ├── Subscription
 ├── Invoice
 └── Payment
       │
       ▼
Stripe Webhooks
       │
       ▼
NovaStore
       │
       ▼
Entitlements
       │
       ▼
NovAi
```

NovAi nunca debería preguntarle directamente a Stripe:

> "¿Este usuario puede usar esta función?"

Debe consultar:

```text
NovaStore Entitlement Service
```

Por ejemplo:

```text
novai.deep_research
novai.code_agent
novai.advanced_reasoning
novai.monthly_tokens
novai.tool_calls
novai.knowledge_storage
```

---

# 11. Entitlements

Esto es clave para monetizar NovAi.

Ejemplo:

```text
PLAN
│
├── novai.enabled
├── novai.messages
├── novai.tokens
├── novai.reasoning
├── novai.deep_research
├── novai.tools
├── novai.code_agent
└── novai.priority_models
```

Entonces:

```text
Free
 ├── 100 messages
 ├── basic models
 └── limited tools

Pro
 ├── 5,000 messages
 ├── reasoning
 ├── tools
 └── better models

Enterprise
 ├── higher limits
 ├── advanced agents
 ├── private knowledge
 └── premium models
```

Y NovAi simplemente consulta:

```text
check_entitlement(
    workspace_id,
    "novai.deep_research"
)
```

---

# 12. Seguridad multi-tenant

Esta parte no es negociable.

Todo objeto de NovAi debería tener:

```text
tenant_id
```

y cuando corresponda:

```text
workspace_id
```

Por ejemplo:

```text
novai_conversations

id
tenant_id
workspace_id
user_id
...
```

Knowledge:

```text
knowledge_documents

id
tenant_id
workspace_id
visibility
...
```

Memories:

```text
memories

id
tenant_id
workspace_id
scope
...
```

Y las búsquedas deben aplicar aislamiento **antes** del ranking.

No:

```text
buscar todo
 ↓
filtrar tenant
```

Sino:

```text
tenant filter
 ↓
permission filter
 ↓
semantic search
 ↓
ranking
```

---

# 13. Anti-alucinación

Para el NovAi que quieres construir, yo añadiría una capa explícita de **Grounding**.

Cuando responde:

```text
"Según NovaStore..."
```

debe poder saber:

```text
source
document
version
confidence
```

Y separar:

```text
FACT
INFERENCE
RECOMMENDATION
UNKNOWN
```

Ejemplo:

> **Hecho:** NovaStore utiliza Stripe para procesar pagos.

> **Inferencia:** Esto permite mantener la lógica de pago fuera del núcleo de NovaStore.

> **Recomendación:** Mantendría Stripe como payment processor y utilizaría un Entitlement Service interno.

Eso es muchísimo mejor que el típico chatbot que habla con seguridad aunque esté improvisando.

---

# 14. NovAi debería tener modos de operación

Yo definiría al menos:

```text
CHAT
CONSULTANT
ANALYST
RESEARCHER
DEVELOPER
ARCHITECT
OPERATOR
```

### CHAT

Pregunta/respuesta.

### CONSULTANT

Analiza negocio y estrategia.

### ANALYST

Analiza datos.

### RESEARCHER

Investiga fuentes y genera evidencia.

### DEVELOPER

Trabaja con código.

### ARCHITECT

Diseña arquitectura.

### OPERATOR

Ejecuta acciones mediante Tools.

Y cada modo tendría:

```text
system instructions
allowed tools
allowed models
allowed knowledge
risk level
approval requirements
```

---

# 15. Human-in-the-loop

Para acciones peligrosas:

```text
NovAi
 ↓
Tool Request
 ↓
Risk Engine
 ↓
¿Riesgo alto?
 ↓
YES
 ↓
User Approval
 ↓
Tool
```

Ejemplos:

### Bajo riesgo

```text
get_workspace()
search_knowledge()
list_members()
```

Automático.

### Medio

```text
create_project()
create_branch()
modify_configuration()
```

Puede requerir confirmación dependiendo del rol.

### Alto

```text
delete_workspace()
change_subscription()
refund_payment()
modify_RBAC()
delete_data()
```

**Siempre aprobación explícita.**

---

# 16. Auditoría

Cada acción de NovAi debe generar:

```text
agent_runs
tool_calls
audit_events
```

Ejemplo:

```text
User:
"Elimina este workspace"

NovAi:
requested delete_workspace()

Policy:
ALLOW

Risk:
HIGH

Approval:
USER_APPROVED

Tool:
delete_workspace()

Result:
SUCCESS
```

Eso después te permite saber exactamente:

> quién → pidió qué → qué modelo lo decidió → qué herramienta ejecutó → con qué permisos → qué resultado produjo.

Eso es nivel producción.

---

# 17. Arquitectura final

Yo la dejaría así:

```text
                           NOVASTORE
                              │
                    ┌─────────▼─────────┐
                    │    API / BFF      │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   NOVAI RUNTIME   │
                    └─────────┬─────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
 Identity/RBAC          Context Engine          Model Router
       │                      │                      │
       │                ┌─────┴─────┐         ┌────┴─────┐
       │                │           │         │          │
       │               RAG       Memory     Free       Paid
       │                │           │       Models     Models
       │                └─────┬─────┘         │
       │                      │               │
       └──────────────────────┼───────────────┘
                              │
                       Agent Planner
                              │
                         Tool Gateway
                              │
              ┌───────────────┼────────────────┐
              │               │                │
           Supabase        Stripe           GitHub
              │               │                │
              └───────────────┼────────────────┘
                              │
                        Audit System
```

---

# 18. Y la base de datos de NovAi

Conceptualmente:

```text
                    ┌──────────────┐
                    │    users     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  tenants     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  workspaces  │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    conversations      memories         knowledge
          │                │                │
          ▼                ▼                ▼
       messages       embeddings         chunks
          │
          ▼
       agent_runs
          │
          ▼
       tool_calls
          │
          ▼
      audit_events
```

Mientras que comercialmente:

```text
Stripe
  ↓
Customer
  ↓
Subscription
  ↓
NovaStore Billing
  ↓
Entitlements
  ↓
RBAC/Policy Engine
  ↓
NovAi capabilities
```

---

# 19. La pieza que yo añadiría a tu diseño anterior

Hay una cosa que **sí agregaría explícitamente** a tu plan de NovAi: un **Policy & Governance Layer**.

Quedaría:

```text
             ┌──────────────────────┐
             │       NOVAI          │
             └──────────┬───────────┘
                        │
        ┌───────────────▼────────────────┐
        │       GOVERNANCE LAYER         │
        │                                │
        │ Identity                       │
        │ RBAC / ABAC                    │
        │ Entitlements                   │
        │ Data permissions               │
        │ Tool permissions               │
        │ Risk policies                  │
        │ Approval policies              │
        │ Audit                          │
        │ Grounding                      │
        └───────────────┬────────────────┘
                        │
                 Agent Runtime
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
        Model          RAG          Tools
       Router         Memory       Gateway
```

**Ese es el cambio que convierte a NovAi de "un chatbot con IA" en un verdadero agente empresarial.**

Y además encaja con lo que ya estás haciendo en NovaStore: **multi-tenancy + RBAC + Stripe + módulos + workspaces + teams**.

### Mi recomendación de implementación

No construiría todo de golpe. El orden correcto sería:

**Fase 1 — Foundation**
→ Identity + Tenant + Workspace + RBAC + Entitlements

**Fase 2 — NovAi Core**
→ Agent Runtime + Model Router + streaming + sesiones

**Fase 3 — Knowledge**
→ Master Knowledge Base + embeddings + hybrid RAG + grounding

**Fase 4 — Memory**
→ conversation + user + workspace + strategic memory

**Fase 5 — Tools**
→ Tool Gateway + permission checks + audit

**Fase 6 — Stripe**
→ subscriptions → entitlements → límites de NovAi

**Fase 7 — Advanced Agents**
→ Researcher + Consultant + Architect + Developer + Operator

**Fase 8 — Governance**
→ risk engine + approvals + observability + evaluations + anti-sycophancy

Y hay una decisión arquitectónica que tomaría desde **el día 1**: **NovAi no debe tener acceso privilegiado a Supabase**. Todo acceso debe atravesar servicios/tools con `tenant_id`, `workspace_id`, RBAC/ABAC, entitlement y auditoría. Eso te evita convertir al agente en el agujero de seguridad más grande de NovaStore.

---

# 20. Adopción de Vercel AI SDK Core & Arquitectura Tool-First (Anti-Context-Pollution)

### 20.1 El Problema Resuelto
1. **Erradicación del Prompt Monolítico (Prompt Bloat):** Se reduce el System Prompt de ~4,500 tokens a ~250 tokens limpios de persona ejecutiva (rol, tono, idioma).
2. **Aislamiento Estricto de Expedientes:** El inventario global de investigaciones del tenant se retira del System Prompt y queda accesible únicamente bajo demanda a través de la herramienta `list_investigations`. Esto erradica de raíz que el LLM invente conexiones entre expedientes no relacionados.
3. **Cero Fuga de Meta-Lenguaje:** Las reglas y axiomas metodológicos no se inyectan como manuales legales en texto plano (lo que provocaba que el modelo citara "según la directiva punto 2"). Se gobiernan como herramientas de razonamiento determinista.
4. **Estandarización con Vercel AI SDK (`ai`):** Unificación del streaming SSE, Tool Calling Loops y llamadas multi-proveedor (Groq, OpenRouter, OpenCode Zen, GitHub Models, Gemini) bajo el estándar oficial de Next.js.

---

# 21. Arquitectura de UI Nativa con Vercel AI Elements (`@ai-elements`)

### 21.1 Principios Rectores de Interfaz y Composición Canónica
1. **Componentes Oficiales Intactos:** Los 48 componentes de `@ai-elements` residen en `src/components/ai-elements/` directamente desde el registro oficial de Vercel sin alteraciones caseras en su código fuente. Cualquier adaptación de estilos o datos se realiza en la capa consumidora (`src/views/`).
2. **Gestión Unificada del Scroll (`Conversation`):**
   - El contenedor raíz de la vista debe mantener `h-full overflow-hidden`.
   - `<Conversation>` es el **único** contenedor con scroll (`overflow-y-auto`) gestionado de forma automática por `use-stick-to-bottom`. Se eliminan los `overflow-y-auto` en capas intermedias para erradicar dobles scrollbars.
3. **Acciones de Mensaje Accesibles (`MessageActions`):**
   - `<MessageAction>` opera con íconos vectoriales (`<Copy />`, `<RefreshCw />`) y tooltips accesibles flotantes, sin inyectar texto estático superpuesto.
4. **Composer Unificado sin Selectores Legacy (`PromptInput`):**
   - Retiro total del selector legacy `@General/@Investigador/@Kanban`.
   - Menú de herramientas integrado dentro de `<PromptInputFooter>` y `<PromptInputTools>` con el selector de los **7 Modos Operativos** (`NOVAI_MODES`) y el Badge de cuota en tiempo real.
5. **Bandeja de Consultas Rápidas en el Sheet de Investigación:**
   - Renderizado con `<Suggestions>` en carrusel horizontal fluido (`flex-nowrap overflow-x-auto no-scrollbar scroll-smooth`) para visualización total de opciones sin recortes.
   - Reubicación del badge de cuota al composer inferior del Sheet para despejar el header y eliminar cualquier colisión con el botón de cierre `(X)`.
6. **Visibilidad Total de Pensamiento y Herramientas:**
   - Inclusión de `<Reasoning>` para modelos de razonamiento (DeepSeek R1 / o3-mini) y `<Tool>` para trazabilidad de ejecución de herramientas sobre el expediente activo.

