# TAREA: Auditar y actualizar README.md de NovaInvestigator + establecer política permanente de documentación

Quiero que actualices el archivo `README.md` del repositorio **NovaInvestigator** y, además, establezcas en `AGENTS.md` una regla permanente que obligue a mantener `README.md` sincronizado con la implementación real del proyecto.

---

# PARTE 1 — AUDITORÍA DEL REPOSITORIO

Antes de modificar cualquier archivo, realiza una auditoría del estado actual del repositorio.

La fuente primaria de verdad debe ser siempre el código implementado.

Inspecciona como mínimo:

## Root

* `package.json`
* `AGENTS.md`
* `SECURITY.MD`
* `CHANGELOG.md`
* `.env.example`

## Application

* `src/app`
* `src/views`
* `src/features`
* `src/lib`

## NovAi

Realiza una auditoría profunda de:

```text
src/features/novai/
```

Identifica únicamente componentes realmente implementados, incluyendo cuando existan:

* Agent Runtime
* Model Router
* Context Engine
* Tool Gateway
* Memory
* Token Budget
* quota enforcement
* entitlement checks
* investigation context
* evidence retrieval
* conversation persistence
* reasoning/evaluation
* external research
* event processing
* cualquier otro componente relevante.

## Investigations

Inspecciona todo lo relacionado con:

* investigations;
* active investigation;
* evidence;
* documents;
* factors;
* claims;
* audit;
* methodology;
* matrices;
* strategic analysis.

## Access & Security

Inspecciona:

* authentication;
* authorization;
* RBAC;
* ReBAC;
* capabilities;
* entitlements;
* tenant isolation;
* RLS;
* route protection;
* server-side authorization.

## Billing

Inspecciona:

* plans;
* pricing;
* trials;
* subscriptions;
* one-time access;
* entitlements;
* Stripe;
* checkout;
* customer portal;
* webhooks;
* idempotency;
* usage limits;
* AI quotas.

## Tests

Inspecciona:

```text
tests/
```

para determinar qué áreas tienen cobertura automatizada.

---

# PARTE 2 — REEMPLAZAR README.md

El `README.md` actual está desactualizado y contiene información heredada del template original.

NO hagas una edición superficial.

Reemplaza completamente el README con documentación moderna y fiel al estado actual del proyecto.

El README debe presentar NovaInvestigator como:

> **Evidence-aware research, strategic analysis and AI-assisted investigation platform.**

Debe quedar claro que NovaInvestigator no es simplemente:

* un chatbot;
* una aplicación genérica de IA;
* un dashboard;
* un gestor básico de investigaciones.

Debe documentar correctamente la combinación de:

* investigaciones;
* evidencia;
* análisis metodológico;
* auditoría;
* análisis estratégico;
* herramientas especializadas;
* NovAi;
* memoria;
* persistencia;
* multi-tenancy;
* autorización;
* billing;
* entitlements.

---

# PARTE 3 — NOVAI

Crear una sección específica:

```markdown
## 🤖 NovAi
```

Explica la arquitectura real de NovAi.

Debe quedar claro que NovAi es un sistema de runtime/agente de IA y no simplemente una llamada directa a un modelo.

Documenta únicamente componentes verificables en el código.

Incluye, cuando existan:

* Agent Runtime;
* Model Router;
* Context Resolution;
* Tool Gateway;
* Memory;
* Token Budget;
* quota enforcement;
* entitlements;
* investigation awareness;
* evidence retrieval;
* conversation persistence;
* reasoning evaluation;
* external research.

Incluye un diagrama Mermaid si puede representar fielmente la arquitectura.

---

# PARTE 4 — TOOLS

Audita:

```text
src/features/novai/tools/
```

Genera una tabla con las herramientas realmente existentes:

| Tool               | Purpose        |
| ------------------ | -------------- |
| `actual_tool_name` | Actual purpose |

Agrúpalas por dominios cuando sea apropiado:

* Investigation & Evidence
* Methodology & Audit
* Strategy / Red Team
* Platform
* External Research

NO inventes herramientas.

Los nombres deben coincidir exactamente con los identificadores implementados.

---

# PARTE 5 — INVESTIGATION & EVIDENCE

Documenta cómo funciona realmente:

* investigation context;
* active investigation;
* documents;
* evidence;
* factors;
* claims;
* verification;
* auditing;
* retrieval.

Explica la separación entre:

1. evidencia interna de la investigación;
2. investigación externa;
3. conocimiento general del modelo.

No afirmes que el sistema elimina alucinaciones.

Utiliza formulaciones técnicamente correctas como:

* evidence-aware;
* grounded responses;
* improved traceability;
* reduced unsupported assumptions;
* separation of internal and external evidence.

---

# PARTE 6 — METHODOLOGY & STRATEGIC ANALYSIS

Determina mediante inspección del código qué metodologías están realmente implementadas.

NO asumas que existen solo porque aparecen mencionadas en documentación previa.

Si están implementadas, documenta las capacidades correspondientes, por ejemplo:

* DAFO / SWOT;
* EFI;
* EFE;
* CAME;
* QSPM;
* matrices;
* factor analysis;
* relationship analysis;
* contradiction detection;
* methodology validation;
* strategy tracing;
* strategy comparison;
* red-team analysis.

Solo incluye las que puedan verificarse.

---

# PARTE 7 — ARCHITECTURE

Incluye un diagrama Mermaid de la arquitectura real.

Debe mostrar, cuando correspondan:

```text
User
 ↓
Next.js
 ↓
Views / UI
 ↓
Domain Features
 ↓
NovAi / Investigation / Billing / Access
 ↓
Shared Infrastructure
 ↓
Supabase / Stripe / External Research / AI Providers
```

No incluyas componentes inexistentes.

---

# PARTE 8 — PROJECT STRUCTURE

Documenta la estructura real del proyecto:

```text
src/
├── app/
├── views/
├── features/
├── lib/
├── components/
├── configs/
├── hooks/
├── locales/
└── types/

supabase/
tests/
```

Explica brevemente la responsabilidad de cada capa.

No es necesario listar cada archivo.

---

# PARTE 9 — SECURITY

Crear:

```markdown
## 🔐 Security Model
```

Documenta únicamente mecanismos verificables:

* authentication;
* authorization;
* RBAC;
* ReBAC;
* capabilities;
* entitlements;
* tenant scope;
* RLS;
* server-side authorization;
* webhook security;
* idempotency.

Debe quedar claro que:

> The UI is not the final authorization boundary.

solo si esto está respaldado por la implementación.

---

# PARTE 10 — BILLING

Documenta las capacidades reales relacionadas con:

* plans;
* pricing;
* trials;
* subscriptions;
* one-time access;
* entitlements;
* AI usage;
* quotas;
* Stripe Checkout;
* Stripe Customer Portal;
* webhook processing;
* idempotency.

No documentes como implementado aquello que solamente esté planificado.

---

# PARTE 11 — DATABASE

Documenta:

* Supabase;
* PostgreSQL;
* migrations;
* RLS;
* persistencia;
* principales dominios de datos.

No es necesario listar todas las tablas.

---

# PARTE 12 — TESTING

Obtén los comandos reales desde `package.json`.

Documenta las áreas cubiertas por los tests.

NO inventes comandos.

---

# PARTE 13 — DEVELOPMENT

Documenta:

* requisitos;
* versiones reales;
* instalación;
* configuración;
* `.env.example`;
* comandos de desarrollo;
* testing;
* build.

Todos los comandos deben comprobarse contra `package.json`.

---

# PARTE 14 — INTERNATIONALIZATION

Si existe i18n implementado, documenta:

* mecanismo utilizado;
* idiomas;
* ubicación de traducciones;
* comandos relevantes.

---

# PARTE 15 — NOVASTORE / NOVAINVESTIGATOR / NOVAI

Determina mediante el código cuál es la relación entre:

```text
NovaStore
NovaInvestigator
NovAi
```

La documentación debe distinguirlos claramente.

Si NovaInvestigator es una aplicación dentro del ecosistema NovaStore, explícalo.

Si es independiente, documenta esa realidad.

NO inventes la relación.

---

# PARTE 16 — VALIDACIÓN DEL README

Después de escribir el README:

1. léelo completo;
2. comprueba todos los nombres de herramientas;
3. comprueba todos los comandos;
4. comprueba las tecnologías;
5. comprueba los diagramas Mermaid;
6. elimina afirmaciones no verificables;
7. elimina referencias al template original;
8. elimina referencias heredadas a AdminCN, ShadcnStudio, Astro o cualquier tecnología que ya no forme parte del producto;
9. confirma que el README representa el estado actual del repositorio.

---

# PARTE 17 — REGLA PERMANENTE EN AGENTS.MD

Esta parte es OBLIGATORIA.

Después de actualizar `README.md`, modifica `AGENTS.md` para incorporar una política permanente de sincronización de documentación.

Añade una sección claramente identificable:

```markdown
## README Synchronization Policy
```

La política debe establecer lo siguiente:

### Regla principal

> `README.md` is a living document and MUST remain synchronized with the actual implementation of the repository.

### Obligación

Cada vez que un cambio de código modifique de forma relevante:

* arquitectura;
* módulos;
* features;
* NovAi;
* tools;
* investigation workflows;
* evidence handling;
* methodologies;
* authorization;
* RBAC;
* ReBAC;
* capabilities;
* multi-tenancy;
* RLS;
* billing;
* Stripe;
* entitlements;
* AI providers;
* model routing;
* memory;
* persistence;
* environment configuration;
* development commands;
* testing;
* deployment;
* supported technologies;

el agente DEBE evaluar si `README.md` necesita actualización.

### Regla de consistencia

Antes de finalizar una tarea que produzca un cambio significativo, el agente debe responder internamente:

> "Does this change make any statement in README.md inaccurate, incomplete or misleading?"

Si la respuesta es sí:

**DEBE actualizar `README.md` en la misma tarea.**

### Regla de no actualización innecesaria

No es obligatorio modificar README.md para cambios internos que no alteren:

* comportamiento documentado;
* arquitectura;
* APIs públicas;
* herramientas;
* comandos;
* configuración;
* funcionalidades;
* requisitos;
* seguridad;
* modelo de datos relevante para usuarios/desarrolladores.

Esto evita generar ruido documental por cambios triviales.

### Source of Truth

La implementación real es la fuente primaria de verdad.

En caso de contradicción entre:

* README;
* AGENTS.md;
* comentarios;
* documentación;
* código;

el código implementado tiene prioridad para describir el estado actual del sistema.

Sin embargo, las contradicciones detectadas deben corregirse en la documentación correspondiente.

### Prohibición

El agente NO debe:

* afirmar funcionalidades no implementadas;
* documentar herramientas inexistentes;
* inventar comandos;
* inventar variables de entorno;
* inventar integraciones;
* declarar una funcionalidad como estable si el código demuestra lo contrario.

### Pull Requests / Changes

Cuando un cambio significativo requiere actualizar README.md, la modificación documental debe formar parte del mismo cambio lógico.

No debe dejarse como tarea pendiente salvo que exista una razón explícita.

---

# PARTE 18 — AGENTS.MD NO DEBE CONVERTIRSE EN UN SEGUNDO README

La nueva sección de `AGENTS.md` debe contener únicamente las reglas de comportamiento para agentes.

NO copies todo el README dentro de `AGENTS.md`.

La separación debe ser:

```text
README.md
↓
What the project is and how it works.

AGENTS.md
↓
How an AI agent must work on the project.
```

---

# PARTE 19 — ARCHIVOS QUE PUEDES MODIFICAR

En esta tarea están permitidos únicamente:

```text
README.md
AGENTS.md
```

NO modifiques:

* código;
* package.json;
* tests;
* migrations;
* SECURITY.MD;
* CHANGELOG.md;
* configuración;
* archivos de aplicación.

Si detectas problemas en esos archivos, repórtalos pero no los corrijas.

---

# PARTE 20 — INFORME FINAL

Al terminar, proporciona un resumen:

## Repository Audit

Qué áreas inspeccionaste.

## README Updated

Qué secciones incorporaste o modificaste.

## AGENTS.md Updated

Qué regla permanente añadiste.

## Verified

Qué elementos comprobaste directamente contra el código.

## Discrepancies

Qué inconsistencias encontraste entre código y documentación existente.

## Follow-up Recommendations

Qué mejoras documentales recomendarías para una segunda fase.

---

# CRITERIO FINAL

El resultado debe ser documentación de nivel profesional para una plataforma tecnológica real.

Debe ser:

* precisa;
* verificable;
* mantenible;
* clara;
* técnica;
* orientada a desarrolladores;
* orientada a arquitectura;
* libre de marketing vacío.

La regla más importante de toda esta tarea es:

> **Documentation must describe the system that actually exists — and must evolve whenever the system meaningfully changes.**
